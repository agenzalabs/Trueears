use crate::automation::copy_selected_text;
use crate::window::get_active_window_info;
use crate::ONBOARDING_TRIGGER_ACTIVE;
use serde::Serialize;
use std::sync::atomic::Ordering;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

// Store the escape shortcut for dynamic registration/unregistration
fn get_escape_shortcut() -> Shortcut {
    Shortcut::new(None, Code::Escape)
}

#[derive(Clone, Serialize)]
pub struct ShortcutPressedPayload {
    pub window_info: Option<crate::window::ActiveWindowInfo>,
    pub selected_text: Option<String>,
}

pub fn register_shortcuts(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // Unregister all existing shortcuts first to prevent "already registered" errors
    let _ = app.global_shortcut().unregister_all();
    log::info!("Unregistered all existing shortcuts");

    // Register recording shortcut (Ctrl+Shift+K / Cmd+Shift+K)
    if let Err(e) = register_recording_shortcut(app) {
        log::error!("Failed to register recording shortcut: {}", e);
        log::warn!("Recording shortcut (Ctrl+Shift+K) may be in use by another application");
        // Don't crash - the app can still work, user just needs to close conflicting app
    }

    // Register settings shortcut (Ctrl+Shift+; / Cmd+Shift+;)
    // Using semicolon instead of L to avoid conflicts with other apps
    if let Err(e) = register_settings_shortcut(app) {
        log::warn!("Failed to register settings shortcut (non-fatal): {}", e);
        // Don't return error - settings can still be opened from the app
    }

    // NOTE: Escape shortcut is NOT registered at startup to avoid interfering with other apps.
    // It is registered dynamically when the Scribe overlay becomes visible and
    // unregistered when the overlay is hidden. See register_escape_shortcut() and unregister_escape_shortcut().

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

                // IMPORTANT: Copy selected text IMMEDIATELY before any window operations
                // This must happen before focus shifts to the Scribe window
                let selected_text = match copy_selected_text() {
                    Ok(text) => {
                        if let Some(ref t) = text {
                            log::info!("Copied selected text: {} chars", t.len());
                        } else {
                            log::info!("No text selected");
                        }
                        text
                    }
                    Err(e) => {
                        log::warn!("Failed to copy selected text: {}", e);
                        None
                    }
                };

                // Get active window info
                let window_info = get_active_window_info();

                // Close settings window only if user is NOT in the Settings window
                // Check by window title to avoid focus detection issues with global hotkeys
                let is_in_settings = window_info
                    .as_ref()
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

                    log::info!("Emitting shortcut-pressed event with window info and selected text");

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

                    // Emit shortcut-pressed event with both window info and selected text
                    let payload = ShortcutPressedPayload {
                        window_info,
                        selected_text,
                    };
                    let _ = window.emit("shortcut-pressed", payload);

                    // Debug: log window state after show
                    if let Ok(visible) = window.is_visible() {
                        log::info!("Window visible after: {}", visible);
                    }
                }
            } else if event.state == ShortcutState::Released {
                log::info!("Recording shortcut released");
                
                // Skip during onboarding
                if ONBOARDING_TRIGGER_ACTIVE.load(Ordering::SeqCst) {
                    return;
                }

                if let Some(window) = app_handle.get_webview_window("main") {
                    let _ = window.emit("shortcut-released", ());
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

/// Dynamically register the Escape shortcut.
/// Called when the Scribe overlay becomes visible to allow global Escape to cancel recording.
pub fn register_escape_shortcut(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let escape_shortcut = get_escape_shortcut();

    // Check if already registered to avoid duplicate registration
    if app.global_shortcut().is_registered(escape_shortcut) {
        log::debug!("Escape shortcut already registered, skipping");
        return Ok(());
    }

    app.global_shortcut().on_shortcut(escape_shortcut, {
        let app_handle = app.clone();
        move |_app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                if let Some(window) = app_handle.get_webview_window("main") {
                    // Only emit if window is visible
                    if let Ok(true) = window.is_visible() {
                        log::info!("Escape pressed while window visible - emitting shortcut-cancelled");
                        let _ = window.emit("shortcut-cancelled", ());
                    }
                }
            }
        }
    })?;

    log::info!("Escape shortcut dynamically registered");
    Ok(())
}

/// Dynamically unregister the Escape shortcut.
/// Called when the Scribe overlay is hidden to allow other apps to use Escape normally.
pub fn unregister_escape_shortcut(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let escape_shortcut = get_escape_shortcut();

    // Only unregister if it's currently registered
    if !app.global_shortcut().is_registered(escape_shortcut) {
        log::debug!("Escape shortcut not registered, skipping unregister");
        return Ok(());
    }

    app.global_shortcut().unregister(escape_shortcut)?;
    log::info!("Escape shortcut dynamically unregistered");
    Ok(())
}
