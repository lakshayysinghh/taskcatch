//! Floating voice indicator: a small pill near the bottom of the screen that
//! shows listening (with a live level meter), transcribing and the result
//! while a voice hotkey is used with TaskCatch in the background.
//!
//! The window must never take keyboard focus: dictation pastes into
//! whichever window has focus, and the dictation stage refuses to insert if
//! focus has moved. So it is created as a no-activate tool window that
//! ignores the mouse, and on Windows it is shown with SW_SHOWNOACTIVATE.

use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

pub const LABEL: &str = "overlay";
/// Logical size of the pill window.
const WIDTH: f64 = 320.0;
const HEIGHT: f64 = 64.0;
/// Gap between the pill and the bottom of the work area (taskbar excluded).
const BOTTOM_MARGIN: f64 = 56.0;
/// How long a finished state (done, copied, error) stays on screen.
const LINGER: Duration = Duration::from_millis(1_600);
const LINGER_ERROR: Duration = Duration::from_millis(3_200);

/// Bumped on every show, so a pending hide from an earlier take does not
/// hide a newer one.
static GENERATION: AtomicU64 = AtomicU64::new(0);

/// Creates the hidden overlay window. Called once at start-up.
pub fn create(app: &AppHandle) -> tauri::Result<()> {
    let window = WebviewWindowBuilder::new(app, LABEL, WebviewUrl::App("index.html#overlay".into()))
        .title("TaskCatch voice")
        .inner_size(WIDTH, HEIGHT)
        .decorations(false)
        .transparent(true)
        .shadow(false)
        .resizable(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .focused(false)
        .visible(false)
        .build()?;
    let _ = window.set_ignore_cursor_events(true);
    #[cfg(target_os = "windows")]
    if let Ok(hwnd) = window.hwnd() {
        win::make_non_activating(hwnd.0 as isize);
    }
    Ok(())
}

fn window(app: &AppHandle) -> Option<WebviewWindow> {
    app.get_webview_window(LABEL)
}

/// Bottom-centre of the work area of the monitor under the mouse pointer,
/// in physical pixels.
fn position(app: &AppHandle, window: &WebviewWindow) -> Option<(i32, i32)> {
    let monitor = app
        .cursor_position()
        .ok()
        .and_then(|p| app.monitor_from_point(p.x, p.y).ok().flatten())
        .or_else(|| app.primary_monitor().ok().flatten())?;
    let area = monitor.work_area();
    let scale = monitor.scale_factor();
    let size = window.outer_size().ok()?;
    let x = area.position.x + (area.size.width as i32 - size.width as i32) / 2;
    let y = area.position.y + area.size.height as i32 - size.height as i32 - (BOTTOM_MARGIN * scale) as i32;
    Some((x, y))
}

/// Shows the pill without activating it.
pub fn show(app: &AppHandle) {
    GENERATION.fetch_add(1, Ordering::SeqCst);
    let Some(window) = window(app) else { return };
    let spot = position(app, &window);

    #[cfg(target_os = "windows")]
    if let Ok(hwnd) = window.hwnd() {
        win::show_no_activate(hwnd.0 as isize, spot);
        return;
    }

    if let Some((x, y)) = spot {
        let _ = window.set_position(tauri::PhysicalPosition::new(x, y));
    }
    let _ = window.show();
}

pub fn hide_now(app: &AppHandle) {
    let Some(window) = window(app) else { return };
    #[cfg(target_os = "windows")]
    if let Ok(hwnd) = window.hwnd() {
        win::hide(hwnd.0 as isize);
        return;
    }
    let _ = window.hide();
}

/// Hides the pill after the result has been on screen for a moment, unless
/// a new take has started in the meantime.
pub fn hide_later(app: &AppHandle, error: bool) {
    let generation = GENERATION.load(Ordering::SeqCst);
    let app = app.clone();
    let delay = if error { LINGER_ERROR } else { LINGER };
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(delay).await;
        if GENERATION.load(Ordering::SeqCst) == generation {
            hide_now(&app);
        }
    });
}

#[cfg(target_os = "windows")]
mod win {
    #[link(name = "user32")]
    extern "system" {
        fn GetWindowLongPtrW(hwnd: isize, index: i32) -> isize;
        fn SetWindowLongPtrW(hwnd: isize, index: i32, value: isize) -> isize;
        fn SetWindowPos(hwnd: isize, insert_after: isize, x: i32, y: i32, cx: i32, cy: i32, flags: u32) -> i32;
        fn ShowWindow(hwnd: isize, cmd: i32) -> i32;
    }

    const GWL_EXSTYLE: i32 = -20;
    const WS_EX_TOOLWINDOW: isize = 0x0000_0080;
    const WS_EX_NOACTIVATE: isize = 0x0800_0000;
    const HWND_TOPMOST: isize = -1;
    const SWP_NOSIZE: u32 = 0x0001;
    const SWP_NOMOVE: u32 = 0x0002;
    const SWP_NOACTIVATE: u32 = 0x0010;
    const SWP_SHOWWINDOW: u32 = 0x0040;
    const SW_HIDE: i32 = 0;
    const SW_SHOWNOACTIVATE: i32 = 4;

    /// A tool window (no taskbar or Alt+Tab entry) that clicks and
    /// ShowWindow can never make the active window.
    pub fn make_non_activating(hwnd: isize) {
        unsafe {
            let style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
            SetWindowLongPtrW(hwnd, GWL_EXSTYLE, style | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE);
        }
    }

    pub fn show_no_activate(hwnd: isize, spot: Option<(i32, i32)>) {
        unsafe {
            let mut flags = SWP_NOSIZE | SWP_NOACTIVATE | SWP_SHOWWINDOW;
            let (x, y) = match spot {
                Some(p) => p,
                None => {
                    flags |= SWP_NOMOVE;
                    (0, 0)
                }
            };
            SetWindowPos(hwnd, HWND_TOPMOST, x, y, 0, 0, flags);
            ShowWindow(hwnd, SW_SHOWNOACTIVATE);
        }
    }

    pub fn hide(hwnd: isize) {
        unsafe {
            ShowWindow(hwnd, SW_HIDE);
        }
    }
}
