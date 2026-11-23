use tauri::{AppHandle, Emitter, Listener, Manager};
use tauri_plugin_global_shortcut::ShortcutState;
use serde::Serialize;
use chrono::Utc;
use std::sync::Mutex;

use crate::ai_client;
use crate::capture;
use crate::config::{self, AppConfig, ConfigState};
use crate::db::{self, Task};
use crate::hotkey;

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
    let old_hotkey = state.0.lock().unwrap().global_hotkey.clone();

    // Register the new hotkey before saving anything. If the shortcut is
    // invalid or taken, the previous one is put back and the saved config is
    // left unchanged, so the app never ends up with no working hotkey.
    if let Err(e) = hotkey::register_hotkey(&app, &new_config.global_hotkey) {
        eprintln!("Failed to register new hotkey '{}': {}", new_config.global_hotkey, e);
        restore_hotkey(&app, &old_hotkey);
        return Err(e);
    }

    if let Err(e) = config::save_config(&new_config) {
        restore_hotkey(&app, &old_hotkey);
        return Err(format!("Could not save settings: {}", e));
    }

    *state.0.lock().unwrap() = new_config;
    Ok(())
}

fn restore_hotkey(app: &AppHandle, shortcut: &str) {
    if let Err(e) = hotkey::register_hotkey(app, shortcut) {
        eprintln!("Could not restore previous hotkey '{}': {}", shortcut, e);
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

#[tauri::command]
async fn trigger_capture(app: AppHandle) -> Result<(), String> {
    tauri::async_runtime::spawn(async move {
        handle_capture_flow(&app).await;
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
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        let _ = app.emit("trigger-capture", ());
                    }
                })
                .build(),
        )
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let config = config::load_config();
            let initial_hotkey = config.global_hotkey.clone();
            app.manage(ConfigState(Mutex::new(config)));

            if !initial_hotkey.is_empty() {
                if let Err(e) = hotkey::register_hotkey(app.handle(), &initial_hotkey) {
                    eprintln!("Failed to register initial hotkey '{}': {}", initial_hotkey, e);
                }
            }

            let app_handle = app.handle().clone();
            app.listen("trigger-capture", move |_| {
                let app_handle = app_handle.clone();
                tauri::async_runtime::spawn(async move {
                    handle_capture_flow(&app_handle).await;
                });
            });

            Ok(())
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
            chat_with_standup_ai
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

async fn handle_capture_flow(app: &AppHandle) {
    // 1. Notify frontend extraction has started
    let _ = app.emit("status-update", StatusPayload::new("processing"));

    // 2. Safe OS-level selection capture (saves & restores original clipboard + window title)
    let capture_res = match capture::get_selected_text() {
        Ok(t) => t,
        Err(e) => {
            eprintln!("Capture error: {}", e);
            let _ = app.emit("status-update", StatusPayload::new("idle"));
            return;
        }
    };
    let original_text = capture_res.text;
    let source_app = capture_res.source_app;

    // 3. Retrieve Groq API Key
    let api_key = {
        let state = app.state::<ConfigState>();
        let key = state.0.lock().unwrap().groq_api_key.clone();
        key
    };

    // 4. AI Structured Parsing with Heuristic Fallback
    let parsed = ai_client::process_text(&api_key, &original_text).await;

    // 5. Persist to Database
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

    // Only announce the task once it is actually on disk; otherwise the UI
    // would show a capture that vanishes on the next restart.
    if let Err(e) = db::save_task(new_task.clone()) {
        eprintln!("DB save error: {}", e);
        let _ = app.emit(
            "status-update",
            StatusPayload::error(format!("Captured text could not be saved: {}", e)),
        );
        return;
    }

    // 6. Broadcast event to React frontend & complete status
    let _ = app.emit("new-task-captured", new_task);
    let _ = app.emit("status-update", StatusPayload::new("done"));
}
