use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::RwLock;
use once_cell::sync::Lazy;
use winreg::enums::*;
use winreg::RegKey;
use windows::Win32::UI::Shell::{
    SHGetFileInfoW, SHFILEINFOW, SHGFI_ICON, SHGFI_LARGEICON,
    SHGetImageList, SHIL_JUMBO, SHGFI_SYSICONINDEX,
};
use windows::Win32::Storage::FileSystem::FILE_FLAGS_AND_ATTRIBUTES;
use windows::Win32::UI::WindowsAndMessaging::{DestroyIcon, DI_FLAGS};
use windows::Win32::UI::Controls::{IImageList, ILD_TRANSPARENT};
use windows::core::PCWSTR;
use image::ImageEncoder;
use walkdir::WalkDir;
use lnk::ShellLink;

/// In-memory cache for installed apps (RwLock for concurrent read access)
static INSTALLED_APPS_CACHE: Lazy<RwLock<Option<Vec<InstalledApp>>>> =
    Lazy::new(|| RwLock::new(None));

/// Flag to track if background refresh is running
static REFRESH_IN_PROGRESS: Lazy<RwLock<bool>> =
    Lazy::new(|| RwLock::new(false));

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledApp {
    pub name: String,
    pub executable: String,
    pub category: String,
    pub icon_base64: Option<String>,
}

/// Cache file structure
#[derive(Debug, Serialize, Deserialize)]
struct CacheFile {
    version: u32,
    timestamp: u64,
    apps: Vec<InstalledApp>,
}

// Bump when cache semantics change (prevents stale/ghost entries from older versions)
const CACHE_VERSION: u32 = 2;
const CACHE_FILENAME: &str = "installed_apps_cache.json";

/// Known popular apps with their executables and categories
const KNOWN_APPS: &[(&str, &str, &str)] = &[
    // Browsers
    ("Google Chrome", "chrome.exe", "browser"),
    ("Mozilla Firefox", "firefox.exe", "browser"),
    ("Microsoft Edge", "msedge.exe", "browser"),
    ("Brave Browser", "brave.exe", "browser"),
    ("Opera", "opera.exe", "browser"),
    ("Arc", "arc.exe", "browser"),
    ("Vivaldi", "vivaldi.exe", "browser"),

    // Code Editors & IDEs
    ("Visual Studio Code", "Code.exe", "code"),
    ("Visual Studio Code - Insiders", "Code - Insiders.exe", "code"),
    ("Cursor", "Cursor.exe", "code"),
    ("Antigravity", "Antigravity.exe", "code"),
    ("Sublime Text", "sublime_text.exe", "code"),
    ("Atom", "atom.exe", "code"),
    ("Notepad++", "notepad++.exe", "code"),
    ("IntelliJ IDEA", "idea64.exe", "code"),
    ("PyCharm", "pycharm64.exe", "code"),
    ("WebStorm", "webstorm64.exe", "code"),
    ("Visual Studio", "devenv.exe", "code"),
    ("Android Studio", "studio64.exe", "code"),
    ("Zed", "zed.exe", "code"),
    ("Neovim", "nvim-qt.exe", "code"),

    // Communication
    ("Slack", "slack.exe", "chat"),
    ("Discord", "Discord.exe", "chat"),
    ("Microsoft Teams", "Teams.exe", "chat"),
    ("Microsoft Teams (new)", "ms-teams.exe", "chat"),
    ("Zoom", "Zoom.exe", "chat"),
    ("Telegram", "Telegram.exe", "chat"),
    ("WhatsApp Desktop", "WhatsApp.exe", "chat"),
    ("Signal", "Signal.exe", "chat"),
    ("Skype", "Skype.exe", "chat"),

    // Email
    ("Microsoft Outlook", "OUTLOOK.EXE", "email"),
    ("Thunderbird", "thunderbird.exe", "email"),
    ("Mailspring", "mailspring.exe", "email"),

    // Notes & Productivity
    ("Notion", "Notion.exe", "notes"),
    ("Obsidian", "Obsidian.exe", "notes"),
    ("Evernote", "Evernote.exe", "notes"),
    ("OneNote", "ONENOTE.EXE", "notes"),
    ("Roam Research", "Roam Research.exe", "notes"),
    ("Logseq", "Logseq.exe", "notes"),
    ("Joplin", "Joplin.exe", "notes"),

    // Office
    ("Microsoft Word", "WINWORD.EXE", "office"),
    ("Microsoft Excel", "EXCEL.EXE", "office"),
    ("Microsoft PowerPoint", "POWERPNT.EXE", "office"),
    ("LibreOffice Writer", "swriter.exe", "office"),

    // Design
    ("Figma", "Figma.exe", "design"),
    ("Adobe Photoshop", "Photoshop.exe", "design"),
    ("Adobe Illustrator", "Illustrator.exe", "design"),
    ("Adobe XD", "XD.exe", "design"),
    ("Sketch", "Sketch.exe", "design"),
    ("Canva", "Canva.exe", "design"),
    ("GIMP", "gimp-2.10.exe", "design"),
    ("Inkscape", "inkscape.exe", "design"),

    // Development Tools
    ("Postman", "Postman.exe", "dev"),
    ("Insomnia", "Insomnia.exe", "dev"),
    ("Docker Desktop", "Docker Desktop.exe", "dev"),
    ("GitHub Desktop", "GitHubDesktop.exe", "dev"),
    ("Sourcetree", "SourceTree.exe", "dev"),
    ("Windows Terminal", "WindowsTerminal.exe", "dev"),
    ("Warp", "warp.exe", "dev"),
    ("Hyper", "Hyper.exe", "dev"),

    // Media
    ("Spotify", "Spotify.exe", "media"),
    ("VLC Media Player", "vlc.exe", "media"),
    ("iTunes", "iTunes.exe", "media"),

    // Other Popular
    ("1Password", "1Password.exe", "utility"),
    ("Grammarly Desktop", "Grammarly.exe", "utility"),
    ("Loom", "Loom.exe", "utility"),
    ("Krisp", "krisp.exe", "utility"),

    // System Apps
    ("Notepad", "notepad.exe", "utility"),
];

