use arboard::Clipboard;
use enigo::{Direction, Enigo, Key, Keyboard, Settings};
use std::thread;
use std::time::{Duration, Instant};

#[derive(Debug, Clone)]
pub struct CaptureResult {
    pub text: String,
    pub source_app: Option<String>,
}

/// How long to wait for the user to let go of the hotkey's modifier keys.
const MODIFIER_RELEASE_TIMEOUT: Duration = Duration::from_millis(1500);
/// How long to wait for the foreground app to answer Ctrl+C. Electron apps
/// such as Slack can take a few hundred milliseconds.
const COPY_TIMEOUT: Duration = Duration::from_millis(800);

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

/// Sends the platform's copy shortcut to the foreground app.
fn send_copy() -> Result<(), String> {
    // A virtual-key code, so Ctrl+C works whatever the keyboard layout
    // (Key::Unicode('c') has no key on e.g. a Cyrillic layout).
    #[cfg(target_os = "windows")]
    let letter = Key::C;
    #[cfg(not(target_os = "windows"))]
    let letter = Key::Unicode('c');
    send_shortcut(letter)
}

/// Sends Ctrl+<letter> (Cmd on macOS) to the foreground app.
fn send_shortcut(letter: Key) -> Result<(), String> {
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| format!("{:?}", e))?;
    #[cfg(target_os = "macos")]
    let modifier = Key::Meta;
    #[cfg(not(target_os = "macos"))]
    let modifier = Key::Control;

    enigo
        .key(modifier, Direction::Press)
        .map_err(|e| format!("{:?}", e))?;
    // Always release the modifier, even if the letter failed.
    let click = enigo.key(letter, Direction::Click);
    let release = enigo.key(modifier, Direction::Release);
    click.and(release).map_err(|e| format!("{:?}", e))
}

/// Raw Win32 clipboard access, used to save and restore *every* format on
/// the clipboard (text, rich text, HTML, images, copied files), not just
/// plain text.
#[cfg(target_os = "windows")]
mod win {
    use std::ffi::c_void;
    use std::thread;
    use std::time::{Duration, Instant};

    #[link(name = "user32")]
    extern "system" {
        fn OpenClipboard(hwnd: isize) -> i32;
        fn CloseClipboard() -> i32;
        fn EmptyClipboard() -> i32;
        fn EnumClipboardFormats(format: u32) -> u32;
        fn GetClipboardData(format: u32) -> *mut c_void;
        fn SetClipboardData(format: u32, mem: *mut c_void) -> *mut c_void;
        fn GetClipboardSequenceNumber() -> u32;
        fn GetClipboardFormatNameW(format: u32, name: *mut u16, max_chars: i32) -> i32;
        fn GetAsyncKeyState(vkey: i32) -> i16;
    }

    #[link(name = "kernel32")]
    extern "system" {
        fn GlobalAlloc(flags: u32, bytes: usize) -> *mut c_void;
        fn GlobalLock(mem: *mut c_void) -> *mut c_void;
        fn GlobalUnlock(mem: *mut c_void) -> i32;
        fn GlobalSize(mem: *mut c_void) -> usize;
        fn GlobalFree(mem: *mut c_void) -> *mut c_void;
    }

    const GMEM_MOVEABLE: u32 = 0x0002;

    // Formats whose data is a GDI handle or owner-drawn rather than a block
    // of memory, so it cannot be copied byte-for-byte. Windows re-creates
    // CF_BITMAP from CF_DIB, so images still round-trip.
    const CF_BITMAP: u32 = 2;
    const CF_METAFILEPICT: u32 = 3;
    const CF_PALETTE: u32 = 9;
    const CF_ENHMETAFILE: u32 = 14;
    const CF_OWNERDISPLAY: u32 = 0x0080;
    const CF_DSPBITMAP: u32 = 0x0082;
    const CF_DSPMETAFILEPICT: u32 = 0x0083;
    const CF_DSPENHMETAFILE: u32 = 0x008E;

    const CF_DIB: u32 = 8;
    const CF_DIBV5: u32 = 17;

    /// OLE's own bookkeeping formats. They point at the copying app's live
    /// clipboard object; restoring them makes OLE-based readers (most apps)
    /// consult a stale object, which was seen to lose plain text in testing.
    const OLE_INTERNAL_FORMATS: [&str; 6] = [
        "DataObject",
        "Ole Private Data",
        "Object Descriptor",
        "Link Source Descriptor",
        "Embed Source",
        "Link Source",
    ];

