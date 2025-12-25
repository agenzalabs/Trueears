mod auth;
mod automation;
mod shortcuts;
mod window;
mod installed_apps;

use std::sync::atomic::{AtomicBool, Ordering};
use tauri::Emitter;
use window::ActiveWindowInfo;

// Global state to track if onboarding trigger step is active
pub static ONBOARDING_TRIGGER_ACTIVE: AtomicBool = AtomicBool::new(false);

#[tauri::command]
async fn set_ignore_mouse_events(window: tauri::Window, ignore: bool) -> Result<(), String> {
    window
        .set_ignore_cursor_events(ignore)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_store_value(app: tauri::AppHandle, key: String) -> Result<Option<String>, String> {
    use tauri_plugin_store::StoreExt;
    let store = app.store("settings.json").map_err(|e| e.to_string())?;
    let value = store
        .get(&key)
        .and_then(|v| v.as_str().map(|s| s.to_string()));
    log::info!("get_store_value: key={}, value={:?}", key, value);
    Ok(value)
}

#[tauri::command]
async fn set_store_value(app: tauri::AppHandle, key: String, value: String) -> Result<(), String> {
    use tauri_plugin_store::StoreExt;
    let store = app.store("settings.json").map_err(|e| e.to_string())?;
    store.set(key.clone(), value.clone());
    store.save().map_err(|e| e.to_string())?;
    log::info!("set_store_value: key={}, value={}", key, value);

    // Emit event to all windows
    app.emit("settings-changed", ())
        .map_err(|e| e.to_string())?;
    log::info!("settings-changed event emitted");

    Ok(())
}

#[tauri::command]
async fn transcription_complete(text: String) -> Result<(), String> {
    log::info!("transcription_complete command called");
    automation::paste_text(&text).await?;

    // Wait a bit before hiding the window
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

    Ok(())
}

#[tauri::command]
fn copy_selected_text() -> Result<Option<String>, String> {
    log::info!("copy_selected_text command called");
    automation::copy_selected_text()
}

#[tauri::command]
async fn get_active_window_info() -> Result<Option<ActiveWindowInfo>, String> {
    log::info!("get_active_window_info command called");
    Ok(window::get_active_window_info())
}

#[tauri::command]
async fn set_onboarding_trigger_active(app: tauri::AppHandle, active: bool) -> Result<(), String> {
    log::info!("set_onboarding_trigger_active: {}", active);
    ONBOARDING_TRIGGER_ACTIVE.store(active, Ordering::SeqCst);
    // Broadcast state so frontends can ignore toggle-recording while onboarding step is active
    let _ = app.emit("onboarding-trigger-state", active);
    Ok(())
}

#[tauri::command]
async fn search_installed_apps(query: String) -> Result<Vec<installed_apps::InstalledApp>, String> {
    log::info!("search_installed_apps: query={}", query);
    Ok(installed_apps::search_installed_apps(&query))
}

#[tauri::command]
async fn get_installed_popular_apps() -> Result<Vec<installed_apps::InstalledApp>, String> {
    log::info!("get_installed_popular_apps command called");
    Ok(installed_apps::get_installed_popular_apps())
}

#[tauri::command]
async fn open_settings_window(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::Manager;

    log::info!("open_settings_window command called");

    // Check if settings window already exists
    if let Some(window) = app.get_webview_window("settings") {
        log::info!("Settings window already exists, closing it");
        window.close().map_err(|e| e.to_string())?;
        return Ok(());
    }

    log::info!("Creating new settings window");
    // Create new settings window
    let settings_window = tauri::WebviewWindowBuilder::new(
        &app,
        "settings",
        tauri::WebviewUrl::App("/".into())
    )
    .title("Scribe Settings")
    .inner_size(1200.0, 800.0)
    .min_inner_size(800.0, 600.0)
    .maximized(true)
    .resizable(true)
    .center()
    .visible(false)
    .decorations(true)
    .always_on_top(false)
    .skip_taskbar(false)
    .initialization_script("document.documentElement.style.background = '#f8fafc'; document.body.style.background = '#f8fafc';")
    .build()
    .map_err(|e: tauri::Error| e.to_string())?;

    // Ensure the window is interactive
    settings_window
        .set_ignore_cursor_events(false)
        .map_err(|e| e.to_string())?;

    // Failsafe: Force show window after 2000ms if frontend hasn't done it
    let window_clone = settings_window.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(tokio::time::Duration::from_millis(2000)).await;
        let _ = window_clone.show();
        let _ = window_clone.set_focus();
    });

    log::info!("Settings window created (hidden), scheduled backup show");

    Ok(())
}

// ============ Authentication Commands ============