/// Alias map for search queries
const APP_ALIASES: &[(&str, &str)] = &[
    ("vs code", "code.exe"),
    ("vscode", "code.exe"),
    ("visual studio code", "code.exe"),
    ("code insiders", "code - insiders.exe"),
    ("vscode insiders", "code - insiders.exe"),
    ("vs code insiders", "code - insiders.exe"),
];

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

/// Get the cache file path
fn get_cache_path() -> Option<PathBuf> {
    let app_data = std::env::var("APPDATA").ok()?;
    let mut path = PathBuf::from(app_data);
    path.push("com.scribe");
    // Ensure directory exists
    std::fs::create_dir_all(&path).ok()?;
    path.push(CACHE_FILENAME);
    Some(path)
}

/// Load apps from file cache
fn load_from_file_cache() -> Option<Vec<InstalledApp>> {
    let cache_path = get_cache_path()?;
    let content = std::fs::read_to_string(&cache_path).ok()?;
    let cache: CacheFile = serde_json::from_str(&content).ok()?;

    // Check version compatibility
    if cache.version != CACHE_VERSION {
        log::info!("Cache version mismatch, will refresh");
        return None;
    }

    log::info!("Loaded {} apps from file cache", cache.apps.len());
    Some(cache.apps)
}

/// Save apps to file cache
fn save_to_file_cache(apps: &[InstalledApp]) {
    if let Some(cache_path) = get_cache_path() {
        let cache = CacheFile {
            version: CACHE_VERSION,
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or(0),
            apps: apps.to_vec(),
        };

        if let Ok(content) = serde_json::to_string(&cache) {
            if std::fs::write(&cache_path, content).is_ok() {
                log::info!("Saved {} apps to file cache", apps.len());
            }
        }
    }
}

