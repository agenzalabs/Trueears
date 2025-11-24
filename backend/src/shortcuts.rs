use crate::window::get_active_window_info;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

pub fn register_shortcuts(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // Register Ctrl+Shift+K (or Cmd+Shift+K on macOS) for recording toggle
    let recording_shortcut = if cfg!(target_os = "macos") {
        Shortcut::new(Some(Modifiers::META | Modifiers::SHIFT), Code::KeyK)
    } else {
        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyK)
    };

    app.global_shortcut().on_shortcut(recording_shortcut, {
        let app_handle = app.clone();
        move |_app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                log::info!("Recording shortcut pressed");

                if let Some(window) = app_handle.get_webview_window("main") {
                    // Get active window info
                    let window_info = get_active_window_info();
                    
                    if window_info.is_none() {
                        log::warn!("No valid active window detected");
                        let _ = window.emit("show-warning", "Please select a text box first");
                        let _ = window.show();
                        let _ = window.set_focus();
                        return;
                    }

                    log::info!("Emitting toggle-recording event with window info");
                    let _ = window.emit("toggle-recording", window_info);
                    let _ = window.show();
                    let _ = window.set_always_on_top(true);
                }
            }
        }
    })?;

    // Register Ctrl+Shift+L (or Cmd+Shift+L on macOS) for settings
    let settings_shortcut = if cfg!(target_os = "macos") {
        Shortcut::new(Some(Modifiers::META | Modifiers::SHIFT), Code::KeyL)
    } else {
        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyL)
    };

    app.global_shortcut().on_shortcut(settings_shortcut, {
        let app_handle = app.clone();
        move |_app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                log::info!("Settings shortcut pressed - opening settings window");
                
                // Call open_settings_window command
                let app_clone = app_handle.clone();
                tauri::async_runtime::spawn(async move {
                    if let Err(e) = crate::open_settings_window(app_clone).await {
                        log::error!("Failed to open settings window: {}", e);
                    }
                });
            }
        }
    })?;

    log::info!("Global shortcuts registered successfully");
    Ok(())
}
