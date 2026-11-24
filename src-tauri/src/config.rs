use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

/// Settings saved in config.json. Every field has a default so config files
/// written by older versions still load.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppConfig {
    #[serde(default)]
    pub groq_api_key: String,
    /// Highlight-and-capture hotkey (press).
    #[serde(default = "default_capture_hotkey")]
    pub global_hotkey: String,
    /// Hold to speak a new task. Empty = off.
    #[serde(default = "default_voice_hotkey")]
    pub voice_hotkey: String,
    /// Hold to dictate text into the focused app. Empty = off.
    #[serde(default = "default_dictation_hotkey")]
    pub dictation_hotkey: String,
    /// ISO-639-1 code passed to Whisper, or empty to auto-detect.
    #[serde(default)]
    pub voice_language: String,
    /// Tidy dictated text (punctuation, filler words) before typing it.
    #[serde(default = "default_true")]
    pub dictation_cleanup: bool,
    /// Names and terms to spell correctly, separated by commas or new lines.
    #[serde(default)]
    pub voice_vocabulary: String,
    /// Whisper model preference: "accurate" (large-v3 first) or "fast" (turbo first).
    #[serde(default = "default_voice_model")]
    pub voice_model: String,
}

fn default_voice_model() -> String {
    "accurate".to_string()
}

fn default_capture_hotkey() -> String {
    "F9".to_string()
}

fn default_voice_hotkey() -> String {
    "F8".to_string()
}

fn default_dictation_hotkey() -> String {
    "F7".to_string()
}

fn default_true() -> bool {
    true
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            groq_api_key: String::new(),
            global_hotkey: default_capture_hotkey(),
            voice_hotkey: default_voice_hotkey(),
            dictation_hotkey: default_dictation_hotkey(),
            voice_language: String::new(),
            dictation_cleanup: true,
            voice_vocabulary: String::new(),
            voice_model: default_voice_model(),
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn old_config_files_get_voice_defaults() {
        let cfg: AppConfig = serde_json::from_str(r#"{"groq_api_key":"k","global_hotkey":"F9"}"#).unwrap();
        assert_eq!(cfg.voice_hotkey, "F8");
        assert_eq!(cfg.dictation_hotkey, "F7");
        assert_eq!(cfg.voice_language, "");
        assert!(cfg.dictation_cleanup);
    }

    #[test]
    fn empty_hotkeys_stay_empty() {
        let cfg: AppConfig =
            serde_json::from_str(r#"{"groq_api_key":"","global_hotkey":"F9","voice_hotkey":"","dictation_hotkey":""}"#).unwrap();
        assert_eq!(cfg.voice_hotkey, "");
        assert_eq!(cfg.dictation_hotkey, "");
    }
}
