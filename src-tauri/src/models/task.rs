use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub raw_source_text: Option<String>,
    pub deadline: Option<String>,
    pub priority: String,
    pub category: String,
    pub is_completed: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTaskInput {
    pub title: String,
    pub raw_source_text: Option<String>,
    pub deadline: Option<String>,
    pub priority: Option<String>,
    pub category: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTaskInput {
    pub id: String,
    pub title: Option<String>,
    pub raw_source_text: Option<String>,
    pub deadline: Option<String>,
    pub priority: Option<String>,
    pub category: Option<String>,
    pub is_completed: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ExtractedTask {
    pub task_title: String,
    pub deadline: Option<String>,
    pub priority: String,
    pub category: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub groq_api_key: Option<String>,
    pub groq_model: String,
    pub openai_api_key: Option<String>,
    pub openai_model: String,
    pub todoist_api_key: Option<String>,
    pub todoist_sync_enabled: bool,
    pub global_shortcut: String,
    pub custom_instructions: Option<String>,
    pub theme: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            groq_api_key: None,
            groq_model: "llama-3.3-70b-versatile".to_string(),
            openai_api_key: None,
            openai_model: "gpt-4o-mini".to_string(),
            todoist_api_key: None,
            todoist_sync_enabled: false,
            global_shortcut: "CommandOrControl+Shift+T".to_string(),
            custom_instructions: None,
            theme: "dark".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractionResult {
    pub success: bool,
    pub task: Option<Task>,
    pub extracted: Option<ExtractedTask>,
    pub raw_text: String,
    pub error: Option<String>,
    pub synced_to_todoist: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemPermissionsStatus {
    pub platform: String,
    pub has_accessibility_permission: bool,
    pub notes: String,
}
