#[cfg(target_os = "linux")]
use crate::automation::restore_linux_target_window_focus;
use crate::automation::{copy_selected_text, remember_linux_target_window};
use crate::window::{get_active_window_id_for_linux, get_active_window_info};
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

    #[cfg(target_os = "linux")]
    if is_wayland_session() {
        match crate::linux_portal_shortcuts::register_wayland_shortcuts(app) {
            Ok(()) => {
                log::info!("Using Linux portal shortcuts on Wayland");
                return Ok(());
            }
            Err(err) => {
                log::warn!(
                    "Failed to start Linux portal shortcuts on Wayland, falling back to the legacy backend: {}",
                    err
                );
            }
        }
    }

    // Register recording shortcut (Ctrl+Shift+K / Cmd+Shift+K)
    if let Err(e) = register_recording_shortcut(app) {
        log::error!("Failed to register recording shortcut: {}", e);
        log::warn!("Recording shortcut (Ctrl+Shift+K) may be in use by another application");
        // Don't crash - the app can still work, user just needs to close conflicting app
    }

    // Register settings shortcut(s)
    if let Err(e) = register_settings_shortcut(app) {
        log::warn!("Failed to register settings shortcut (non-fatal): {}", e);
        // Don't return error - settings can still be opened from the app
    }

    // NOTE: Escape shortcut is NOT registered at startup to avoid interfering with other apps.
    // It is registered dynamically when the Trueears overlay becomes visible and
    // unregistered when the overlay is hidden. See register_escape_shortcut() and unregister_escape_shortcut().

    log::info!("Global shortcuts registered successfully");
    Ok(())
}

pub fn handle_recording_shortcut_pressed(app_handle: &AppHandle) {
    log::info!("Recording shortcut pressed");

    if ONBOARDING_TRIGGER_ACTIVE.load(Ordering::SeqCst) {
        log::info!("Onboarding trigger active - emitting onboarding-trigger event");
        if let Some(window) = app_handle.get_webview_window("main") {
            let _ = window.emit("onboarding-trigger", ());
        }
        return;
    }

    let is_wayland = is_wayland_session();

    if !is_wayland {
        remember_linux_target_window(get_active_window_id_for_linux());
    }

    let selected_text = if is_wayland {
        log::info!("Skipping selected-text copy on Linux Wayland");
        None
    } else {
        match copy_selected_text() {
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
        }
    };

    let window_info = if is_wayland {
        log::info!("Skipping active-window lookup on Linux Wayland");
        None
    } else {
        get_active_window_info()
    };
    let is_in_settings = window_info
        .as_ref()
        .map(|info| info.window_title.contains("Trueears Settings"))
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
        if window_info.is_none() && !is_in_settings && !is_wayland {
            log::warn!("No valid active window detected");
            let _ = window.emit("show-warning", "Please select a text box first");
            let _ = window.show();
            let _ = window.set_focus();
            return;
        }

        log::info!("Emitting shortcut-pressed event with window info and selected text");

        if let Ok(visible) = window.is_visible() {
            log::info!("Window visible before: {}", visible);
        }
        if let Ok(size) = window.outer_size() {
            log::info!("Window size: {}x{}", size.width, size.height);
        }

        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_always_on_top(true);
        #[cfg(target_os = "linux")]
        {
            if is_wayland {
                let _ = window.set_focusable(false);
                let _ = window.set_size(tauri::PhysicalSize::new(560_u32, 220_u32));
                let _ = window.center();
            } else if restore_linux_target_window_focus() {
                log::info!("Restored Linux target window focus after showing overlay");
            } else {
                log::warn!("Could not restore Linux target window focus after showing overlay");
            }
        }

        let payload = ShortcutPressedPayload {
            window_info,
            selected_text,
        };
        let _ = window.emit("shortcut-pressed", payload);

        if let Ok(visible) = window.is_visible() {
            log::info!("Window visible after: {}", visible);
        }
    }
}

pub fn handle_recording_shortcut_released(app_handle: &AppHandle) {
    log::info!("Recording shortcut released");

    if ONBOARDING_TRIGGER_ACTIVE.load(Ordering::SeqCst) {
        return;
    }

    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.emit("shortcut-released", ());
    }
}

pub fn handle_settings_shortcut_pressed(app_handle: &AppHandle) {
    log::info!("Settings shortcut pressed - opening settings window");

    let app_clone = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(e) = crate::open_settings_window(app_clone).await {
            log::error!("Failed to open settings window: {}", e);
        }
    });
}

