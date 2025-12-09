use crate::window::get_active_window_info;
use crate::ONBOARDING_TRIGGER_ACTIVE;
use std::sync::atomic::Ordering;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

pub fn register_shortcuts(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // Unregister all existing shortcuts first to prevent "already registered" errors
    let _ = app.global_shortcut().unregister_all();
    log::info!("Unregistered all existing shortcuts");
    
    // Register recording shortcut (Ctrl+Shift+K / Cmd+Shift+K)
    if let Err(e) = register_recording_shortcut(app) {
        log::error!("Failed to register recording shortcut: {}", e);
        return Err(e);
    }
    
    // Register settings shortcut (Ctrl+Shift+; / Cmd+Shift+;)
    // Using semicolon instead of L to avoid conflicts with other apps
    if let Err(e) = register_settings_shortcut(app) {
        log::warn!("Failed to register settings shortcut (non-fatal): {}", e);
        // Don't return error - settings can still be opened from the app
    }

    log::info!("Global shortcuts registered successfully");
    Ok(())
}

fn register_recording_shortcut(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
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

                // Skip normal toggle behavior during onboarding but still notify frontend
                if ONBOARDING_TRIGGER_ACTIVE.load(Ordering::SeqCst) {
                    log::info!("Onboarding trigger active - emitting onboarding-trigger event");
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.emit("onboarding-trigger", ());
                    }
                    return;
                }

                // Get active window info first
                let window_info = get_active_window_info();
                
                // Close settings window only if user is NOT in the Settings window
                // Check by window title to avoid focus detection issues with global hotkeys
                let is_in_settings = window_info.as_ref()
                    .map(|info| info.window_title.contains("Scribe Settings"))
                    .unwrap_or(false);
                
                if let Some(settings_window) = app_handle.get_webview_window("settings") {
                    if !is_in_settings {
                        log::info!("Closing settings window - user is in another app");
                        let _ = settings_window.close();
                    } else {
                        log::info!("Keeping settings window open - user is dictating into it");
                    }
                }

                if let Some(window) = app_handle.get_webview_window("main") {
                    // Skip if user is in Settings (let them dictate into it)
                    // but still need valid window info
                    if window_info.is_none() && !is_in_settings {
                        log::warn!("No valid active window detected");
                        let _ = window.emit("show-warning", "Please select a text box first");
                        let _ = window.show();
                        let _ = window.set_focus();
                        return;
                    }

                    log::info!("Emitting toggle-recording event with window info");
                    
                    // Debug: log window state before show
                    if let Ok(visible) = window.is_visible() {
                        log::info!("Window visible before: {}", visible);
                    }
                    if let Ok(size) = window.outer_size() {
                        log::info!("Window size: {}x{}", size.width, size.height);
                    }
                    
                    // Ensure window is visible
                    let _ = window.unminimize();
                    let _ = window.show();
                    let _ = window.set_always_on_top(true);
                    
                    // Emit event after window is shown
                    let _ = window.emit("toggle-recording", window_info);
                    
                    // Debug: log window state after show
                    if let Ok(visible) = window.is_visible() {
                        log::info!("Window visible after: {}", visible);
                    }
                }
            }
        }
    })?;

    log::info!("Recording shortcut (Ctrl+Shift+K) registered");
    Ok(())
}

fn register_settings_shortcut(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // Using S key for Settings shortcut
    let settings_shortcut = if cfg!(target_os = "macos") {
        Shortcut::new(Some(Modifiers::META | Modifiers::SHIFT), Code::KeyS)
    } else {
        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyS)
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

    log::info!("Settings shortcut (Ctrl+Shift+S) registered");
    Ok(())
}
