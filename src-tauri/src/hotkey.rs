use tauri::AppHandle;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

pub fn register_hotkey(app: &AppHandle, shortcut_str: &str) -> Result<(), String> {
    if shortcut_str.trim().is_empty() {
        let _ = app.global_shortcut().unregister_all();
        return Ok(());
    }

    let shortcut = shortcut_str.trim().parse::<Shortcut>().map_err(|e| format!("Invalid shortcut: {}", e))?;
    
    // Clear previously registered shortcuts
    let _ = app.global_shortcut().unregister_all();
    
    // Register the new one
    app.global_shortcut().register(shortcut).map_err(|e| format!("Failed to register shortcut: {}", e))?;

    Ok(())
}
