#[cfg(target_os = "windows")]
mod windows_impl;

#[cfg(target_os = "windows")]
pub use windows_impl::*;

#[cfg(any(
    target_os = "linux",
    all(not(target_os = "windows"), not(target_os = "linux"))
))]
use serde::{Deserialize, Serialize};

#[cfg(any(
    target_os = "linux",
    all(not(target_os = "windows"), not(target_os = "linux"))
))]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledApp {
    pub name: String,
    pub executable: String,
    pub category: String,
    pub icon_base64: Option<String>,
}

#[cfg(target_os = "linux")]
pub fn init_cache<R: tauri::Runtime>(_app: &tauri::AppHandle<R>) {
    log::info!("initialized Linux installed_apps detector");
}

#[cfg(target_os = "linux")]
pub fn force_refresh_cache<R: tauri::Runtime>(_app: &tauri::AppHandle<R>) {
    log::info!("installed_apps Linux cache refresh requested (on-demand scan)");
}

#[cfg(target_os = "linux")]
pub fn get_installed_popular_apps() -> Vec<InstalledApp> {
    detect_linux_popular_apps()
}

#[cfg(target_os = "linux")]
pub fn search_installed_apps(query: &str) -> Vec<InstalledApp> {
    let query_lower = query.trim().to_lowercase();
    if query_lower.is_empty() {
        return get_installed_popular_apps();
    }

    get_installed_popular_apps()
        .into_iter()
        .filter(|app| {
            app.name.to_lowercase().contains(&query_lower)
                || app.executable.to_lowercase().contains(&query_lower)
                || app.category.to_lowercase().contains(&query_lower)
        })
        .collect()
}

#[cfg(target_os = "linux")]
fn detect_linux_popular_apps() -> Vec<InstalledApp> {
    // Display name, category, candidate binary names (first hit wins).
    let definitions: [(&str, &str, &[&str]); 23] = [
        (
            "Google Chrome",
            "browser",
            &["google-chrome", "google-chrome-stable", "chrome"],
        ),
        ("Chromium", "browser", &["chromium", "chromium-browser"]),
        ("Mozilla Firefox", "browser", &["firefox"]),
        (
            "Microsoft Edge",
            "browser",
            &["microsoft-edge", "microsoft-edge-stable"],
        ),
        ("Brave Browser", "browser", &["brave-browser", "brave"]),
        ("Vivaldi", "browser", &["vivaldi", "vivaldi-stable"]),
        ("Visual Studio Code", "code", &["code"]),
        ("VSCodium", "code", &["codium"]),
        ("Cursor", "code", &["cursor"]),
        ("Zed", "code", &["zed"]),
        ("Sublime Text", "code", &["subl"]),
        (
            "IntelliJ IDEA",
            "code",
            &["idea", "idea-ultimate", "idea-community"],
        ),
        (
            "PyCharm",
            "code",
            &["pycharm", "pycharm-community", "pycharm-professional"],
        ),
        ("Slack", "chat", &["slack"]),
        ("Discord", "chat", &["discord"]),
        ("Telegram", "chat", &["telegram-desktop", "telegram"]),
        ("Teams", "chat", &["teams-for-linux", "teams"]),
        ("Thunderbird", "email", &["thunderbird"]),
        ("Notion", "notes", &["notion-app", "notion"]),
        ("Obsidian", "notes", &["obsidian"]),
        ("LibreOffice Writer", "office", &["libreoffice", "lowriter"]),
        ("Postman", "dev", &["postman"]),
        ("Spotify", "media", &["spotify"]),
    ];

    let mut apps = Vec::new();
    for (name, category, candidates) in definitions {
        if let Some(binary_name) = find_first_binary_in_path(candidates) {
            apps.push(InstalledApp {
                name: name.to_string(),
                executable: binary_name,
                category: category.to_string(),
                icon_base64: None,
            });
        }
    }

    apps
}

#[cfg(target_os = "linux")]
fn find_first_binary_in_path(candidates: &[&str]) -> Option<String> {
    use std::os::unix::fs::PermissionsExt;

    let path_var = std::env::var_os("PATH")?;
    for path_dir in std::env::split_paths(&path_var) {
        for candidate in candidates {
            let full_path = path_dir.join(candidate);
            let metadata = match std::fs::metadata(&full_path) {
                Ok(meta) => meta,
                Err(_) => continue,
            };

            if metadata.is_file() && (metadata.permissions().mode() & 0o111 != 0) {
                return Some((*candidate).to_string());
            }
        }
    }

    None
}

#[cfg(all(not(target_os = "windows"), not(target_os = "linux")))]
pub fn init_cache<R: tauri::Runtime>(_app: &tauri::AppHandle<R>) {
    log::info!("installed_apps cache disabled on this platform");
}

#[cfg(all(not(target_os = "windows"), not(target_os = "linux")))]
pub fn force_refresh_cache<R: tauri::Runtime>(_app: &tauri::AppHandle<R>) {
    log::info!("installed_apps refresh is a no-op on this platform");
}

#[cfg(all(not(target_os = "windows"), not(target_os = "linux")))]
pub fn get_installed_popular_apps() -> Vec<InstalledApp> {
    Vec::new()
}

#[cfg(all(not(target_os = "windows"), not(target_os = "linux")))]
pub fn search_installed_apps(_query: &str) -> Vec<InstalledApp> {
    Vec::new()
}
