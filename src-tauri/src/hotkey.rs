use std::sync::Mutex;
use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

/// What a registered global shortcut does.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum HotkeyAction {
    /// Press: copy the highlighted text and make a task.
    Capture,
    /// Hold: record speech and make a task.
    Voice,
    /// Hold: record speech and type it into the focused app.
    Dictation,
}

/// The shortcuts currently registered, and which action each one triggers.
#[derive(Default)]
pub struct HotkeyMap(pub Mutex<Vec<(Shortcut, HotkeyAction)>>);

/// Parses and checks the three hotkey settings (empty = off) without touching
/// the OS, so a bad setting is rejected before anything is unregistered.
pub fn plan_hotkeys(capture: &str, voice: &str, dictation: &str) -> Result<Vec<(Shortcut, HotkeyAction)>, String> {
    let mut planned: Vec<(Shortcut, HotkeyAction)> = Vec::new();
    for (text, action, label) in [
        (capture, HotkeyAction::Capture, "capture"),
        (voice, HotkeyAction::Voice, "voice"),
        (dictation, HotkeyAction::Dictation, "dictation"),
    ] {
        let text = text.trim();
        if text.is_empty() {
            continue;
        }
        let shortcut = text
            .parse::<Shortcut>()
            .map_err(|e| format!("Invalid {} hotkey '{}': {}", label, text, e))?;
        if planned.iter().any(|(existing, _)| *existing == shortcut) {
            return Err(format!("The {} hotkey '{}' is already used by another action.", label, text));
        }
        planned.push((shortcut, action));
    }
    Ok(planned)
}

/// Replaces all registered global shortcuts with the given set.
pub fn register_hotkeys(app: &AppHandle, capture: &str, voice: &str, dictation: &str) -> Result<(), String> {
    let planned = plan_hotkeys(capture, voice, dictation)?;

    let shortcuts = app.global_shortcut();
    let _ = shortcuts.unregister_all();
    if let Some(map) = app.try_state::<HotkeyMap>() {
        map.0.lock().unwrap_or_else(|p| p.into_inner()).clear();
    }

    for (shortcut, _) in &planned {
        shortcuts
            .register(*shortcut)
            .map_err(|e| format!("Could not register the hotkey {}: {}", shortcut, e))?;
    }

    if let Some(map) = app.try_state::<HotkeyMap>() {
        *map.0.lock().unwrap_or_else(|p| p.into_inner()) = planned;
    }
    Ok(())
}

/// Which action a pressed or released shortcut belongs to.
pub fn action_for(app: &AppHandle, shortcut: &Shortcut) -> Option<HotkeyAction> {
    let map = app.try_state::<HotkeyMap>()?;
    let registered = map.0.lock().unwrap_or_else(|p| p.into_inner());
    registered.iter().find(|(s, _)| s == shortcut).map(|(_, action)| *action)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn plans_all_three_and_skips_empty() {
        let planned = plan_hotkeys("F9", "F8", "").unwrap();
        assert_eq!(planned.len(), 2);
        assert_eq!(planned[0].1, HotkeyAction::Capture);
        assert_eq!(planned[1].1, HotkeyAction::Voice);
    }

    #[test]
    fn rejects_duplicates_and_bad_keys() {
        assert!(plan_hotkeys("F9", "F9", "F7").unwrap_err().contains("already used"));
        assert!(plan_hotkeys("F9", "NotAKey", "F7").unwrap_err().contains("Invalid voice hotkey"));
    }
}
