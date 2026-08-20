use arboard::Clipboard;
use enigo::{Enigo, Key, Keyboard, Settings};
use std::thread;
use std::time::Duration;

#[derive(Debug, Clone)]
pub struct CaptureResult {
    pub text: String,
    pub source_app: Option<String>,
}

#[cfg(target_os = "windows")]
pub fn get_active_window_title() -> Option<String> {
    use std::ffi::OsString;
    use std::os::windows::ffi::OsStringExt;

    #[link(name = "user32")]
    extern "system" {
        fn GetForegroundWindow() -> isize;
        fn GetWindowTextW(hwnd: isize, lpString: *mut u16, nMaxCount: i32) -> i32;
    }

    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd == 0 {
            return None;
        }

        let mut buffer = [0u16; 512];
        let len = GetWindowTextW(hwnd, buffer.as_mut_ptr(), buffer.len() as i32);
        if len > 0 {
            let os_str = OsString::from_wide(&buffer[..len as usize]);
            let title = os_str.to_string_lossy().to_string();
            if !title.trim().is_empty() {
                return Some(title.trim().to_string());
            }
        }
    }
    None
}

#[cfg(not(target_os = "windows"))]
pub fn get_active_window_title() -> Option<String> {
    None
}

pub fn get_selected_text() -> Result<CaptureResult, String> {
    // 0. Capture active foreground window title before keystrokes
    let source_app = get_active_window_title();

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
    
    Ok(CaptureResult {
        text: captured_text.trim().to_string(),
        source_app,
    })
}
