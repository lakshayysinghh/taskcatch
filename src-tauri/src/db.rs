use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Task {
    pub id: String,
    pub content: String,
    pub original_text: Option<String>,
    pub timestamp: String,
    #[serde(default = "default_priority")]
    pub priority: String, // "High", "Medium", "Low"
    #[serde(default = "default_category")]
    pub category: String, // "General", "Security", etc.
    pub deadline: Option<String>,
    #[serde(default)]
    pub completed: bool,
}

fn default_priority() -> String {
    "Medium".to_string()
}

fn default_category() -> String {
    "General".to_string()
}

fn get_db_path() -> PathBuf {
    let mut path = dirs::data_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("TaskCatch");
    fs::create_dir_all(&path).ok();
    path.push("tasks.json");
    path
}

pub fn get_tasks() -> Vec<Task> {
    let path = get_db_path();
    if path.exists() {
        if let Ok(content) = fs::read_to_string(path) {
            if let Ok(tasks) = serde_json::from_str(&content) {
                return tasks;
            }
        }
    }
    Vec::new()
}

pub fn save_task(task: Task) -> Result<(), String> {
    let mut tasks = get_tasks();
    tasks.insert(0, task);
    write_tasks(&tasks)
}

pub fn delete_task(task_id: &str) -> Result<(), String> {
    let mut tasks = get_tasks();
    tasks.retain(|t| t.id != task_id);
    write_tasks(&tasks)
}

pub fn toggle_task(task_id: &str) -> Result<bool, String> {
    let mut tasks = get_tasks();
    let mut new_state = false;
    for t in tasks.iter_mut() {
        if t.id == task_id {
            t.completed = !t.completed;
            new_state = t.completed;
            break;
        }
    }
    write_tasks(&tasks)?;
    Ok(new_state)
}

pub fn update_task(task_id: &str, new_priority: Option<String>, new_timestamp: Option<String>) -> Result<(), String> {
    let mut tasks = get_tasks();
    let mut changed = false;
    for t in tasks.iter_mut() {
        if t.id == task_id {
            if let Some(ref p) = new_priority {
                t.priority = p.clone();
                changed = true;
            }
            if let Some(ref ts) = new_timestamp {
                t.timestamp = ts.clone();
                changed = true;
            }
            break;
        }
    }
    if changed {
        write_tasks(&tasks)?;
    }
    Ok(())
}

fn write_tasks(tasks: &[Task]) -> Result<(), String> {
    let path = get_db_path();
    let content = serde_json::to_string_pretty(tasks).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())
}