/// Initialize cache on app startup - call this from lib.rs setup
/// This is fully async and does NOT block app startup
pub fn init_cache() {
    // Spawn everything in background thread - no blocking
    std::thread::spawn(|| {
        log::info!("Initializing installed apps cache in background");

        // First, try to load from file cache into memory
        if let Some(apps) = load_from_file_cache() {
            if let Ok(mut cache) = INSTALLED_APPS_CACHE.write() {
                *cache = Some(apps);
                log::info!("Initialized memory cache from file");
            }
        }

        // Then do a fresh scan to ensure cache is up-to-date
        do_background_refresh();
    });
}

/// Start background refresh of installed apps (can be called separately)
pub fn start_background_refresh() {
    // Check if already refreshing
    if let Ok(in_progress) = REFRESH_IN_PROGRESS.read() {
        if *in_progress {
            log::info!("Background refresh already in progress, skipping");
            return;
        }
    }

    // Spawn background thread
    std::thread::spawn(|| {
        do_background_refresh();
    });
}

/// Internal: Actually perform the refresh (called from background thread)
fn do_background_refresh() {
    // Check if already refreshing
    {
        let in_progress = REFRESH_IN_PROGRESS.read().ok();
        if in_progress.map(|p| *p).unwrap_or(false) {
            return;
        }
    }

    // Mark as in progress
    if let Ok(mut in_progress) = REFRESH_IN_PROGRESS.write() {
        *in_progress = true;
    }

    log::info!("Starting background refresh of installed apps");
    let start = std::time::Instant::now();

    // Do the expensive scan
    let apps = scan_installed_popular_apps();

    // Update memory cache
    if let Ok(mut cache) = INSTALLED_APPS_CACHE.write() {
        *cache = Some(apps.clone());
    }

    // Save to file cache
    save_to_file_cache(&apps);

    // Mark as complete
    if let Ok(mut in_progress) = REFRESH_IN_PROGRESS.write() {
        *in_progress = false;
    }

    log::info!(
        "Background refresh complete: {} apps in {:?}",
        apps.len(),
        start.elapsed()
    );
}

// ============================================================================
// PUBLIC API
// ============================================================================

/// Search installed apps by query (uses cache for known apps)
pub fn search_installed_apps(query: &str) -> Vec<InstalledApp> {
    if query.len() < 2 {
        return Vec::new();
    }

    let query_lower = query.to_lowercase().trim().to_string();
    let query_words: Vec<&str> = query_lower.split_whitespace().collect();

    // First try to get results from cache
    let mut results = Vec::new();
    let mut seen: std::collections::HashSet<String> = std::collections::HashSet::new();

    // Check aliases
    let alias_exe = APP_ALIASES.iter()
        .find(|(alias, _)| alias.to_lowercase() == query_lower)
        .map(|(_, exe)| exe.to_lowercase());

    // Search in cached apps first
    if let Ok(cache) = INSTALLED_APPS_CACHE.read() {
        if let Some(cached_apps) = cache.as_ref() {
            for app in cached_apps {
                let exe_lower = app.executable.to_lowercase();
                let name_lower = app.name.to_lowercase();

                let matches = alias_exe.as_ref().map(|a| *a == exe_lower).unwrap_or(false)
                    || name_lower.contains(&query_lower)
                    || exe_lower.contains(&query_lower)
                    || query_words.iter().all(|w| name_lower.contains(w))
                    || query_words.iter().all(|w| exe_lower.contains(w));

                if matches {
                    seen.insert(exe_lower);
                    results.push(app.clone());
                }
            }
        }
    }

    // If we have results from cache, return them
    if !results.is_empty() {
        results.truncate(10);
        return results;
    }

    // Fallback: do fresh scan (slower path)
    let registered_apps = get_all_registered_apps();

    for (name, exe, category) in KNOWN_APPS {
        let exe_lower = exe.to_lowercase();

        if let Some(full_path) = registered_apps.get(&exe_lower).cloned() {
            let name_lower = name.to_lowercase();

            let matches = alias_exe.as_ref().map(|a| *a == exe_lower).unwrap_or(false)
                || name_lower.contains(&query_lower)
                || exe_lower.contains(&query_lower)
                || query_words.iter().all(|w| name_lower.contains(w))
                || query_words.iter().all(|w| exe_lower.contains(w));

            if matches {
                let icon_base64 = extract_icon_from_path(&full_path);
                seen.insert(exe_lower.clone());
                results.push(InstalledApp {
                    name: name.to_string(),
                    executable: exe.to_string(),
                    category: category.to_string(),
                    icon_base64,
                });
            }
        }
    }

    results.truncate(10);
    results
}

