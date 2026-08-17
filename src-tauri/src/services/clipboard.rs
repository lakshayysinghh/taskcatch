use std::thread;
use std::time::Duration;
use arboard::Clipboard;
use enigo::{Direction, Enigo, Key, Keyboard, Settings};
use log::{debug, error, info, warn};

pub struct ClipboardService;

impl ClipboardService {
    /// Captures the currently highlighted text across the OS:
    /// 1. Backs up current clipboard text.
    /// 2. Simulates Ctrl+C (Windows/Linux) or Cmd+C (macOS).
    /// 3. Polls the clipboard for updated text with debounce (50ms interval, up to 500ms max).
    /// 4. Restores the original clipboard text.
    /// 5. Returns the captured text string.
    pub fn capture_highlighted_text() -> Result<String, String> {
        info!("Starting highlighted text capture...");

        // 1. Open clipboard and save current content
        let mut clipboard = Clipboard::new().map_err(|e| format!("Failed to access clipboard: {}", e))?;
        let backup_text = clipboard.get_text().ok();
        debug!("Existing clipboard text backed up (length: {:?})", backup_text.as_ref().map(|s| s.len()));

        // Set a unique sentinel token to reliably detect new clipboard data
        let sentinel = format!("__TASKCATCH_SENTINEL_{}__", chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0));
        let _ = clipboard.set_text(&sentinel);

        // Small pause to allow OS clipboard buffer sync
        thread::sleep(Duration::from_millis(30));

        // 2. Dispatch simulated copy keystrokes
        if let Err(e) = Self::simulate_copy_keystroke() {
            // Attempt to restore backup before returning error
            if let Some(orig) = backup_text {
                let _ = clipboard.set_text(orig);
            }
            return Err(format!("Failed to simulate copy keystroke: {}", e));
        }

        // 3. Poll with retry/debounce (50ms intervals, up to 10 attempts / 500ms)
        let mut captured_text: Option<String> = None;
        for attempt in 1..=10 {
            thread::sleep(Duration::from_millis(50));
            if let Ok(current) = clipboard.get_text() {
                if !current.is_empty() && current != sentinel {
                    debug!("Captured text on attempt #{} (length: {})", attempt, current.len());
                    captured_text = Some(current);
                    break;
                }
            }
        }

        // 4. Restore original clipboard content
        if let Some(orig) = backup_text {
            let _ = clipboard.set_text(orig);
            debug!("Original clipboard text restored.");
        } else {
            let _ = clipboard.clear();
        }

        match captured_text {
            Some(text) if !text.trim().is_empty() => Ok(text.trim().to_string()),
            _ => Err("No highlighted text detected. Please highlight some text and try again.".to_string()),
        }
    }

    /// Simulates Cmd+C on macOS or Ctrl+C on Windows/Linux
    fn simulate_copy_keystroke() -> Result<(), String> {
        let mut enigo = Enigo::new(&Settings::default()).map_err(|e| format!("Enigo init error: {:?}", e))?;

        #[cfg(target_os = "macos")]
        {
            // Meta (Cmd) + C
            enigo.key(Key::Meta, Direction::Press).map_err(|e| format!("{:?}", e))?;
            thread::sleep(Duration::from_millis(15));
            enigo.key(Key::Unicode('c'), Direction::Click).map_err(|e| format!("{:?}", e))?;
            thread::sleep(Duration::from_millis(15));
            enigo.key(Key::Meta, Direction::Release).map_err(|e| format!("{:?}", e))?;
        }

        #[cfg(not(target_os = "macos"))]
        {
            // Control + C
            enigo.key(Key::Control, Direction::Press).map_err(|e| format!("{:?}", e))?;
            thread::sleep(Duration::from_millis(15));
            enigo.key(Key::Unicode('c'), Direction::Click).map_err(|e| format!("{:?}", e))?;
            thread::sleep(Duration::from_millis(15));
            enigo.key(Key::Control, Direction::Release).map_err(|e| format!("{:?}", e))?;
        }

        Ok(())
    }

    /// Direct clipboard text reader
    pub fn get_current_clipboard_text() -> Result<String, String> {
        let mut clipboard = Clipboard::new().map_err(|e| format!("Clipboard access error: {}", e))?;
        clipboard.get_text().map_err(|e| format!("Failed to read clipboard: {}", e))
    }
}
