mod automation;
mod shortcuts;
mod window;

use window::ActiveWindowInfo;

#[tauri::command]
async fn set_ignore_mouse_events(window: tauri::Window, ignore: bool) -> Result<(), String> {
    window
        .set_ignore_cursor_events(ignore)
        .map_err(|e| e.to_string())
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
        .setup(|app| {
            use tauri::Manager;
            
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

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            set_ignore_mouse_events,
            transcription_complete,
            get_active_window_info,
            open_settings_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
