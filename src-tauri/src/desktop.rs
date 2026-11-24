use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Listener, Manager, WindowEvent};
use tauri_plugin_global_shortcut::ShortcutState;
use tauri_plugin_notification::NotificationExt;
use serde::Serialize;
use chrono::Utc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, MutexGuard};
use std::time::Duration;

use crate::ai_client;
use crate::capture;
use crate::config::{self, AppConfig, ConfigState};
use crate::db::{self, Task};
use crate::hotkey::{self, HotkeyAction, HotkeyMap};
use crate::overlay;
use crate::voice;

/// Locks a mutex even if a previous holder panicked (the data is plain values).
fn lock<T>(m: &Mutex<T>) -> MutexGuard<'_, T> {
    m.lock().unwrap_or_else(|p| p.into_inner())
}

#[derive(Clone, Serialize)]
struct StatusPayload {
    state: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    message: Option<String>,
}

impl StatusPayload {
    fn new(state: &str) -> Self {
        Self { state: state.into(), message: None }
    }

    fn error(message: String) -> Self {
        Self { state: "error".into(), message: Some(message) }
    }
}

#[tauri::command]
async fn get_config(state: tauri::State<'_, ConfigState>) -> Result<AppConfig, String> {
    let config = state.0.lock().unwrap().clone();
    Ok(config)
}

#[tauri::command]
async fn update_config(app: AppHandle, state: tauri::State<'_, ConfigState>, new_config: AppConfig) -> Result<(), String> {
    let mut new_config = new_config;
    new_config.groq_api_key = new_config.groq_api_key.trim().to_string();
    new_config.global_hotkey = new_config.global_hotkey.trim().to_string();
    new_config.voice_hotkey = new_config.voice_hotkey.trim().to_string();
    new_config.dictation_hotkey = new_config.dictation_hotkey.trim().to_string();
    new_config.voice_language = new_config.voice_language.trim().to_lowercase();
    new_config.voice_vocabulary = new_config.voice_vocabulary.trim().chars().take(2_000).collect();
    new_config.voice_model = if new_config.voice_model.trim().eq_ignore_ascii_case("fast") { "fast".to_string() } else { "accurate".to_string() };
    let old_config = lock(&state.0).clone();

    // Register the new hotkeys before saving anything. If one is invalid,
    // duplicated or taken, the previous set is put back and the saved config
    // is left unchanged, so the app never ends up with no working hotkeys.
    if let Err(e) = register_all_hotkeys(&app, &new_config) {
        eprintln!("Failed to register new hotkeys: {}", e);
        restore_hotkeys(&app, &old_config);
        return Err(e);
    }

    if let Err(e) = config::save_config(&new_config) {
        restore_hotkeys(&app, &old_config);
        return Err(format!("Could not save settings: {}", e));
    }

    *lock(&state.0) = new_config;
    Ok(())
}

fn register_all_hotkeys(app: &AppHandle, cfg: &AppConfig) -> Result<(), String> {
    hotkey::register_hotkeys(app, &cfg.global_hotkey, &cfg.voice_hotkey, &cfg.dictation_hotkey)
}

fn restore_hotkeys(app: &AppHandle, cfg: &AppConfig) {
    if let Err(e) = register_all_hotkeys(app, cfg) {
        eprintln!("Could not restore the previous hotkeys: {}", e);
    }
}

#[tauri::command]
async fn get_tasks() -> Result<Vec<Task>, String> {
    db::get_tasks()
}

#[tauri::command]
async fn delete_task_item(task_id: String) -> Result<(), String> {
    db::delete_task(&task_id)
}

#[tauri::command]
async fn toggle_task_item(task_id: String) -> Result<bool, String> {
    db::toggle_task(&task_id)
}

