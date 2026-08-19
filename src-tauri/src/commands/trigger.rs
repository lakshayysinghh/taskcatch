use tauri::{AppHandle, State, Emitter};
use tauri_plugin_notification::NotificationExt;
use log::{error, info, warn};
use uuid::Uuid;
use chrono::Utc;
use crate::models::{ExtractionResult, Task};
use crate::services::db::Database;
use crate::services::clipboard::ClipboardService;
use crate::services::llm::LlmService;
use crate::services::todoist::TodoistService;

#[tauri::command]
pub async fn trigger_quick_capture(
    app: AppHandle,
    db: State<'_, Database>,
) -> Result<ExtractionResult, String> {
    info!("Triggering quick capture via simulated clipboard...");

    // 1. Capture highlighted text
    let raw_text = match ClipboardService::capture_highlighted_text() {
        Ok(t) => t,
        Err(e) => {
            warn!("Capture failed: {}", e);
            let _ = app.notification()
                .builder()
                .title("TaskCatch")
                .body(&format!("Capture error: {}", e))
                .show();
            return Err(e);
        }
    };

    process_and_store_task(&raw_text, &db, Some(&app)).await
}

#[tauri::command]
pub async fn extract_from_text(
    text: String,
    db: State<'_, Database>,
) -> Result<ExtractionResult, String> {
    process_and_store_task(&text, &db, None).await
}

pub async fn process_and_store_task(
    raw_text: &str,
    db: &Database,
    app: Option<&AppHandle>,
) -> Result<ExtractionResult, String> {
    let settings = db.get_app_settings()
        .map_err(|e| format!("Failed to read settings: {}", e))?;

    // 1. Extract via LLM
    let extracted = match LlmService::extract_task(raw_text, &settings).await {
        Ok(ext) => ext,
        Err(e) => {
            error!("LLM extraction error: {}", e);
            if let Some(app_handle) = app {
                let _ = app_handle.notification()
                    .builder()
                    .title("TaskCatch Error")
                    .body(&format!("Failed to extract task: {}", e))
                    .show();
            }
            return Err(e);
        }
    };

    // 2. Store in local SQLite database
    let new_id = Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();
    let created_task = Task {
        id: new_id,
        title: extracted.task_title.clone(),
        raw_source_text: Some(raw_text.to_string()),
        source_app: extracted.source_app.clone(),
        source_window_title: extracted.source_window_title.clone(),
        source_url: extracted.source_url.clone(),
        deadline: extracted.deadline.clone(),
        priority: extracted.priority.clone(),
        category: extracted.category.clone(),
        is_completed: false,
        created_at,
    };

    db.insert_full_task(&created_task)
        .map_err(|e| format!("Failed to save task to database: {}", e))?;

    // 3. Optional Todoist sync
    let mut synced_to_todoist = false;
    if settings.todoist_sync_enabled {
        if let Some(ref todoist_key) = settings.todoist_api_key {
            if !todoist_key.trim().is_empty() {
                match TodoistService::sync_task(todoist_key, &created_task).await {
                    Ok(_) => {
                        synced_to_todoist = true;
                        info!("Task automatically synced to Todoist");
                    }
                    Err(e) => {
                        warn!("Todoist auto-sync failed: {}", e);
                    }
                }
            }
        }
    }

    // 4. Send native OS notification & emit frontend event
    if let Some(app_handle) = app {
        let deadline_str = created_task.deadline.as_deref()
            .map(|d| format!(" (Due: {})", d))
            .unwrap_or_default();

        let _ = app_handle.notification()
            .builder()
            .title("TaskCatch: Action Item Captured!")
            .body(&format!("{}: {}{}", created_task.category, created_task.title, deadline_str))
            .show();

        // Notify active frontend windows
        let _ = app_handle.emit("task-created", &created_task);
    }

    Ok(ExtractionResult {
        success: true,
        task: Some(created_task),
        extracted: Some(extracted),
        raw_text: raw_text.to_string(),
        error: None,
        synced_to_todoist,
    })
}
