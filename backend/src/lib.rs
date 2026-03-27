mod auth;
mod automation;
mod error;
mod installed_apps;
#[cfg(target_os = "linux")]
mod linux_portal_shortcuts;
#[cfg(target_os = "linux")]
mod linux_remote_desktop;
mod log_mode;
mod shortcuts;
mod window;

pub use error::AppError;

use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{Emitter, Manager};
use window::ActiveWindowInfo;

#[derive(serde::Serialize)]
struct CursorPosition {
    x: i32,
    y: i32,
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct SettingsChangedPayload {
    keys: Vec<String>,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct SettingsSnapshot {
    groq_api_key: Option<String>,
    groq_model: Option<String>,
    llm_enabled: Option<String>,
    llm_api_key: Option<String>,
    llm_model: Option<String>,
    default_system_prompt: Option<String>,
    onboarding_complete: Option<String>,
    theme: Option<String>,
    language: Option<String>,
    auto_detect_language: Option<String>,
    recording_mode: Option<String>,
    microphone_id: Option<String>,
}

// Global state to track if onboarding trigger step is active
pub static ONBOARDING_TRIGGER_ACTIVE: AtomicBool = AtomicBool::new(false);

#[cfg(target_os = "linux")]
fn configure_linux_webview_media(window: &tauri::WebviewWindow) {
    use webkit2gtk::glib::ObjectExt;
    use webkit2gtk::{
        DeviceInfoPermissionRequest, PermissionRequest, PermissionRequestExt, SettingsExt,
        UserMediaPermissionRequest, WebViewExt,
    };

    let window_label = window.label().to_string();
    let label_for_setup = window_label.clone();
    if let Err(err) = window.with_webview(move |webview| {
        let webview = webview.inner();

        if let Some(settings) = webview.settings() {
            settings.set_enable_media_stream(true);
            log::info!(
                "Enabled WebKit media stream for Linux window '{}'",
                label_for_setup
            );
        } else {
            log::warn!(
                "WebKit settings unavailable while configuring media stream for '{}'",
                label_for_setup
            );
        }

        let permission_window_label = label_for_setup.clone();
        webview.connect_permission_request(move |_view, request: &PermissionRequest| {
            if request.is::<UserMediaPermissionRequest>()
                || request.is::<DeviceInfoPermissionRequest>()
            {
                log::info!(
                    "Allowing Linux media permission request for '{}'",
                    permission_window_label
                );
                request.allow();
                return true;
            }

            false
        });
    }) {
        log::error!(
            "Failed to configure Linux webview media permissions for '{}': {}",
            window_label,
            err
        );
    }
}

#[cfg(not(target_os = "linux"))]
fn configure_linux_webview_media(_window: &tauri::WebviewWindow) {}

#[cfg(target_os = "linux")]
fn is_linux_wayland_session() -> bool {
    matches!(
        std::env::var("XDG_SESSION_TYPE"),
        Ok(value) if value.eq_ignore_ascii_case("wayland")
    ) || std::env::var_os("WAYLAND_DISPLAY").is_some()
}

#[cfg(not(target_os = "linux"))]
fn is_linux_wayland_session() -> bool {
    false
}

#[cfg(target_os = "linux")]
fn configure_wayland_overlay_panel(window: &tauri::WebviewWindow) {
    let _ = window.set_size(tauri::PhysicalSize::new(560_u32, 220_u32));
    let _ = window.center();
    // Keep the Linux overlay visible without taking text focus away from the
    // currently selected field. Wayland input insertion targets the focused app.
    let _ = window.set_focusable(false);
}

#[cfg(not(target_os = "linux"))]
fn configure_wayland_overlay_panel(_window: &tauri::WebviewWindow) {}

fn load_env_with_workspace_fallback() {
    // Load shared workspace env first, overriding stale exported shell values.
    // This keeps local dev deterministic when multiple services share JWT/API vars.
    match dotenvy::from_filename_override("../.env") {
        Ok(path) => log::info!("Loaded workspace env from {:?}", path),
        Err(e) => log::debug!("Workspace env not loaded: {}", e),
    }

    // Then load backend-local env only for missing values.
    match dotenvy::from_filename(".env") {
        Ok(path) => log::info!("Loaded backend env fallback from {:?}", path),
        Err(e) => log::debug!("Backend env fallback not loaded: {}", e),
    }
}

fn is_sensitive_store_key(key: &str) -> bool {
    let k = key.to_ascii_uppercase();
    k.contains("KEY") || k.contains("TOKEN") || k.contains("SECRET") || k.contains("PASSWORD")
}

fn read_store_value_sync(app: &tauri::AppHandle, key: &str) -> Result<Option<String>, AppError> {
    use tauri_plugin_store::StoreExt;

    let store = app.store("settings.json").map_err(|e| e.to_string())?;
    Ok(store
        .get(key)
        .and_then(|v| v.as_str().map(|s| s.to_string())))
}

fn write_store_value_sync(app: &tauri::AppHandle, key: &str, value: &str) -> Result<(), AppError> {
    use tauri_plugin_store::StoreExt;

    let store = app.store("settings.json").map_err(|e| e.to_string())?;
    store.set(key.to_string(), value.to_string());
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

fn get_settings_snapshot_sync(app: &tauri::AppHandle) -> Result<SettingsSnapshot, AppError> {
    use tauri_plugin_store::StoreExt;

    let store = app.store("settings.json").map_err(|e| e.to_string())?;
    let read = |key: &str| {
        store
            .get(key)
            .and_then(|v| v.as_str().map(|s| s.to_string()))
    };

    Ok(SettingsSnapshot {
        groq_api_key: read("GROQ_API_KEY"),
        groq_model: read("GROQ_MODEL"),
        llm_enabled: read("Trueears_LLM_ENABLED"),
        llm_api_key: read("Trueears_LLM_API_KEY"),
        llm_model: read("Trueears_LLM_MODEL"),
        default_system_prompt: read("Trueears_DEFAULT_SYSTEM_PROMPT"),
        onboarding_complete: read("Trueears_ONBOARDING_COMPLETE"),
        theme: read("Trueears_THEME"),
        language: read("Trueears_LANGUAGE"),
        auto_detect_language: read("Trueears_AUTO_DETECT_LANGUAGE"),
        recording_mode: read("Trueears_RECORDING_MODE"),
        microphone_id: read("Trueears_MICROPHONE_ID"),
    })
}

fn read_onboarding_complete_sync(app: &tauri::AppHandle) -> Result<bool, AppError> {
    Ok(read_store_value_sync(app, "Trueears_ONBOARDING_COMPLETE")?
        .map(|value| value == "true")
        .unwrap_or(false))
}

#[tauri::command]
async fn set_ignore_mouse_events(window: tauri::Window, ignore: bool) -> Result<(), AppError> {
    #[cfg(target_os = "linux")]
    {
        // tao/wry on Linux can panic when enabling cursor-ignore before the
        // GTK window surface is ready. Keep Linux stable by skipping this call.
        if ignore {
            log::debug!("Skipping set_ignore_cursor_events(true) on Linux");
            return Ok(());
        }
    }

    window
        .set_ignore_cursor_events(ignore)
        .map_err(AppError::from)
}

#[tauri::command]
async fn get_store_value(app: tauri::AppHandle, key: String) -> Result<Option<String>, AppError> {
    let key_for_read = key.clone();
    let value =
        tauri::async_runtime::spawn_blocking(move || read_store_value_sync(&app, &key_for_read))
            .await
            .map_err(|e| format!("get_store_value worker failed: {}", e))??;

    if is_sensitive_store_key(&key) {
        let len = value.as_ref().map(|v| v.len()).unwrap_or(0);
        log::info!("get_store_value: key={}, value=<redacted len={}>", key, len);
    } else {
        log::info!("get_store_value: key={}, value={:?}", key, value);
    }
    Ok(value)
}

#[tauri::command]
async fn set_store_value(
    app: tauri::AppHandle,
    key: String,
    value: String,
) -> Result<(), AppError> {
    let app_for_write = app.clone();
    let key_for_write = key.clone();
    let value_for_write = value.clone();
    tauri::async_runtime::spawn_blocking(move || {
        write_store_value_sync(&app_for_write, &key_for_write, &value_for_write)
    })
    .await
    .map_err(|e| format!("set_store_value worker failed: {}", e))??;

    if is_sensitive_store_key(&key) {
        log::info!(
            "set_store_value: key={}, value=<redacted len={}>",
            key,
            value.len()
        );
    } else {
        log::info!("set_store_value: key={}, value={}", key, value);
    }

    // Emit event to all windows
    app.emit(
        "settings-changed",
        SettingsChangedPayload {
            keys: vec![key.clone()],
        },
    )
    .map_err(|e| e.to_string())?;
    log::info!("settings-changed event emitted");

    Ok(())
}

#[tauri::command]
async fn get_settings_snapshot(app: tauri::AppHandle) -> Result<SettingsSnapshot, AppError> {
    tauri::async_runtime::spawn_blocking(move || get_settings_snapshot_sync(&app))
        .await
        .map_err(|e| format!("get_settings_snapshot worker failed: {}", e))?
}

#[tauri::command]
async fn transcription_complete(app: tauri::AppHandle, text: String) -> Result<(), AppError> {
    log::info!("transcription_complete command called");
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
        tokio::time::sleep(tokio::time::Duration::from_millis(90)).await;
    }

    let app_for_paste = app.clone();
    let text_for_paste = text.clone();
    let outcome = tauri::async_runtime::spawn_blocking(move || {
        automation::paste_text(&app_for_paste, &text_for_paste)
    })
    .await
    .map_err(|e| format!("paste worker failed: {}", e))??;

    if let automation::PasteOutcome::ClipboardFallback { message } = outcome {
        let _ = app.emit("show-warning", message);
    }

    // Wait a bit before hiding the window
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

    Ok(())
}

#[tauri::command]
async fn copy_selected_text() -> Result<Option<String>, AppError> {
    log::info!("copy_selected_text command called");
    tauri::async_runtime::spawn_blocking(automation::copy_selected_text)
        .await
        .map_err(|e| format!("copy_selected_text worker failed: {}", e))?
}

#[tauri::command]
async fn get_active_window_info() -> Result<Option<ActiveWindowInfo>, AppError> {
    log::info!("get_active_window_info command called");
    Ok(tauri::async_runtime::spawn_blocking(window::get_active_window_info).await?)
}

#[tauri::command]
async fn get_cursor_position() -> Result<CursorPosition, AppError> {
    tauri::async_runtime::spawn_blocking(window::get_cursor_position)
        .await?
        .map(|(x, y)| CursorPosition { x, y })
        .ok_or_else(|| AppError::from("Failed to get cursor position"))
}

#[tauri::command]
async fn set_onboarding_trigger_active(
    app: tauri::AppHandle,
    active: bool,
) -> Result<(), AppError> {
    log::info!("set_onboarding_trigger_active: {}", active);
    ONBOARDING_TRIGGER_ACTIVE.store(active, Ordering::SeqCst);
    // Broadcast state so frontends can ignore toggle-recording while onboarding step is active
    let _ = app.emit("onboarding-trigger-state", active);
    Ok(())
}

#[tauri::command]
fn register_escape_shortcut(app: tauri::AppHandle) -> Result<(), AppError> {
    shortcuts::register_escape_shortcut(&app).map_err(|e| AppError::Generic(e.to_string()))
}

#[tauri::command]
fn unregister_escape_shortcut(app: tauri::AppHandle) -> Result<(), AppError> {
    shortcuts::unregister_escape_shortcut(&app).map_err(|e| AppError::Generic(e.to_string()))
}

#[tauri::command]
async fn search_installed_apps(
    query: String,
) -> Result<Vec<installed_apps::InstalledApp>, AppError> {
    log::info!("search_installed_apps: query={}", query);
    Ok(
        tauri::async_runtime::spawn_blocking(move || installed_apps::search_installed_apps(&query))
            .await?,
    )
}

#[tauri::command]
async fn refresh_installed_apps_cache() -> Result<(), AppError> {
    log::info!("refresh_installed_apps_cache called");
    tauri::async_runtime::spawn_blocking(installed_apps::force_refresh_cache)
        .await
        .map_err(|e| format!("refresh_installed_apps_cache worker failed: {}", e))?;
    Ok(())
}

#[tauri::command]
async fn get_installed_popular_apps() -> Result<Vec<installed_apps::InstalledApp>, AppError> {
    log::info!("get_installed_popular_apps command called");
    Ok(tauri::async_runtime::spawn_blocking(installed_apps::get_installed_popular_apps).await?)
}

#[tauri::command]
async fn open_settings_window(app: tauri::AppHandle) -> Result<(), AppError> {
    use tauri::Manager;

    log::info!("open_settings_window command called");

    // Check if settings window already exists
    if let Some(window) = app.get_webview_window("settings") {
        log::info!("Settings window already exists, closing it");
        window.close()?;
        return Ok(());
    }

    log::info!("Creating new settings window");
    // Create new settings window
    let settings_window = tauri::WebviewWindowBuilder::new(
        &app,
        "settings",
        tauri::WebviewUrl::App("/".into())
    )
    .title("Trueears Settings")
    .inner_size(1200.0, 800.0)
    .min_inner_size(800.0, 600.0)
    .maximized(true)
    .resizable(true)
    .center()
    .visible(false)
    .decorations(true)
    .always_on_top(false)
    .skip_taskbar(false)
    .transparent(false)
    .initialization_script("document.documentElement.style.background = '#f8fafc'; document.body.style.background = '#f8fafc';")
    .build()?;

    configure_linux_webview_media(&settings_window);

    // Ensure the window is interactive
    settings_window.set_ignore_cursor_events(false)?;

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
async fn start_google_login(app: tauri::AppHandle) -> Result<(), AppError> {
    log::info!("start_google_login command called");

    // Load config from environment
    let config =
        auth::OAuthConfig::from_env().ok_or("Missing GOOGLE_CLIENT_ID environment variable")?;

    auth::start_google_oauth(app, config).await
}

#[tauri::command]
async fn get_auth_state(app: tauri::AppHandle) -> Result<auth::AuthState, AppError> {
    log::info!("get_auth_state command called");
    let app_handle = app.clone();
    Ok(tauri::async_runtime::spawn_blocking(move || auth::get_auth_state(&app_handle)).await?)
}

#[tauri::command]
async fn logout(app: tauri::AppHandle) -> Result<(), AppError> {
    log::info!("logout command called");

    let api_url = std::env::var("API_URL")
        .unwrap_or_else(|_| "https://trueears-backend.vercel.app".to_string());

    auth::logout(&app, &api_url).await
}

#[tauri::command]
async fn get_user_info(app: tauri::AppHandle) -> Result<Option<auth::UserInfo>, AppError> {
    log::info!("get_user_info command called");
    let app_handle = app.clone();
    Ok(
        tauri::async_runtime::spawn_blocking(move || auth::get_stored_user_info(&app_handle))
            .await?,
    )
}

#[tauri::command]
async fn get_access_token(app: tauri::AppHandle) -> Result<Option<String>, AppError> {
    log::info!("get_access_token command called");
    let app_handle = app.clone();
    Ok(tauri::async_runtime::spawn_blocking(move || auth::get_access_token(&app_handle)).await?)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            use tauri::Manager;

            load_env_with_workspace_fallback();

            // Migrate any legacy auth storage to the consolidated path
            auth::migrate_legacy_auth_file(app.handle());

            // Initialize installed apps cache in background
            installed_apps::init_cache();

            // Always enable logging (logs to file in AppData/com.Trueears/logs)
            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(log::LevelFilter::Info)
                    .target(tauri_plugin_log::Target::new(
                        tauri_plugin_log::TargetKind::LogDir { file_name: Some("Trueears.log".into()) }
                    ))
                    .build(),
            )?;
            log::info!("=== Trueears Application Started ===");

            // Open DevTools (temporarily enabled for debugging)
            // if let Some(window) = app.get_webview_window("main") {
            //     window.open_devtools();
            //     log::info!("DevTools opened for main window");
            // }

            // Resize main window to span all monitors
            // Add padding to account for Windows display scaling issues
            if let Some(window) = app.get_webview_window("main") {
                configure_linux_webview_media(&window);

                if is_linux_wayland_session() {
                    log::info!("Configuring main window for Linux Wayland panel overlay");
                    configure_wayland_overlay_panel(&window);
                } else {
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

                        let max_scale_factor = monitors
                            .iter()
                            .map(|m| m.scale_factor())
                            .fold(1.0_f64, |a, b| a.max(b));

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
            }

            // Register global shortcuts
            shortcuts::register_shortcuts(app.handle())?;

            let force_open_settings_on_start = std::env::var("TRUEEARS_OPEN_SETTINGS_ON_START")
                .map(|v| {
                    let value = v.trim().to_ascii_lowercase();
                    value == "1" || value == "true" || value == "yes" || value == "on"
                })
                .unwrap_or(false);

            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let app_for_read = app_handle.clone();
                let onboarding_complete = match tauri::async_runtime::spawn_blocking(move || {
                    read_onboarding_complete_sync(&app_for_read)
                })
                .await
                {
                    Ok(Ok(value)) => value,
                    Ok(Err(err)) => {
                        log::error!("Failed to read onboarding status: {}", err);
                        false
                    }
                    Err(err) => {
                        log::error!("Onboarding status worker failed: {}", err);
                        false
                    }
                };

                if !onboarding_complete || force_open_settings_on_start {
                    if force_open_settings_on_start {
                        log::info!("TRUEEARS_OPEN_SETTINGS_ON_START enabled. Opening settings.");
                    } else {
                        log::info!("First run detected: onboarding not complete. Opening settings.");
                    }

                    // Small delay to ensure main window is ready
                    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
                    if let Err(e) = open_settings_window(app_handle).await {
                        log::error!("Failed to auto-open settings: {}", e);
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            set_ignore_mouse_events,
            transcription_complete,
            copy_selected_text,
            get_active_window_info,
            get_cursor_position,
            open_settings_window,
            get_store_value,
            set_store_value,
            get_settings_snapshot,
            set_onboarding_trigger_active,
            register_escape_shortcut,
            unregister_escape_shortcut,
            search_installed_apps,
            refresh_installed_apps_cache,
            get_installed_popular_apps,
            // Auth commands
            start_google_login,
            get_auth_state,
            logout,
            get_user_info,
            get_access_token,
            // Log Mode commands
            log_mode::append_to_file,
            log_mode::validate_log_path,
            log_mode::get_default_log_directory,
            log_mode::open_log_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
