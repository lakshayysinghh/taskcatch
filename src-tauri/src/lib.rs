pub mod models;
pub mod services;
pub mod commands;

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};
use log::{error, info};
use services::db::Database;
use commands::{tasks, config, trigger};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();
    info!("Starting TaskCatch application...");

    let db = match Database::new(None) {
        Ok(d) => d,
        Err(e) => {
            error!("Failed to initialize database: {}", e);
            Database::new_in_memory().expect("In-memory SQLite fallback failed")
        }
    };

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(db)
        .invoke_handler(tauri::generate_handler![
            tasks::get_tasks,
            tasks::create_task,
            tasks::update_task,
            tasks::toggle_task,
            tasks::delete_task,
            tasks::clear_completed,
            tasks::sync_task_to_todoist,
            config::get_settings,
            config::save_settings,
            config::test_llm_connection,
            config::test_todoist_connection,
            config::get_permissions_status,
            trigger::trigger_quick_capture,
            trigger::extract_from_text,
        ])
        .setup(|app| {
            let handle = app.handle().clone();

            // Setup System Tray Menu
            let quick_capture_i = MenuItem::with_id(app, "quick_capture", "⚡ Quick Capture (Ctrl+Shift+T)", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Open Dashboard", true, None::<&str>)?;
            let settings_i = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit TaskCatch", true, None::<&str>)?;

            let tray_menu = Menu::with_items(
                app,
                &[&quick_capture_i, &show_i, &settings_i, &quit_i],
            )?;

            let _tray = TrayIconBuilder::new()
                .menu(&tray_menu)
                .on_menu_event(move |app, event| {
                    match event.id().as_ref() {
                        "quick_capture" => {
                            let app_clone = app.clone();
                            tauri::async_runtime::spawn(async move {
                                let db = app_clone.state::<Database>();
                                if let Err(e) = trigger::process_and_store_task("", &db, Some(&app_clone)).await {
                                    log::warn!("Tray quick capture error: {}", e);
                                }
                            });
                        }
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "settings" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                                let _ = window.emit("open-settings", ());
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // Register Global Shortcut: Ctrl+Shift+T / Cmd+Shift+T
            let shortcut: Shortcut = "CommandOrControl+Shift+T".parse().map_err(|e| {
                tauri::Error::from(std::io::Error::new(std::io::ErrorKind::Other, format!("Shortcut parse error: {:?}", e)))
            })?;

            let handle_for_shortcut = handle.clone();
            let _ = app.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, event| {
                if event.state() == ShortcutState::Pressed {
                    info!("Global shortcut CommandOrControl+Shift+T triggered!");
                    let app_h = handle_for_shortcut.clone();
                    tauri::async_runtime::spawn(async move {
                        let db = app_h.state::<Database>();
                        if let Ok(raw_text) = services::clipboard::ClipboardService::capture_highlighted_text() {
                            let _ = trigger::process_and_store_task(&raw_text, &db, Some(&app_h)).await;
                        }
                    });
                }
            });

            info!("TaskCatch initialized successfully.");
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("Error while running TaskCatch application");

    app.run(|_app_handle, _event| {});
}