#[tauri::command]
async fn start_google_login(app: tauri::AppHandle) -> Result<(), String> {
    log::info!("start_google_login command called");

    // Load config from environment
    let config = auth::OAuthConfig::from_env()
        .ok_or_else(|| "Missing GOOGLE_CLIENT_ID environment variable".to_string())?;

    auth::start_google_oauth(app, config).await
}

#[tauri::command]
async fn get_auth_state() -> Result<auth::AuthState, String> {
    log::info!("get_auth_state command called");
    Ok(auth::get_auth_state())
}

#[tauri::command]
async fn logout() -> Result<(), String> {
    log::info!("logout command called");

    let api_url = std::env::var("API_URL").unwrap_or_else(|_| "http://localhost:3001".to_string());

    auth::logout(&api_url).await
}

#[tauri::command]
async fn get_user_info() -> Result<Option<auth::UserInfo>, String> {
    log::info!("get_user_info command called");
    Ok(auth::get_stored_user_info())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            use tauri::Manager;
            use tauri_plugin_store::StoreExt;

            // Load .env file from project root
            if let Err(e) = dotenvy::dotenv() {
                log::warn!("No .env file found: {}", e);
            } else {
                log::info!("Loaded .env file");
            }

            // Migrate any legacy auth storage to the consolidated path
            auth::migrate_legacy_auth_file();

            // Initialize installed apps cache in background
            installed_apps::init_cache();

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;

                // Open DevTools automatically in dev mode
                if let Some(window) = app.get_webview_window("main") {
                    window.open_devtools();
                    log::info!("DevTools opened for main window");
                }
            }

            // Resize main window to span all monitors
            // Add padding to account for Windows display scaling issues
            if let Some(window) = app.get_webview_window("main") {
                let monitors = window.available_monitors().unwrap_or_default();
                if !monitors.is_empty() {
                    let mut min_x = i32::MAX;
                    let mut min_y = i32::MAX;
                    let mut max_x = i32::MIN;
                    let mut max_y = i32::MIN;

                    for monitor in &monitors {
                        let pos = monitor.position();
                        let size = monitor.size();
                        min_x = min_x.min(pos.x);
                        min_y = min_y.min(pos.y);
                        max_x = max_x.max(pos.x + size.width as i32);
                        max_y = max_y.max(pos.y + size.height as i32);
                    }

                    // Get maximum scale factor across all monitors to account for DPI scaling
                    let max_scale_factor = monitors
                        .iter()
                        .map(|m| m.scale_factor())
                        .fold(1.0_f64, |a, b| a.max(b));

                    // Add generous padding to ensure full coverage on all devices
                    // 200px base padding scaled by DPI should cover any edge cases
                    let padding = (200.0 * max_scale_factor) as i32;
                    min_x -= padding;
                    min_y -= padding;
                    max_x += padding;
                    max_y += padding;

                    let total_width = (max_x - min_x) as u32;
                    let total_height = (max_y - min_y) as u32;

                    log::info!(
                        "Setting main window to span all monitors: pos=({}, {}), size={}x{}, scale={}",
                        min_x,
                        min_y,
                        total_width,
                        total_height,
                        max_scale_factor
                    );

                    let _ = window.set_position(tauri::PhysicalPosition::new(min_x, min_y));
                    let _ = window.set_size(tauri::PhysicalSize::new(total_width, total_height));
                }
            }

            // Register global shortcuts
            shortcuts::register_shortcuts(&app.handle())?;

            // First-run onboarding: auto-open settings if no API key is configured
            let store = app.store("settings.json").map_err(|e| e.to_string())?;
            let has_groq_key = store
                .get("GROQ_API_KEY")
                .and_then(|v| v.as_str().map(|s| s.to_string()))
                .map(|s| !s.is_empty())
                .unwrap_or(false);
            let onboarding_complete = store
                .get("SCRIBE_ONBOARDING_COMPLETE")
                .and_then(|v| v.as_str().map(|s| s.to_string()))
                .map(|s| s == "true")
                .unwrap_or(false);

            if !onboarding_complete {
                log::info!("First run detected: onboarding not complete. Opening settings.");
                let app_handle = app.handle().clone();
                // Spawn async task to open settings window after a short delay
                tauri::async_runtime::spawn(async move {
                    // Small delay to ensure main window is ready
                    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
                    if let Err(e) = open_settings_window(app_handle).await {
                        log::error!("Failed to auto-open settings: {}", e);
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            set_ignore_mouse_events,
            transcription_complete,
            copy_selected_text,
            get_active_window_info,
            open_settings_window,
            get_store_value,
            set_store_value,
            set_onboarding_trigger_active,
            search_installed_apps,
            get_installed_popular_apps,
            // Auth commands
            start_google_login,
            get_auth_state,
            logout,
            get_user_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