/// Get installed popular apps - returns from cache if available
pub fn get_installed_popular_apps() -> Vec<InstalledApp> {
    // Try memory cache first (instant)
    if let Ok(cache) = INSTALLED_APPS_CACHE.read() {
        if let Some(apps) = cache.as_ref() {
            log::info!("Returning {} apps from memory cache", apps.len());
            return apps.clone();
        }
    }

    // Try file cache (fast, ~5ms)
    if let Some(apps) = load_from_file_cache() {
        // Store in memory cache for next time
        if let Ok(mut cache) = INSTALLED_APPS_CACHE.write() {
            *cache = Some(apps.clone());
        }
        // Start background refresh for freshness
        start_background_refresh();
        return apps;
    }

    // No cache available - do synchronous scan (slow, but only first time ever)
    log::info!("No cache available, doing synchronous scan");
    let apps = scan_installed_popular_apps();

    // Store in caches
    if let Ok(mut cache) = INSTALLED_APPS_CACHE.write() {
        *cache = Some(apps.clone());
    }
    save_to_file_cache(&apps);

    apps
}

/// Force refresh the cache (call when user clicks "Refresh" button)
pub fn force_refresh_cache() {
    // Clear memory cache
    if let Ok(mut cache) = INSTALLED_APPS_CACHE.write() {
        *cache = None;
    }
    // Start fresh scan in background
    start_background_refresh();
}

// ============================================================================
// SCANNING (Internal)
// ============================================================================

/// Known system apps with their full paths (these are always available on Windows)
const SYSTEM_APPS: &[(&str, &str, &str, &str)] = &[
    // (name, exe, category, path)
    ("Notepad", "notepad.exe", "utility", r"C:\Windows\System32\notepad.exe"),
];

/// Actually scan for installed popular apps (expensive operation)
fn scan_installed_popular_apps() -> Vec<InstalledApp> {
    let registered_apps = get_all_registered_apps();
    let mut installed = Vec::new();
    let mut found_exes: std::collections::HashSet<String> = std::collections::HashSet::new();

    for (name, exe, category) in KNOWN_APPS {
        let exe_lower = exe.to_lowercase();
        if let Some(full_path) = registered_apps.get(&exe_lower).cloned() {
            let icon_base64 = extract_icon_from_path(&full_path);
            found_exes.insert(exe_lower.clone());
            installed.push(InstalledApp {
                name: name.to_string(),
                executable: exe.to_string(),
                category: category.to_string(),
                icon_base64,
            });
        }
    }

    // Add system apps that are always available
    for (name, exe, category, path) in SYSTEM_APPS {
        let exe_lower = exe.to_lowercase();
        if !found_exes.contains(&exe_lower) && PathBuf::from(path).exists() {
            let icon_base64 = extract_icon_from_path(path);
            installed.push(InstalledApp {
                name: name.to_string(),
                executable: exe.to_string(),
                category: category.to_string(),
                icon_base64,
            });
        }
    }

    log::info!("Scanned and found {} installed popular apps", installed.len());
    installed
}

