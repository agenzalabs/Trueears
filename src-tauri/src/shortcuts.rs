use crate::window::is_valid_active_window;
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
                    // Check if active window is valid (Windows-specific check)
                    if !is_valid_active_window() {
                        log::warn!("No valid active window detected");
                        let _ = window.emit("show-warning", "Please select a text box first");
                        let _ = window.show();
                        let _ = window.set_focus();
                        return;
                    }

                    log::info!("Emitting toggle-recording event");
                    let _ = window.emit("toggle-recording", ());
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
                log::info!("Settings shortcut pressed");

                if let Some(window) = app_handle.get_webview_window("main") {
                    log::info!("Emitting open-settings event");
                    let _ = window.emit("open-settings", ());
                    let _ = window.show();
                    let _ = window.set_always_on_top(true);
                }
            }
        }
    })?;

    log::info!("Global shortcuts registered successfully");
    Ok(())
}