fn register_recording_shortcut(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let mut shortcuts: Vec<Shortcut> = Vec::new();

    if cfg!(target_os = "macos") {
        shortcuts.push(Shortcut::new(
            Some(Modifiers::META | Modifiers::SHIFT),
            Code::KeyK,
        ));
    } else {
        shortcuts.push(Shortcut::new(
            Some(Modifiers::CONTROL | Modifiers::SHIFT),
            Code::KeyK,
        ));

        #[cfg(target_os = "linux")]
        {
            shortcuts.push(Shortcut::new(
                Some(Modifiers::CONTROL | Modifiers::SHIFT),
                Code::Semicolon,
            ));
            shortcuts.push(Shortcut::new(
                Some(Modifiers::CONTROL | Modifiers::SHIFT),
                Code::F9,
            ));
        }
    }

    let mut registered_any = false;
    for shortcut in shortcuts {
        match app.global_shortcut().on_shortcut(shortcut, {
            let app_handle = app.clone();
            move |_app, _shortcut, event| {
                if event.state == ShortcutState::Pressed {
                    handle_recording_shortcut_pressed(&app_handle);
                } else if event.state == ShortcutState::Released {
                    handle_recording_shortcut_released(&app_handle);
                }
            }
        }) {
            Ok(()) => {
                registered_any = true;
                log::info!("Registered recording shortcut binding: {:?}", shortcut);
            }
            Err(e) => {
                log::warn!(
                    "Failed to register recording shortcut binding {:?}: {}",
                    shortcut,
                    e
                );
            }
        }
    }

    if !registered_any {
        return Err("No recording shortcut bindings could be registered".into());
    }

    log::info!("Recording shortcut bindings registered");
    Ok(())
}

fn register_settings_shortcut(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let mut shortcuts: Vec<Shortcut> = Vec::new();

    if cfg!(target_os = "macos") {
        shortcuts.push(Shortcut::new(
            Some(Modifiers::META | Modifiers::SHIFT),
            Code::KeyS,
        ));
    } else {
        // Primary binding used on all non-macOS platforms.
        shortcuts.push(Shortcut::new(
            Some(Modifiers::CONTROL | Modifiers::SHIFT),
            Code::KeyS,
        ));

        // Linux fallback: avoid layout/compositor quirks on alpha keys.
        #[cfg(target_os = "linux")]
        {
            shortcuts.push(Shortcut::new(
                Some(Modifiers::CONTROL | Modifiers::SHIFT),
                Code::F10,
            ));
        }
    }

    let mut registered_any = false;
    for shortcut in shortcuts {
        match app.global_shortcut().on_shortcut(shortcut, {
            let app_handle = app.clone();
            move |_app, _shortcut, event| {
                if event.state == ShortcutState::Pressed {
                    handle_settings_shortcut_pressed(&app_handle);
                }
            }
        }) {
            Ok(()) => {
                registered_any = true;
                log::info!("Registered settings shortcut binding: {:?}", shortcut);
            }
            Err(e) => {
                log::warn!(
                    "Failed to register settings shortcut binding {:?}: {}",
                    shortcut,
                    e
                );
            }
        }
    }

    if !registered_any {
        return Err("No settings shortcut bindings could be registered".into());
    }

    log::info!("Settings shortcut bindings registered");
    Ok(())
}

/// Dynamically register the Escape shortcut.
/// Called when the Trueears overlay becomes visible to allow global Escape to cancel recording.
pub fn register_escape_shortcut(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(target_os = "linux")]
    if is_wayland_session() {
        log::info!("Skipping global Escape registration on Linux Wayland");
        return Ok(());
    }

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
                        log::info!(
                            "Escape pressed while window visible - emitting shortcut-cancelled"
                        );
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
/// Called when the Trueears overlay is hidden to allow other apps to use Escape normally.
pub fn unregister_escape_shortcut(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(target_os = "linux")]
    if is_wayland_session() {
        return Ok(());
    }

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

#[cfg(target_os = "linux")]
fn is_wayland_session() -> bool {
    matches!(
        std::env::var("XDG_SESSION_TYPE"),
        Ok(value) if value.eq_ignore_ascii_case("wayland")
    ) || std::env::var_os("WAYLAND_DISPLAY").is_some()
}

#[cfg(not(target_os = "linux"))]
fn is_wayland_session() -> bool {
    false
}