/// Get all registered executables with their full paths
fn get_all_registered_apps() -> HashMap<String, String> {
    let mut executables: HashMap<String, String> = HashMap::new();

    // Registry: HKEY_LOCAL_MACHINE App Paths
    if let Ok(hklm) = RegKey::predef(HKEY_LOCAL_MACHINE)
        .open_subkey(r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths")
    {
        for exe_name in hklm.enum_keys().filter_map(|k| k.ok()) {
            if let Ok(app_key) = hklm.open_subkey(&exe_name) {
                if let Ok(path) = app_key.get_value::<String, _>("") {
                    store_executable(&mut executables, &exe_name, &path);
                }
            }
        }
    }

    // Registry: WOW6432Node (32-bit apps on 64-bit Windows)
    if let Ok(hklm32) = RegKey::predef(HKEY_LOCAL_MACHINE)
        .open_subkey(r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths")
    {
        for exe_name in hklm32.enum_keys().filter_map(|k| k.ok()) {
            if let Ok(app_key) = hklm32.open_subkey(&exe_name) {
                if let Ok(path) = app_key.get_value::<String, _>("") {
                    store_executable(&mut executables, &exe_name, &path);
                }
            }
        }
    }

    // Registry: HKEY_CURRENT_USER App Paths
    if let Ok(hkcu) = RegKey::predef(HKEY_CURRENT_USER)
        .open_subkey(r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths")
    {
        for exe_name in hkcu.enum_keys().filter_map(|k| k.ok()) {
            if let Ok(app_key) = hkcu.open_subkey(&exe_name) {
                if let Ok(path) = app_key.get_value::<String, _>("") {
                    store_executable(&mut executables, &exe_name, &path);
                }
            }
        }
    }

    // Start Menu shortcuts (using lnk crate - fast, no COM)
    let start_menu_apps = collect_start_menu_links();
    for (exe_key, exe_path) in start_menu_apps {
        executables.entry(exe_key).or_insert(exe_path);
    }

    executables
}

/// Collect Start Menu shortcuts and resolve their target executables using lnk crate
fn collect_start_menu_links() -> HashMap<String, String> {
    let mut map: HashMap<String, String> = HashMap::new();
    let mut start_menu_paths = Vec::new();

    start_menu_paths.push(PathBuf::from(r"C:\ProgramData\Microsoft\Windows\Start Menu\Programs"));

    if let Ok(appdata) = std::env::var("APPDATA") {
        let mut p = PathBuf::from(appdata);
        p.push("Microsoft\\Windows\\Start Menu\\Programs");
        start_menu_paths.push(p);
    }

    for dir in start_menu_paths {
        if !dir.exists() {
            continue;
        }

        for entry in WalkDir::new(dir).max_depth(3).into_iter().filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()).map(|ext| ext.eq_ignore_ascii_case("lnk")).unwrap_or(false) {
                // Use lnk crate to parse the shortcut (much faster than COM)
                if let Some(target_path) = resolve_lnk_target_fast(path) {
                    let full_path = sanitize_exe_path(&expand_env_vars(&target_path));
                    let pb = PathBuf::from(&full_path);
                    if pb.exists() && !is_windows_system_path(&full_path) {
                        if let Some(exe_name) = pb.file_name().and_then(|n| n.to_str()) {
                            let exe_key = exe_name.to_lowercase();
                            // Only add if it's an .exe file
                            if exe_key.ends_with(".exe") {
                                map.entry(exe_key).or_insert(full_path);
                            }
                        }
                    }
                }
            }
        }
    }

    map
}

/// Resolve a .lnk shortcut file to its target path using the lnk crate (fast, no COM)
fn resolve_lnk_target_fast(lnk_path: &std::path::Path) -> Option<String> {
    // Wrap in catch_unwind because lnk crate can panic on malformed .lnk files
    let path = lnk_path.to_path_buf();
    std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        resolve_lnk_target_inner(&path)
    })).ok().flatten()
}

