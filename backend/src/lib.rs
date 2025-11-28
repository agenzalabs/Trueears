mod automation;
mod shortcuts;
mod window;

use window::ActiveWindowInfo;
use tauri::Emitter;

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
    let value = store.get(&key).and_then(|v| v.as_str().map(|s| s.to_string()));
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
    app.emit("settings-changed", ()).map_err(|e| e.to_string())?;
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
async fn get_active_window_info() -> Result<Option<ActiveWindowInfo>, String> {
    log::info!("get_active_window_info command called");
    Ok(window::get_active_window_info())
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
    .inner_size(900.0, 600.0)
    .min_inner_size(800.0, 500.0)
    .maximized(true)
    .resizable(true)
    .center()
    .visible(true)
    .decorations(true)
    .always_on_top(false)
    .skip_taskbar(false)
    .build()
    .map_err(|e| e.to_string())?;
    
    // Ensure the window is interactive and focused
    settings_window.set_ignore_cursor_events(false).map_err(|e| e.to_string())?;
    settings_window.set_focus().map_err(|e| e.to_string())?;
    log::info!("Settings window created, shown, and focused");
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            use tauri::Manager;
            use tauri_plugin_store::StoreExt;
            
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

            // Register global shortcuts
            shortcuts::register_shortcuts(&app.handle())?;

            // First-run onboarding: auto-open settings if no API key is configured
            let store = app.store("settings.json").map_err(|e| e.to_string())?;
            let has_groq_key = store.get("GROQ_API_KEY")
                .and_then(|v| v.as_str().map(|s| s.to_string()))
                .map(|s| !s.is_empty())
                .unwrap_or(false);
            let onboarding_complete = store.get("SCRIBE_ONBOARDING_COMPLETE")
                .and_then(|v| v.as_str().map(|s| s.to_string()))
                .map(|s| s == "true")
                .unwrap_or(false);
            
            if !has_groq_key && !onboarding_complete {
                log::info!("First run detected: no API key and onboarding not complete. Opening settings.");
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
            get_active_window_info,
            open_settings_window,
            get_store_value,
            set_store_value
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
