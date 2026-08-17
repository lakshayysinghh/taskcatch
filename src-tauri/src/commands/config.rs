use tauri::State;
use crate::models::{AppSettings, SystemPermissionsStatus};
use crate::services::db::Database;
use crate::services::llm::LlmService;
use crate::services::os_hooks::OsHooksService;
use crate::services::todoist::TodoistService;

#[tauri::command]
pub fn get_settings(db: State<'_, Database>) -> Result<AppSettings, String> {
    db.get_app_settings().map_err(|e| format!("Failed to load settings: {}", e))
}

#[tauri::command]
pub fn save_settings(settings: AppSettings, db: State<'_, Database>) -> Result<AppSettings, String> {
    db.save_app_settings(&settings).map_err(|e| format!("Failed to save settings: {}", e))?;
    Ok(settings)
}

#[tauri::command]
pub async fn test_llm_connection(provider: String, api_key: String, model: String) -> Result<String, String> {
    LlmService::test_connection(&provider, &api_key, &model).await
}

#[tauri::command]
pub async fn test_todoist_connection(api_key: String) -> Result<bool, String> {
    TodoistService::test_connection(&api_key).await
}

#[tauri::command]
pub fn get_permissions_status() -> Result<SystemPermissionsStatus, String> {
    Ok(OsHooksService::check_permissions())
}