/// Inner function for lnk parsing (may panic on malformed files)
fn resolve_lnk_target_inner(lnk_path: &std::path::Path) -> Option<String> {
    let shell_link = ShellLink::open(lnk_path).ok()?;

    // Try to get the target path from link info
    if let Some(link_info) = shell_link.link_info() {
        // Prefer Unicode paths when present
        let base = link_info
            .local_base_path_unicode()
            .as_ref()
            .or_else(|| link_info.local_base_path().as_ref());

        if let Some(base) = base {
            let base_expanded = expand_env_vars(base);
            let base_pb = PathBuf::from(&base_expanded);

            // Some shortcuts store the full exe in LocalBasePath already
            if base_expanded.to_lowercase().ends_with(".exe") && base_pb.exists() {
                return Some(base_expanded);
            }

            // Spec: LocalBasePath + CommonPathSuffix = full target path
            let suffix = link_info
                .common_path_suffix_unicode()
                .as_ref()
                .map(|s| s.as_str())
                .unwrap_or_else(|| link_info.common_path_suffix().as_str());

            if !suffix.is_empty() {
                let joined = base_pb.join(suffix);
                let joined_str = expand_env_vars(&joined.to_string_lossy());
                if PathBuf::from(&joined_str).exists() {
                    return Some(joined_str);
                }
            }
        }
    }

    // Fallback: try relative path combined with working dir
    if let Some(relative_path) = shell_link.relative_path() {
        if let Some(working_dir) = shell_link.working_dir() {
            let full_path = PathBuf::from(working_dir).join(relative_path);
            if full_path.exists() {
                return full_path.to_str().map(|s| expand_env_vars(s));
            }
        }
    }

    None
}

/// Expand Windows environment variables in a path
fn expand_env_vars(path: &str) -> String {
    let mut result = path.to_string();

    // Common environment variables to expand
    let vars = [
        ("LOCALAPPDATA", std::env::var("LOCALAPPDATA").unwrap_or_default()),
        ("APPDATA", std::env::var("APPDATA").unwrap_or_default()),
        ("PROGRAMFILES", std::env::var("PROGRAMFILES").unwrap_or_default()),
        ("PROGRAMFILES(X86)", std::env::var("PROGRAMFILES(X86)").unwrap_or_default()),
        ("USERPROFILE", std::env::var("USERPROFILE").unwrap_or_default()),
        ("SYSTEMROOT", std::env::var("SYSTEMROOT").unwrap_or_default()),
    ];

    for (var_name, var_value) in vars {
        if !var_value.is_empty() {
            result = result.replace(&format!("%{}%", var_name), &var_value);
        }
    }

    result
}

fn sanitize_exe_path(raw: &str) -> String {
    let trimmed = raw.trim().trim_matches('"').trim();
    let lower = trimmed.to_lowercase();
    if let Some(idx) = lower.find(".exe") {
        return trimmed[..(idx + 4)].to_string();
    }
    trimmed.to_string()
}

fn is_windows_system_path(path: &str) -> bool {
    let lower = path.to_lowercase();
    lower.starts_with("c:\\windows\\")
        || lower.contains("\\windows\\system32\\")
        || lower.contains("\\windows\\syswow64\\")
        || lower.contains("\\windows\\winsxs\\")
}

fn store_executable(map: &mut HashMap<String, String>, exe_name: &str, raw_path: &str) {
    let exe_key = exe_name.to_lowercase();
    let path = sanitize_exe_path(&expand_env_vars(raw_path));
    if path.is_empty() || is_windows_system_path(&path) {
        return;
    }
    if !PathBuf::from(&path).exists() {
        return;
    }
    map.entry(exe_key).or_insert(path);
}

/// Extract high-quality icon from file path and return as base64 PNG
fn extract_icon_from_path(path: &str) -> Option<String> {
    let path_buf = PathBuf::from(path);
    if !path_buf.exists() {
        return None;
    }

    // Try to get extra-large icon first (48x48), fall back to large (32x32)
    extract_icon_high_quality(path)
        .or_else(|| extract_icon_standard(path))
}

/// Extract high-quality icon (256x256) using SHGetImageList with SHIL_JUMBO
fn extract_icon_high_quality(path: &str) -> Option<String> {
    use windows::Win32::UI::WindowsAndMessaging::HICON;

    let path_wide: Vec<u16> = path.encode_utf16().chain(std::iter::once(0)).collect();

    unsafe {
        // First get the icon index
        let mut shfi: SHFILEINFOW = std::mem::zeroed();
        let result = SHGetFileInfoW(
            PCWSTR::from_raw(path_wide.as_ptr()),
            FILE_FLAGS_AND_ATTRIBUTES(0),
            Some(&mut shfi),
            std::mem::size_of::<SHFILEINFOW>() as u32,
            SHGFI_SYSICONINDEX,
        );

        if result == 0 {
            return None;
        }

        // Get the jumbo image list (256x256 icons)
        let image_list: IImageList = SHGetImageList(SHIL_JUMBO as i32).ok()?;

        // Get the icon from the image list
        let hicon: HICON = image_list.GetIcon(shfi.iIcon, ILD_TRANSPARENT.0 as u32).ok()?;

        if hicon.is_invalid() {
            return None;
        }

        // Use 256x256 for jumbo icons (best quality)
        let icon_data = icon_to_png_base64(hicon, 256);
        let _ = DestroyIcon(hicon);
        icon_data
    }
}