    fn format_name(format: u32) -> Option<String> {
        let mut buf = [0u16; 256];
        let len = unsafe { GetClipboardFormatNameW(format, buf.as_mut_ptr(), buf.len() as i32) };
        if len <= 0 {
            None
        } else {
            Some(String::from_utf16_lossy(&buf[..len as usize]))
        }
    }

    fn is_copyable(format: u32) -> bool {
        // Registered (named) formats start at 0xC000.
        if format >= 0xC000 {
            if let Some(name) = format_name(format) {
                if OLE_INTERNAL_FORMATS.contains(&name.as_str()) {
                    return false;
                }
            }
        }
        let handle_based = matches!(
            format,
            CF_BITMAP
                | CF_METAFILEPICT
                | CF_PALETTE
                | CF_ENHMETAFILE
                | CF_OWNERDISPLAY
                | CF_DSPBITMAP
                | CF_DSPMETAFILEPICT
                | CF_DSPENHMETAFILE
        );
        let private_range = (0x0200..=0x02FF).contains(&format); // CF_PRIVATEFIRST..LAST
        let gdi_range = (0x0300..=0x03FF).contains(&format); // CF_GDIOBJFIRST..LAST
        !(handle_based || private_range || gdi_range)
    }

    /// Closes the clipboard when dropped, on every return path.
    struct OpenClipboardGuard;

    impl Drop for OpenClipboardGuard {
        fn drop(&mut self) {
            unsafe {
                CloseClipboard();
            }
        }
    }

    /// Another app may hold the clipboard briefly; retry for ~200 ms.
    fn open() -> Option<OpenClipboardGuard> {
        for _ in 0..20 {
            if unsafe { OpenClipboard(0) } != 0 {
                return Some(OpenClipboardGuard);
            }
            thread::sleep(Duration::from_millis(10));
        }
        None
    }

    /// A byte-for-byte copy of every copyable clipboard format.
    pub struct Snapshot(Vec<(u32, Vec<u8>)>);

    pub fn snapshot() -> Option<Snapshot> {
        let _guard = open()?;
        let mut saved = Vec::new();
        let mut format = 0u32;
        loop {
            format = unsafe { EnumClipboardFormats(format) };
            if format == 0 {
                break;
            }
            if !is_copyable(format) {
                continue;
            }
            unsafe {
                let handle = GetClipboardData(format);
                if handle.is_null() {
                    continue;
                }
                let ptr = GlobalLock(handle) as *const u8;
                if ptr.is_null() {
                    continue;
                }
                let size = GlobalSize(handle);
                let bytes = std::slice::from_raw_parts(ptr, size).to_vec();
                GlobalUnlock(handle);
                saved.push((format, bytes));
            }
        }
        // Windows recreates CF_DIBV5 from CF_DIB. Restoring both made apps
        // decode the image from the stale V5 copy with shifted colours
        // (verified on Windows 11); keep V5 only when it is the sole image.
        if saved.iter().any(|(f, _)| *f == CF_DIB) {
            saved.retain(|(f, _)| *f != CF_DIBV5);
        }
        Some(Snapshot(saved))
    }

    /// Puts a snapshot back. An empty snapshot leaves the clipboard empty,
    /// as it was. Returns false if any format could not be restored.
    pub fn restore(snapshot: &Snapshot) -> bool {
        let Some(_guard) = open() else {
            return false;
        };
        let mut complete = unsafe { EmptyClipboard() } != 0;
        for (format, bytes) in &snapshot.0 {
            unsafe {
                let mem = GlobalAlloc(GMEM_MOVEABLE, bytes.len().max(1));
                if mem.is_null() {
                    complete = false;
                    continue;
                }
                let ptr = GlobalLock(mem) as *mut u8;
                if ptr.is_null() {
                    GlobalFree(mem);
                    complete = false;
                    continue;
                }
                std::ptr::copy_nonoverlapping(bytes.as_ptr(), ptr, bytes.len());
                GlobalUnlock(mem);
                // On success the system owns `mem`; on failure we must free it.
                if SetClipboardData(*format, mem).is_null() {
                    GlobalFree(mem);
                    complete = false;
                }
            }
        }
        complete
    }

    /// Increments every time any app changes the clipboard.
    pub fn sequence() -> u32 {
        unsafe { GetClipboardSequenceNumber() }
    }