#[tauri::command]
async fn create_task_item(
    content: String,
    priority: Option<String>,
    category: Option<String>,
    deadline: Option<String>,
    original_text: Option<String>,
) -> Result<Task, String> {
    let non_empty = |v: Option<String>| v.map(|s| s.trim().to_string()).filter(|s| !s.is_empty());

    let priority = match non_empty(priority) {
        Some(p) => db::normalize_priority(&p).ok_or_else(|| format!("Invalid priority '{}'", p))?,
        None => "Medium".to_string(),
    };
    let category = match non_empty(category) {
        Some(c) => db::normalize_category(&c).ok_or_else(|| format!("Invalid category '{}'", c))?,
        None => "General".to_string(),
    };
    let deadline = match non_empty(deadline) {
        Some(d) => Some(db::normalize_deadline(&d)?),
        None => None,
    };

    let task = Task {
        id: uuid::Uuid::new_v4().to_string(),
        content: db::normalize_content(&content)?,
        original_text: original_text.filter(|t| !t.trim().is_empty()),
        timestamp: Utc::now().to_rfc3339(),
        priority,
        category,
        deadline,
        source_app: None,
        completed: false,
    };
    db::save_task(task.clone())?;
    Ok(task)
}

/// Saves an edit to any of a task's user-editable fields and returns the
/// stored task. Fields absent from `patch` are left unchanged.
#[tauri::command]
async fn update_task_item(task_id: String, patch: db::TaskPatch) -> Result<Task, String> {
    db::update_task(&task_id, &patch)
}

