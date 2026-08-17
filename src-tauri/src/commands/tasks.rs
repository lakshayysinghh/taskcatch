use tauri::State;
use crate::models::{Task, CreateTaskInput, UpdateTaskInput};
use crate::services::db::Database;
use crate::services::todoist::TodoistService;

#[tauri::command]
pub fn get_tasks(db: State<'_, Database>) -> Result<Vec<Task>, String> {
    db.get_all_tasks().map_err(|e| format!("Failed to retrieve tasks: {}", e))
}

#[tauri::command]
pub fn create_task(input: CreateTaskInput, db: State<'_, Database>) -> Result<Task, String> {
    db.create_task(input).map_err(|e| format!("Failed to create task: {}", e))
}

#[tauri::command]
pub fn update_task(input: UpdateTaskInput, db: State<'_, Database>) -> Result<Task, String> {
    db.update_task(input).map_err(|e| format!("Failed to update task: {}", e))
}

#[tauri::command]
pub fn toggle_task(id: String, db: State<'_, Database>) -> Result<Task, String> {
    db.toggle_task_completion(&id).map_err(|e| format!("Failed to toggle task: {}", e))
}

#[tauri::command]
pub fn delete_task(id: String, db: State<'_, Database>) -> Result<bool, String> {
    db.delete_task(&id).map_err(|e| format!("Failed to delete task: {}", e))
}

#[tauri::command]
pub fn clear_completed(db: State<'_, Database>) -> Result<usize, String> {
    db.clear_completed_tasks().map_err(|e| format!("Failed to clear completed tasks: {}", e))
}

#[tauri::command]
pub async fn sync_task_to_todoist(id: String, db: State<'_, Database>) -> Result<String, String> {
    let task = db.get_task_by_id(&id)
        .map_err(|e| format!("Database query error: {}", e))?
        .ok_or_else(|| "Task not found".to_string())?;

    let settings = db.get_app_settings()
        .map_err(|e| format!("Failed to read settings: {}", e))?;

    let key = settings.todoist_api_key
        .ok_or_else(|| "Todoist API Key is not configured in Settings".to_string())?;

    TodoistService::sync_task(&key, &task).await
}
