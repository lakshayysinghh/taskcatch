use crate::models::SystemPermissionsStatus;

pub struct OsHooksService;

impl OsHooksService {
    /// Checks OS permissions for input simulation and global hooks
    pub fn check_permissions() -> SystemPermissionsStatus {
        #[cfg(target_os = "macos")]
        {
            let is_trusted = Self::check_macos_accessibility();
            SystemPermissionsStatus {
                platform: "macos".to_string(),
                has_accessibility_permission: is_trusted,
                notes: if is_trusted {
                    "Accessibility permissions granted. Keystroke simulation enabled.".to_string()
                } else {
                    "Accessibility permission required. Please grant permission in macOS System Settings > Privacy & Security > Accessibility.".to_string()
                },
            }
        }

        #[cfg(target_os = "linux")]
        {
            let is_wayland = std::env::var("WAYLAND_DISPLAY").is_ok() 
                || std::env::var("XDG_SESSION_TYPE").map(|v| v.to_lowercase() == "wayland").unwrap_or(false);
            
            SystemPermissionsStatus {
                platform: "linux".to_string(),
                has_accessibility_permission: true,
                notes: if is_wayland {
                    "Wayland session detected. If global hotkeys or keystrokes are blocked, ensure uinput rules or XWayland compatibility are enabled (see Bulbul guide).".to_string()
                } else {
                    "X11 session detected. Global hotkeys and keystroke simulation active.".to_string()
                },
            }
        }

        #[cfg(target_os = "windows")]
        {
            SystemPermissionsStatus {
                platform: "windows".to_string(),
                has_accessibility_permission: true,
                notes: "Windows OS detected. Global hotkeys and input simulation are ready.".to_string(),
            }
        }

        #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
        {
            SystemPermissionsStatus {
                platform: "unknown".to_string(),
                has_accessibility_permission: true,
                notes: "Standard OS hooks active.".to_string(),
            }
        }
    }

    #[cfg(target_os = "macos")]
    fn check_macos_accessibility() -> bool {
        // Safe check using macOS ApplicationServices
        #[link(name = "ApplicationServices", kind = "framework")]
        extern "C" {
            fn AXIsProcessTrusted() -> bool;
        }
        unsafe { AXIsProcessTrusted() }
    }
}