/// The in-app "quick capture" button. When it is clicked, TaskCatch itself is
/// the foreground window, so a copy would read TaskCatch's own (empty)
/// selection. Minimise first so focus returns to the app the user was
/// working in, capture from there, then come back.
#[tauri::command]
async fn trigger_capture(app: AppHandle) -> Result<(), String> {
    tauri::async_runtime::spawn(async move {
        let window = app.get_webview_window("main");
        let stepped_aside = match &window {
            Some(w) if w.is_focused().unwrap_or(false) => w.minimize().is_ok(),
            _ => false,
        };
        if stepped_aside {
            // Give Windows time to hand focus to the previous window.
            tokio::time::sleep(Duration::from_millis(350)).await;
        }

        handle_capture_flow(&app).await;

        if stepped_aside {
            if let Some(w) = &window {
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }
    });
    Ok(())
}

#[tauri::command]
async fn chat_with_standup_ai(prompt: String, app: AppHandle) -> Result<ai_client::ChatResponseData, String> {
    let tasks = db::get_tasks()?;
    // Only the fields the assistant needs. The captured source text is left
    // out: it can be long and private, and it would grow every request.
    let compact: Vec<serde_json::Value> = tasks
        .iter()
        .map(|t| {
            serde_json::json!({
                "id": t.id,
                "title": t.content,
                "priority": t.priority,
                "category": t.category,
                "deadline": t.deadline,
                "completed": t.completed,
                "captured_at": t.timestamp,
            })
        })
        .collect();
    let tasks_json = serde_json::to_string(&compact).map_err(|e| e.to_string())?;

    let api_key = {
        let state = app.state::<ConfigState>();
        let key = state.0.lock().unwrap().groq_api_key.clone();
        key
    };

    let mut chat_response = ai_client::process_chat(&api_key, &tasks_json, &prompt).await?;

    // Apply each suggested change through the same validation as a manual
    // edit. Only changes that were actually saved are reported back as applied.
    let suggested = std::mem::take(&mut chat_response.mutations);
    let mut skipped = 0usize;
    for mut mutation in suggested {
        let patch = db::TaskPatch {
            priority: mutation.update_priority.clone(),
            deadline: mutation.update_deadline.clone().map(Some),
            ..Default::default()
        };
        if mutation.action != "update" || (patch.priority.is_none() && patch.deadline.is_none()) {
            skipped += 1;
            continue;
        }
        match db::update_task(&mutation.task_id, &patch) {
            Ok(task) => {
                if patch.priority.is_some() {
                    mutation.update_priority = Some(task.priority.clone());
                }
                if patch.deadline.is_some() {
                    mutation.update_deadline = task.deadline.clone();
                }
                mutation.task_title = Some(task.content);
                chat_response.mutations.push(mutation);
            }
            Err(e) => {
                eprintln!("Skipped AI change to task {}: {}", mutation.task_id, e);
                skipped += 1;
            }
        }
    }
    if skipped > 0 {
        chat_response.reply.push_str(&format!(
            "\n\n_Note: {} suggested change(s) could not be applied and were skipped._",
            skipped
        ));
    }

    Ok(chat_response)
}

pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    let pressed = event.state() == ShortcutState::Pressed;
                    match hotkey::action_for(app, shortcut) {
                        Some(HotkeyAction::Capture) => {
                            if pressed {
                                let _ = app.emit("trigger-capture", ());
                            }
                        }
                        // Voice and dictation are hold-to-talk: record while held.
                        Some(HotkeyAction::Voice) => on_voice_key(app, VoicePurpose::Task, pressed),
                        Some(HotkeyAction::Dictation) => on_voice_key(app, VoicePurpose::Dictation, pressed),
                        None => {}
                    }
                })
                .build(),
        )
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let config = config::load_config();
            app.manage(HotkeyMap::default());
            app.manage(VoiceState(Mutex::new(VoiceSession::Idle)));
            app.manage(LastDictation::default());
            if let Err(e) = register_all_hotkeys(app.handle(), &config) {
                eprintln!("Failed to register hotkeys at start-up: {}", e);
            }
            // Open the microphone now (paused) so the first voice take
            // starts instantly instead of losing its first words.
            if !config.voice_hotkey.is_empty() || !config.dictation_hotkey.is_empty() {
                voice::prewarm();
            }
            app.manage(ConfigState(Mutex::new(config)));

            let app_handle = app.handle().clone();
            app.listen("trigger-capture", move |_| {
                let app_handle = app_handle.clone();
                tauri::async_runtime::spawn(async move {
                    handle_capture_flow(&app_handle).await;
                });
            });

            build_tray(app)?;
            if let Err(e) = overlay::create(app.handle()) {
                eprintln!("Could not create the voice indicator: {}", e);
            }

            Ok(())
        })
        // Closing the window hides it to the tray instead of quitting, so the
        // global hotkey keeps working. "Quit" in the tray menu really exits.
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                    show_tray_hint_once(window.app_handle());
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_config,
            update_config,
            get_tasks,
            delete_task_item,
            toggle_task_item,
            create_task_item,
            update_task_item,
            trigger_capture,
            chat_with_standup_ai,
            voice_start,
            voice_stop,
            voice_cancel
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// Tray icon: left-click opens the window; right-click shows Open / Quit.
fn build_tray(app: &tauri::App) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open", "Open TaskCatch", true, None::<&str>)?;
    let copy_last = MenuItem::with_id(app, "copy_last", "Copy last dictation", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit TaskCatch", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &copy_last, &quit])?;

    let mut builder = TrayIconBuilder::new()
        .tooltip("TaskCatch - AI Task Extractor")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => show_main_window(app),
            "copy_last" => {
                let text = lock(&app.state::<LastDictation>().0).clone();
                if !text.is_empty() {
                    let _ = capture::copy_to_clipboard(&text);
                }
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder.build(app)?;
    Ok(())
}

static TRAY_HINT_SHOWN: AtomicBool = AtomicBool::new(false);

/// The first time the window is closed, explain that TaskCatch is still running.
fn show_tray_hint_once(app: &AppHandle) {
    if TRAY_HINT_SHOWN.swap(true, Ordering::Relaxed) {
        return;
    }
    let (hotkey, voice_key) = {
        let config_state = app.state::<ConfigState>();
        let cfg = lock(&config_state.0);
        (cfg.global_hotkey.clone(), cfg.voice_hotkey.clone())
    };
    let mut body = String::new();
    if !hotkey.is_empty() {
        body.push_str(&format!("Press {} to capture highlighted text. ", hotkey));
    }
    if !voice_key.is_empty() {
        body.push_str(&format!("Hold {} to say a task. ", voice_key));
    }
    if body.is_empty() {
        body.push_str("TaskCatch is still running in the tray. ");
    }
    body.push_str("Right-click the tray icon to quit.");
    let _ = app
        .notification()
        .builder()
        .title("TaskCatch is still running")
        .body(body)
        .show();
}

/// Set while a capture runs. Two captures at once would fight over the
/// clipboard and could restore the wrong contents.
static CAPTURE_RUNNING: AtomicBool = AtomicBool::new(false);

/// Holds the capture slot; releases it when dropped, on every return path.
struct CaptureSlot;

impl CaptureSlot {
    fn acquire() -> Option<Self> {
        CAPTURE_RUNNING
            .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
            .ok()
            .map(|_| CaptureSlot)
    }
}

impl Drop for CaptureSlot {
    fn drop(&mut self) {
        CAPTURE_RUNNING.store(false, Ordering::Release);
    }
}

async fn handle_capture_flow(app: &AppHandle) {
    // Repeated hotkey presses while a capture is running are ignored.
    let Some(_slot) = CaptureSlot::acquire() else {
        return;
    };

    // 1. Notify frontend extraction has started
    let _ = app.emit("status-update", StatusPayload::new("processing"));

    // 2. OS-level selection capture. It waits and polls (blocking), so run it
    //    off the async runtime. Saves and restores every clipboard format.
    let capture_res = match tauri::async_runtime::spawn_blocking(capture::get_selected_text).await {
        Ok(Ok(t)) => t,
        Ok(Err(e)) => {
            eprintln!("Capture error: {}", e);
            let _ = app.emit("status-update", StatusPayload::error(e));
            return;
        }
        Err(e) => {
            eprintln!("Capture task failed: {}", e);
            let _ = app.emit("status-update", StatusPayload::error(format!("Capture failed: {}", e)));
            return;
        }
    };
    // 3–5. Parse, save and announce the task.
    match create_task_from_text(app, capture_res.text, capture_res.source_app).await {
        Ok(_) => {
            let _ = app.emit("status-update", StatusPayload::new("done"));
        }
        Err(e) => {
            eprintln!("DB save error: {}", e);
            let _ = app.emit(
                "status-update",
                StatusPayload::error(format!("Captured text could not be saved: {}", e)),
            );
        }
    }
}

/// Turns captured or spoken text into a task: AI parsing (keyword fallback),
/// save, then announce it. Only announced once it is actually on disk, so the
/// UI never shows a task that vanishes on the next restart.
async fn create_task_from_text(app: &AppHandle, original_text: String, source_app: Option<String>) -> Result<Task, String> {
    let api_key = lock(&app.state::<ConfigState>().0).groq_api_key.clone();
    let parsed = ai_client::process_text(&api_key, &original_text).await;

    let new_task = Task {
        id: uuid::Uuid::new_v4().to_string(),
        content: parsed.title,
        original_text: Some(original_text),
        timestamp: Utc::now().to_rfc3339(),
        priority: parsed.priority,
        category: parsed.category,
        deadline: parsed.deadline,
        source_app,
        completed: false,
    };
    db::save_task(new_task.clone())?;
    let _ = app.emit("new-task-captured", new_task.clone());
    Ok(new_task)
}

// ---------------------------------------------------------------------------
// Voice: hold-to-talk hotkeys and the in-app mic buttons
// ---------------------------------------------------------------------------

/// What a recording is for.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
enum VoicePurpose {
    /// Voice hotkey: the transcript becomes a new task.
    Task,
    /// Dictation hotkey: the transcript is typed into the focused app.
    Dictation,
    /// A mic button in the app: the transcript is returned to the page.
    Text,
}

/// One recording at a time, across hotkeys and mic buttons.
enum VoiceSession {
    Idle,
    /// The microphone is opening. A key released before it is ready is
    /// remembered so the take is discarded as too short.
    Starting { purpose: VoicePurpose, release_pending: bool, target: Option<isize> },
    /// `target` is the window that had focus when dictation began.
    Recording { purpose: VoicePurpose, recording: voice::Recording, target: Option<isize> },
}

struct VoiceState(Mutex<VoiceSession>);

/// The last dictated text, so it can be recovered from the tray menu if it
/// did not land where it was meant to. Kept in memory only.
#[derive(Default)]
struct LastDictation(Mutex<String>);

#[derive(Clone, Serialize)]
struct VoiceStatus {
    /// listening | transcribing | done | copied | error
    state: &'static str,
    purpose: VoicePurpose,
    #[serde(skip_serializing_if = "Option::is_none")]
    message: Option<String>,
}

fn emit_voice(app: &AppHandle, state: &'static str, purpose: VoicePurpose, message: Option<String>) {
    let _ = app.emit("voice-status", VoiceStatus { state, purpose, message });
    update_overlay(app, state, purpose);
}

/// The floating indicator is for hotkey voice used with TaskCatch in the
/// background. When the TaskCatch window is in front, its own in-page
/// indicator is used instead.
fn overlay_wanted(app: &AppHandle) -> bool {
    let enabled = {
        let config_state = app.state::<ConfigState>();
        let cfg = lock(&config_state.0);
        cfg.voice_overlay
    };
    let main_focused = app
        .get_webview_window("main")
        .and_then(|w| w.is_focused().ok())
        .unwrap_or(false);
    enabled && !main_focused
}

fn update_overlay(app: &AppHandle, state: &'static str, purpose: VoicePurpose) {
    if purpose == VoicePurpose::Text {
        return; // mic buttons live inside the window
    }
    match state {
        "listening" => {
            if overlay_wanted(app) {
                overlay::show(app);
                start_level_meter(app.clone());
            }
        }
        "transcribing" => {}
        // Errors and "copied" carry a message worth reading.
        "error" | "copied" => overlay::hide_later(app, true),
        _ => overlay::hide_later(app, false),
    }
}

/// Sends the microphone level to the indicator about 20 times a second
/// while a hotkey take is starting or recording.
fn start_level_meter(app: AppHandle) {
    std::thread::spawn(move || loop {
        let active = {
            let state = app.state::<VoiceState>();
            let session = lock(&state.0);
            matches!(*session, VoiceSession::Starting { .. } | VoiceSession::Recording { .. })
        };
        if !active {
            let _ = app.emit_to(overlay::LABEL, "voice-level", 0.0f32);
            break;
        }
        let _ = app.emit_to(overlay::LABEL, "voice-level", voice::input_level());
        std::thread::sleep(Duration::from_millis(50));
    });
}

fn on_voice_key(app: &AppHandle, purpose: VoicePurpose, pressed: bool) {
    if pressed {
        begin_hotkey_recording(app.clone(), purpose);
    } else {
        end_hotkey_recording(app.clone(), purpose);
    }
}

fn begin_hotkey_recording(app: AppHandle, purpose: VoicePurpose) {
    {
        let state = app.state::<VoiceState>();
        let mut session = lock(&state.0);
        if !matches!(*session, VoiceSession::Idle) {
            return; // already recording (another key or a mic button)
        }
        // Remember where the text should go before anything else can take focus.
        let target = if purpose == VoicePurpose::Dictation { capture::foreground_window() } else { None };
        *session = VoiceSession::Starting { purpose, release_pending: false, target };
    }
    emit_voice(&app, "listening", purpose, None);

    // Opening the microphone blocks briefly; keep it off the hotkey thread.
    tauri::async_runtime::spawn_blocking(move || {
        let result = voice::start();
        let state = app.state::<VoiceState>();
        let mut session = lock(&state.0);
        let (released_early, target) = match &*session {
            VoiceSession::Starting { release_pending, target, .. } => (*release_pending, *target),
            _ => (false, None),
        };
        match result {
            Ok(recording) if released_early => {
                *session = VoiceSession::Idle;
                drop(session);
                recording.discard();
                emit_voice(&app, "error", purpose, Some("Too short — hold the key while you speak.".to_string()));
            }
            Ok(recording) => {
                *session = VoiceSession::Recording { purpose, recording, target };
            }
            Err(e) => {
                *session = VoiceSession::Idle;
                drop(session);
                emit_voice(&app, "error", purpose, Some(e));
            }
        }
    });
}

fn end_hotkey_recording(app: AppHandle, purpose: VoicePurpose) {
    let (recording, target) = {
        let state = app.state::<VoiceState>();
        let mut session = lock(&state.0);
        match std::mem::replace(&mut *session, VoiceSession::Idle) {
            VoiceSession::Recording { purpose: p, recording, target } if p == purpose => (recording, target),
            VoiceSession::Starting { purpose: p, target, .. } if p == purpose => {
                *session = VoiceSession::Starting { purpose: p, release_pending: true, target };
                return;
            }
            other => {
                *session = other;
                return;
            }
        }
    };
    tauri::async_runtime::spawn(async move {
        finish_hotkey_recording(app, purpose, recording, target).await;
    });
}

async fn finish_hotkey_recording(app: AppHandle, purpose: VoicePurpose, recording: voice::Recording, target: Option<isize>) {
    emit_voice(&app, "transcribing", purpose, None);
    let text = match transcribe_recording(&app, recording).await {
        Ok(t) => t,
        Err(e) => {
            emit_voice(&app, "error", purpose, Some(e));
            return;
        }
    };

    let outcome = match purpose {
        VoicePurpose::Task => create_task_from_text(&app, text, Some("Voice note".to_string()))
            .await
            .map(|_| ())
            .map_err(|e| format!("The task could not be saved: {}", e)),
        VoicePurpose::Dictation => {
            let (api_key, cleanup, vocabulary) = {
                let config_state = app.state::<ConfigState>();
                let cfg = lock(&config_state.0);
                (cfg.groq_api_key.clone(), cfg.dictation_cleanup, cfg.voice_vocabulary.clone())
            };
            // Transcription, clean-up and insertion are separate steps; a
            // failed clean-up falls back to the raw transcript.
            let final_text = if cleanup { ai_client::clean_dictation(&api_key, &text, &vocabulary).await } else { text };
            *lock(&app.state::<LastDictation>().0) = final_text.clone();
            match tauri::async_runtime::spawn_blocking(move || capture::insert_text(&final_text, target)).await {
                Ok(Ok(capture::Insertion::Copied(reason))) => {
                    emit_voice(&app, "copied", purpose, Some(format!("{} The text is on your clipboard: press Ctrl+V to paste it.", reason)));
                    return;
                }
                Ok(Ok(_)) => Ok(()),
                Ok(Err(e)) => Err(format!("{} Use \"Copy last dictation\" in the tray menu to get the text.", e)),
                Err(e) => Err(format!("Typing failed: {}", e)),
            }
        }
        VoicePurpose::Text => Ok(()),
    };

    match outcome {
        Ok(()) => emit_voice(&app, "done", purpose, None),
        Err(e) => emit_voice(&app, "error", purpose, Some(e)),
    }
}

/// Stops a recording, checks it for speech and sends it to Whisper.
async fn transcribe_recording(app: &AppHandle, recording: voice::Recording) -> Result<String, String> {
    let wav = tauri::async_runtime::spawn_blocking(move || recording.finish().and_then(voice::prepare_wav))
        .await
        .map_err(|e| e.to_string())??;
    let (api_key, language, vocabulary, model) = {
        let config_state = app.state::<ConfigState>();
        let cfg = lock(&config_state.0);
        (cfg.groq_api_key.clone(), cfg.voice_language.clone(), cfg.voice_vocabulary.clone(), cfg.voice_model.clone())
    };
    let text = ai_client::transcribe(&api_key, wav, &language, &vocabulary, &model).await?;
    if text.trim().is_empty() {
        return Err("No speech was recognised. Try again a little closer to the microphone.".to_string());
    }
    Ok(text)
}

/// Mic button pressed: start recording for the page.
#[tauri::command]
async fn voice_start(app: AppHandle) -> Result<(), String> {
    {
        let state = app.state::<VoiceState>();
        let mut session = lock(&state.0);
        if !matches!(*session, VoiceSession::Idle) {
            return Err("Already recording. Finish the current recording first.".to_string());
        }
        *session = VoiceSession::Starting { purpose: VoicePurpose::Text, release_pending: false, target: None };
    }
    let result = tauri::async_runtime::spawn_blocking(voice::start)
        .await
        .map_err(|e| e.to_string())
        .and_then(|r| r);
    let state = app.state::<VoiceState>();
    let mut session = lock(&state.0);
    match result {
        Ok(recording) => {
            *session = VoiceSession::Recording { purpose: VoicePurpose::Text, recording, target: None };
            Ok(())
        }
        Err(e) => {
            *session = VoiceSession::Idle;
            Err(e)
        }
    }
}

/// Mic button pressed again: stop, transcribe and return the text.
#[tauri::command]
async fn voice_stop(app: AppHandle) -> Result<String, String> {
    let recording = take_text_recording(&app).ok_or_else(|| "Not recording.".to_string())?;
    transcribe_recording(&app, recording).await
}

/// The page closed or the user cancelled: stop and discard.
#[tauri::command]
async fn voice_cancel(app: AppHandle) -> Result<(), String> {
    if let Some(recording) = take_text_recording(&app) {
        let _ = tauri::async_runtime::spawn_blocking(move || recording.discard()).await;
    }
    Ok(())
}

fn take_text_recording(app: &AppHandle) -> Option<voice::Recording> {
    let state = app.state::<VoiceState>();
    let mut session = lock(&state.0);
    match std::mem::replace(&mut *session, VoiceSession::Idle) {
        VoiceSession::Recording { purpose: VoicePurpose::Text, recording, .. } => Some(recording),
        other => {
            *session = other;
            None
        }
    }
}