    /// Waits until Shift, Ctrl, Alt and Win are all physically released, so
    /// the hotkey's own modifiers don't combine with our Ctrl+C (with
    /// Ctrl+Shift+T held, Ctrl+C would arrive as Ctrl+Shift+C, which opens
    /// the element inspector in Chrome).
    pub fn wait_for_modifiers_released(timeout: Duration) -> bool {
        const VK_SHIFT: i32 = 0x10;
        const VK_CONTROL: i32 = 0x11;
        const VK_MENU: i32 = 0x12;
        const VK_LWIN: i32 = 0x5B;
        const VK_RWIN: i32 = 0x5C;
        let start = Instant::now();
        loop {
            let held = [VK_SHIFT, VK_CONTROL, VK_MENU, VK_LWIN, VK_RWIN]
                .iter()
                .any(|&vk| ((unsafe { GetAsyncKeyState(vk) } as u16) & 0x8000) != 0);
            if !held {
                return true;
            }
            if start.elapsed() >= timeout {
                return false;
            }
            thread::sleep(Duration::from_millis(10));
        }
    }
}

// ---------------------------------------------------------------------------
// Dictation: putting text into the focused app
// ---------------------------------------------------------------------------

/// How long the target app gets to read the clipboard after Ctrl+V before
/// the user's own clipboard is put back. Electron apps can be slow to read.
#[cfg(target_os = "windows")]
const PASTE_SETTLE: Duration = Duration::from_millis(350);

/// How dictated text reached the user.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Insertion {
    /// Pasted into the focused field (the user's clipboard was restored).
    Pasted,
    /// Typed key by key (paste was not possible).
    Typed,
    /// Not inserted; left on the clipboard instead, for the reason given.
    Copied(String),
}

/// The window that has keyboard focus, to check later that it still does.
#[cfg(target_os = "windows")]
pub fn foreground_window() -> Option<isize> {
    #[link(name = "user32")]
    extern "system" {
        fn GetForegroundWindow() -> isize;
    }
    let hwnd = unsafe { GetForegroundWindow() };
    if hwnd == 0 {
        None
    } else {
        Some(hwnd)
    }
}

#[cfg(not(target_os = "windows"))]
pub fn foreground_window() -> Option<isize> {
    None
}

/// True unless focus has demonstrably moved to another window since the
/// dictation started (unknown counts as unchanged).
pub fn same_window(started_in: Option<isize>, now: Option<isize>) -> bool {
    match (started_in, now) {
        (Some(a), Some(b)) => a == b,
        _ => true,
    }
}

/// Removes characters that break typing or pasting, and uses Windows line
/// endings so multi-line dictation pastes correctly everywhere.
pub fn prepare_for_insert(text: &str) -> String {
    let no_nul: String = text.chars().filter(|c| *c != '\0').collect();
    let lf = no_nul.replace("\r\n", "\n").replace('\r', "\n");
    if cfg!(target_os = "windows") {
        lf.replace('\n', "\r\n")
    } else {
        lf
    }
}

/// Puts text on the clipboard and leaves it there.
pub fn copy_to_clipboard(text: &str) -> Result<(), String> {
    Clipboard::new()
        .and_then(|mut c| c.set_text(text.to_string()))
        .map_err(|e| format!("Could not copy to the clipboard: {}", e))
}

fn copied(text: &str, reason: &str) -> Result<Insertion, String> {
    copy_to_clipboard(text)?;
    Ok(Insertion::Copied(reason.to_string()))
}

/// Pastes through the clipboard and then restores the user's clipboard (all
/// formats). One keystroke, so it is instant, keeps the caret position,
/// replaces a selection like typing would, and never presses Enter for a new
/// line (which would send a half-written chat message).
#[cfg(target_os = "windows")]
fn paste_text(text: &str) -> Result<(), String> {
    let snapshot = win::snapshot().ok_or("The clipboard is in use by another app.")?;
    // Kept out of Windows clipboard history (Win+V) and cloud clipboard sync.
    use arboard::SetExtWindows;
    let set = Clipboard::new().and_then(|mut c| c.set().exclude_from_history().exclude_from_cloud().text(text.to_string()));
    let result = match set {
        Ok(()) => send_shortcut(Key::V),
        Err(e) => Err(format!("Could not use the clipboard: {}", e)),
    };
    if result.is_ok() {
        thread::sleep(PASTE_SETTLE);
    }
    if !win::restore(&snapshot) {
        eprintln!("Clipboard could not be fully restored after dictation");
    }
    result
}

fn type_keys(text: &str) -> Result<(), String> {
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| format!("{:?}", e))?;
    enigo.text(text).map_err(|e| format!("Could not type the text: {:?}", e))
}