/// Extract standard large icon (32x32) as fallback
fn extract_icon_standard(path: &str) -> Option<String> {
    let path_wide: Vec<u16> = path.encode_utf16().chain(std::iter::once(0)).collect();

    unsafe {
        let mut shfi: SHFILEINFOW = std::mem::zeroed();
        let flags = SHGFI_ICON | SHGFI_LARGEICON;

        let result = SHGetFileInfoW(
            PCWSTR::from_raw(path_wide.as_ptr()),
            FILE_FLAGS_AND_ATTRIBUTES(0),
            Some(&mut shfi),
            std::mem::size_of::<SHFILEINFOW>() as u32,
            flags,
        );

        if result == 0 || shfi.hIcon.is_invalid() {
            return None;
        }

        let icon_data = icon_to_png_base64(shfi.hIcon, 32);
        let _ = DestroyIcon(shfi.hIcon);
        icon_data
    }
}

/// Convert HICON to PNG base64 with specified size
fn icon_to_png_base64(hicon: windows::Win32::UI::WindowsAndMessaging::HICON, size: i32) -> Option<String> {
    use windows::Win32::Graphics::Gdi::{
        CreateCompatibleDC, DeleteDC, DeleteObject, GetDC, ReleaseDC, SelectObject,
        CreateCompatibleBitmap, GetDIBits, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS,
    };
    use windows::Win32::UI::WindowsAndMessaging::DrawIconEx;

    unsafe {
        let hdc = GetDC(None);
        let hdc_mem = CreateCompatibleDC(hdc);
        let hbm = CreateCompatibleBitmap(hdc, size, size);
        let old_bm = SelectObject(hdc_mem, hbm);

        // DI_NORMAL = DI_IMAGE | DI_MASK = 0x0003
        let _ = DrawIconEx(hdc_mem, 0, 0, hicon, size, size, 0, None, DI_FLAGS(0x0003));

        let mut bmi: BITMAPINFO = std::mem::zeroed();
        bmi.bmiHeader.biSize = std::mem::size_of::<BITMAPINFOHEADER>() as u32;
        bmi.bmiHeader.biWidth = size;
        bmi.bmiHeader.biHeight = -size; // Top-down
        bmi.bmiHeader.biPlanes = 1;
        bmi.bmiHeader.biBitCount = 32;
        bmi.bmiHeader.biCompression = BI_RGB.0 as u32;

        let mut buffer = vec![0u8; (size * size * 4) as usize];
        GetDIBits(
            hdc_mem,
            hbm,
            0,
            size as u32,
            Some(buffer.as_mut_ptr() as *mut _),
            &mut bmi,
            DIB_RGB_COLORS,
        );

        SelectObject(hdc_mem, old_bm);
        DeleteObject(hbm);
        DeleteDC(hdc_mem);
        ReleaseDC(None, hdc);

        // Convert BGRA to RGBA
        for i in (0..buffer.len()).step_by(4) {
            buffer.swap(i, i + 2);
        }

        let img = image::RgbaImage::from_raw(size as u32, size as u32, buffer)?;
        let mut png_bytes = Vec::new();
        let mut cursor = std::io::Cursor::new(&mut png_bytes);

        let encoder = image::codecs::png::PngEncoder::new(&mut cursor);
        encoder.write_image(&img, size as u32, size as u32, image::ExtendedColorType::Rgba8).ok()?;

        Some(base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &png_bytes))
    }
}
