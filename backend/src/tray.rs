//! System tray icon.
//!
//! Without this the app has no visible presence at all. The overlay window is
//! transparent, hidden, and skips the taskbar; the settings window is created on
//! demand and only auto-opens during onboarding. That left the global shortcut
//! as the only way in, and no way out short of the task manager.

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::AppHandle;

const MENU_OPEN_SETTINGS: &str = "open_settings";
const MENU_QUIT: &str = "quit";

/// Build the tray icon and its menu.
///
/// Failure is not fatal: the app still works through the global shortcut, so a
/// tray that cannot be created is logged rather than aborting startup.
pub fn create(app: &AppHandle) {
    if let Err(e) = try_create(app) {
        log::error!("Failed to create the system tray icon: {}", e);
    }
}

fn try_create(app: &AppHandle) -> tauri::Result<()> {
    let open_settings =
        MenuItem::with_id(app, MENU_OPEN_SETTINGS, "Open Settings", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, MENU_QUIT, "Quit Trueears", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let menu = Menu::with_items(app, &[&open_settings, &separator, &quit])?;

    let mut builder = TrayIconBuilder::with_id("main")
        // The shortcut is the primary way to use the app and easy to forget, so
        // the tooltip carries it.
        .tooltip("Trueears - press Ctrl+Shift+K to dictate")
        .menu(&menu)
        // Left click opens settings; the menu belongs on right click, which is
        // the convention on Windows.
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            MENU_OPEN_SETTINGS => crate::focus_or_open_settings(app),
            MENU_QUIT => {
                log::info!("Quit requested from the tray menu");
                app.exit(0);
            }
            other => log::warn!("Unhandled tray menu item: {}", other),
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                crate::focus_or_open_settings(tray.app_handle());
            }
        });

    match app.default_window_icon() {
        Some(icon) => builder = builder.icon(icon.clone()),
        // The tray would be an invisible, unclickable gap without an icon.
        None => log::warn!("No default window icon available - tray icon will be blank"),
    }

    builder.build(app)?;
    log::info!("System tray icon created");
    Ok(())
}
