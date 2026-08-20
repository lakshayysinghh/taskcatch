use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppConfig {
    pub groq_api_key: String,
    pub global_hotkey: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            groq_api_key: String::new(),
            global_hotkey: "F9".to_string(),
        }
    }
}

pub struct ConfigState(pub Mutex<AppConfig>);

fn get_config_path() -> PathBuf {
    let mut path = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("TaskCatch");
    fs::create_dir_all(&path).ok();
    path.push("config.json");
    path
}

pub fn load_config() -> AppConfig {
    let path = get_config_path();
    if path.exists() {
        if let Ok(content) = fs::read_to_string(path) {
            if let Ok(config) = serde_json::from_str::<AppConfig>(&content) {
                return config;
            }
        }
    }
    AppConfig::default()
}

pub fn save_config(config: &AppConfig) -> Result<(), String> {
    let path = get_config_path();
    let content = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())
}
