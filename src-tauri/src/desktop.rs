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
}

#[tauri::command]
async fn get_config(state: tauri::State<'_, ConfigState>) -> Result<AppConfig, String> {
    let config = state.0.lock().unwrap().clone();
    Ok(config)
}

#[tauri::command]
async fn update_config(app: AppHandle, state: tauri::State<'_, ConfigState>, new_config: AppConfig) -> Result<(), String> {
    {
        let mut cfg = state.0.lock().unwrap();
        *cfg = new_config.clone();
    }
    config::save_config(&new_config)?;

    if let Err(e) = hotkey::register_hotkey(&app, &new_config.global_hotkey) {
        eprintln!("Failed to register new hotkey '{}': {}", new_config.global_hotkey, e);
        return Err(e);
    }

    Ok(())
}

#[tauri::command]
async fn get_tasks() -> Result<Vec<Task>, String> {
    Ok(db::get_tasks())
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
async fn create_task_item(content: String, priority: Option<String>, category: Option<String>, deadline: Option<String>) -> Result<Task, String> {
    let task = Task {
        id: uuid::Uuid::new_v4().to_string(),
        content,
        original_text: None,
        timestamp: Utc::now().to_rfc3339(),
        priority: priority.unwrap_or_else(|| "Medium".to_string()),
        category: category.unwrap_or_else(|| "General".to_string()),
        deadline,
        source_app: None,
        completed: false,
    };
    db::save_task(task.clone())?;
    Ok(task)
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
    let tasks = db::get_tasks();
    let tasks_json = serde_json::to_string(&tasks).map_err(|e| e.to_string())?;

    let api_key = {
        let state = app.state::<ConfigState>();
        let key = state.0.lock().unwrap().groq_api_key.clone();
        key
    };

    let chat_response = ai_client::process_chat(&api_key, &tasks_json, &prompt).await?;

    // Apply mutations
    for mutation in &chat_response.mutations {
        if mutation.action == "update" {
            let _ = db::update_task(
                &mutation.task_id,
                mutation.update_priority.clone(),
                mutation.update_timestamp.clone(),
            );
        }
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
            trigger_capture,
            chat_with_standup_ai
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

async fn handle_capture_flow(app: &AppHandle) {
    // 1. Notify frontend extraction has started
    let _ = app.emit("status-update", StatusPayload { state: "processing".into() });

    // 2. Safe OS-level selection capture (saves & restores original clipboard + window title)
    let capture_res = match capture::get_selected_text() {
        Ok(t) => t,
        Err(e) => {
            eprintln!("Capture error: {}", e);
            let _ = app.emit("status-update", StatusPayload { state: "idle".into() });
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

    if let Err(e) = db::save_task(new_task.clone()) {
        eprintln!("DB save error: {}", e);
    }

    // 6. Broadcast event to React frontend & complete status
    let _ = app.emit("new-task-captured", new_task.clone());
    let _ = app.emit("task-created", new_task);
    let _ = app.emit("status-update", StatusPayload { state: "done".into() });
}