/// Inserts dictated text into the focused app. `started_in` is the window
/// that had focus when dictation began: if focus has since moved elsewhere
/// the text is not inserted there, it is copied to the clipboard instead.
/// The text is never lost: whenever it cannot be inserted it is copied.
/// Blocking: call it off the async runtime.
pub fn insert_text(text: &str, started_in: Option<isize>) -> Result<Insertion, String> {
    // One insertion at a time, so two dictations cannot fight over the clipboard.
    static INSERTING: std::sync::Mutex<()> = std::sync::Mutex::new(());
    let _one_at_a_time = INSERTING.lock().unwrap_or_else(|p| p.into_inner());
    let text = prepare_for_insert(text);
    if text.trim().is_empty() {
        return Ok(Insertion::Typed);
    }

    #[cfg(target_os = "windows")]
    {
        // A held modifier would turn the paste or the letters into shortcuts.
        if !win::wait_for_modifiers_released(MODIFIER_RELEASE_TIMEOUT) {
            return copied(&text, "Ctrl, Shift, Alt or Win was still held down.");
        }
        if !same_window(started_in, foreground_window()) {
            return copied(&text, "You switched to another window while speaking.");
        }
        if paste_text(&text).is_ok() {
            return Ok(Insertion::Pasted);
        }
    }
    #[cfg(not(target_os = "windows"))]
    let _ = started_in;

    match type_keys(&text) {
        Ok(()) => Ok(Insertion::Typed),
        Err(_) => copied(&text, "This app did not accept typed text."),
    }
}

/// Copies the current selection in the foreground app and returns it,
/// leaving the user's clipboard exactly as it was (all formats).
///
/// Blocking: call it off the async runtime (spawn_blocking).
#[cfg(target_os = "windows")]
pub fn get_selected_text() -> Result<CaptureResult, String> {
    if !win::wait_for_modifiers_released(MODIFIER_RELEASE_TIMEOUT) {
        return Err("Release the hotkey's Ctrl/Shift/Alt/Win keys to capture.".to_string());
    }

    // Read the window title before any keystrokes change focus.
    let source_app = get_active_window_title();

    // Without a snapshot the copy would overwrite the user's clipboard for good.
    let snapshot = win::snapshot().ok_or("The clipboard is in use by another app. Try again.")?;
    let before = win::sequence();

    send_copy()?;

    // Watch the clipboard's change counter instead of sleeping a fixed time.
    let started = Instant::now();
    let mut copied = false;
    while started.elapsed() < COPY_TIMEOUT {
        if win::sequence() != before {
            copied = true;
            break;
        }
        thread::sleep(Duration::from_millis(15));
    }
    if !copied {
        // Nothing changed, so there is nothing to restore.
        return Err("No text was selected".to_string());
    }

    // Apps often write several formats in a row; let them finish.
    thread::sleep(Duration::from_millis(40));
    let captured = Clipboard::new()
        .and_then(|mut c| c.get_text())
        .unwrap_or_default();

    if !win::restore(&snapshot) {
        eprintln!("Clipboard could not be fully restored after capture");
    }

    let text = captured.trim().to_string();
    if text.is_empty() {
        return Err("No text was selected".to_string());
    }
    Ok(CaptureResult { text, source_app })
}

/// Non-Windows fallback: plain-text clipboard preservation only.
#[cfg(not(target_os = "windows"))]
pub fn get_selected_text() -> Result<CaptureResult, String> {
    let source_app = get_active_window_title();
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    let original = clipboard.get_text().unwrap_or_default();
    let _ = clipboard.set_text("");

    send_copy()?;

    let started = Instant::now();
    let mut captured = String::new();
    while started.elapsed() < COPY_TIMEOUT {
        captured = clipboard.get_text().unwrap_or_default();
        if !captured.is_empty() {
            break;
        }
        thread::sleep(Duration::from_millis(15));
    }

    // Put back what was there, including "nothing".
    if original.is_empty() {
        let _ = clipboard.clear();
    } else {
        let _ = clipboard.set_text(original);
    }

    let text = captured.trim().to_string();
    if text.is_empty() {
        return Err("No text was selected".to_string());
    }
    Ok(CaptureResult { text, source_app })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_a_known_change_of_window_blocks_insertion() {
        assert!(same_window(Some(42), Some(42)));
        assert!(!same_window(Some(42), Some(7)));
        assert!(same_window(None, Some(7)));
        assert!(same_window(Some(42), None));
    }

    #[test]
    fn text_is_prepared_for_pasting() {
        assert_eq!(prepare_for_insert("a\0b"), "ab");
        let nl = if cfg!(target_os = "windows") { "\r\n" } else { "\n" };
        assert_eq!(prepare_for_insert("one\ntwo"), format!("one{}two", nl));
        assert_eq!(prepare_for_insert("one\r\ntwo\rthree"), format!("one{nl}two{nl}three", nl = nl));
    }
}
