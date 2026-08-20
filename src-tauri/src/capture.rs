use arboard::Clipboard;
use enigo::{Enigo, Key, Keyboard, Settings};
use std::thread;
use std::time::Duration;

pub fn get_selected_text() -> Result<String, String> {
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    
    // 1. Save original clipboard content in memory
    let original_clipboard = clipboard.get_text().unwrap_or_default();
    
    // 2. Clear clipboard temporarily to detect fresh selection
    let _ = clipboard.set_text("");
    
    // 3. Simulate Ctrl+C / Cmd+C
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;
    
    #[cfg(target_os = "macos")]
    {
        let _ = enigo.key(Key::Meta, enigo::Direction::Press);
        let _ = enigo.key(Key::C, enigo::Direction::Click);
        let _ = enigo.key(Key::Meta, enigo::Direction::Release);
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        let _ = enigo.key(Key::Control, enigo::Direction::Press);
        let _ = enigo.key(Key::Unicode('c'), enigo::Direction::Click);
        let _ = enigo.key(Key::Control, enigo::Direction::Release);
    }
    
    // 4. Wait brief interval for OS copy buffer
    thread::sleep(Duration::from_millis(160));
    
    // 5. Read newly captured selection
    let captured_text = clipboard.get_text().unwrap_or_default();
    
    // 6. Safe Copy: Immediately restore user's original clipboard
    if !original_clipboard.is_empty() {
        let _ = clipboard.set_text(original_clipboard);
    }
    
    if captured_text.trim().is_empty() {
        return Err("No text was selected".to_string());
    }
    
    Ok(captured_text.trim().to_string())
}
