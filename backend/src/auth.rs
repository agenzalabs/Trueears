//! OAuth authentication module for Trueears
//! Handles Google OAuth flow, token storage, and API communication

use crate::error::AppError;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::sync::Once;
use std::thread;
use tauri::{Emitter, Manager};

// File storage for auth data (more reliable than keyring on Windows)
const AUTH_FILE_NAME: &str = "auth.json";
static RUNTIME_ENV_LOADED: Once = Once::new();

/// User info stored in auth file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserInfo {
    pub id: String,
    pub email: String,
    pub name: Option<String>,
    pub picture: Option<String>,
}

/// Auth response from API server
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: i64,
    pub user: UserInfo,
}

/// Current authentication state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthState {
    pub is_authenticated: bool,
    pub user: Option<UserInfo>,
}

/// Internal storage structure for auth data
#[derive(Debug, Clone, Serialize, Deserialize)]
struct AuthStorage {
    access_token: String,
    refresh_token: String,
    user: UserInfo,
}

/// OAuth configuration
#[derive(Clone)]
pub struct OAuthConfig {
    pub google_client_id: String,
    pub api_url: String,
    pub callback_port: u16,
}

impl OAuthConfig {
    pub fn from_app<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> Option<Self> {
        load_runtime_env(app);
        let google_client_id = std::env::var("GOOGLE_CLIENT_ID").ok()?;
        let api_url = api_url_from_app(app);

        Some(OAuthConfig {
            google_client_id,
            api_url,
            callback_port: 8585,
        })
    }
}

fn discover_env_paths<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> Vec<PathBuf> {
    fn push_unique(paths: &mut Vec<PathBuf>, seen: &mut HashSet<PathBuf>, path: PathBuf) {
        if seen.insert(path.clone()) {
            paths.push(path);
        }
    }

    let mut paths = Vec::new();
    let mut seen = HashSet::new();

    if let Ok(resource_dir) = app.path().resource_dir() {
        let workspace_root = resource_dir.ancestors().find(|ancestor| {
            ancestor.join("backend").join("Cargo.toml").is_file()
                && ancestor.join("package.json").is_file()
        });

        if let Some(root) = workspace_root {
            push_unique(&mut paths, &mut seen, root.join(".env"));
            push_unique(&mut paths, &mut seen, root.join("backend").join(".env"));
        } else {
            let backend_dir = resource_dir
                .ancestors()
                .find(|ancestor| ancestor.join("Cargo.toml").is_file());

            if let Some(dir) = backend_dir {
                if let Some(parent) = dir.parent() {
                    push_unique(&mut paths, &mut seen, parent.join(".env"));
                }
                push_unique(&mut paths, &mut seen, dir.join(".env"));
            }
        }
    }

    if let Ok(config_dir) = app.path().app_config_dir() {
        push_unique(&mut paths, &mut seen, config_dir.join(".env"));
    }

    paths
}

pub fn load_runtime_env<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    RUNTIME_ENV_LOADED.call_once(|| {
        let mut loaded_any = false;

        for path in discover_env_paths(app) {
            if !path.is_file() {
                continue;
            }

            let result = if loaded_any {
                dotenvy::from_path(&path)
            } else {
                dotenvy::from_path_override(&path)
            };

            match result {
                Ok(loaded_path) => {
                    loaded_any = true;
                    log::info!("Loaded runtime env from {:?}", loaded_path);
                }
                Err(err) => {
                    log::warn!("Failed to load env file {:?}: {}", path, err);
                }
            }
        }

        if !loaded_any {
            log::debug!("No runtime env files found via Tauri path discovery");
        }
    });
}

pub fn api_url_from_app<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> String {
    load_runtime_env(app);
    std::env::var("API_URL").unwrap_or_else(|_| "https://trueears-backend.vercel.app".to_string())
}

// ============ File-based Token Storage ============

fn ensure_parent_dir(path: &Path) -> Result<(), AppError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create auth storage directory: {}", e))?;
    }
    Ok(())
}

/// Get the auth file path using Tauri's path APIs.
fn get_auth_file_path<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> Result<PathBuf, AppError> {
    let path = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Could not determine auth storage directory: {}", e))?
        .join(AUTH_FILE_NAME);
    ensure_parent_dir(&path)?;
    Ok(path)
}

/// Migrate legacy auth storage from the old `Trueears` folder into `com.Trueears`
pub fn migrate_legacy_auth_file<R: tauri::Runtime>(_app: &tauri::AppHandle<R>) {
    #[cfg(target_os = "windows")]
    {
        let new_path = match get_auth_file_path(_app) {
            Ok(path) => path,
            Err(err) => {
                log::warn!(
                    "Unable to resolve new auth storage path for migration: {}",
                    err
                );
                return;
            }
        };

        let Some(new_dir) = new_path.parent() else {
            log::warn!("New auth storage path has no parent directory");
            return;
        };

        let Some(app_data_root) = new_dir.parent() else {
            log::warn!("Unable to derive app data root from {:?}", new_dir);
            return;
        };

        let legacy_path = app_data_root.join("Trueears").join(AUTH_FILE_NAME);
        if legacy_path.exists() {
            let _ = fs::create_dir_all(new_dir);
            if !new_path.exists() {
                match fs::rename(&legacy_path, &new_path) {
                    Ok(_) => {
                        log::info!(
                            "Migrated auth file from {:?} to {:?}",
                            legacy_path,
                            new_path
                        );
                    }
                    Err(e) => {
                        log::warn!("Failed to migrate legacy auth file: {}", e);
                    }
                }
            } else if let Err(e) = fs::remove_file(&legacy_path) {
                log::warn!("Failed to remove legacy auth file after migration: {}", e);
            } else {
                log::info!(
                    "Removed legacy auth file at {:?} (new file already present)",
                    legacy_path
                );
            }
        }
    }
}

/// Store tokens in file system
pub fn store_tokens(
    app: &tauri::AppHandle<impl tauri::Runtime>,
    access_token: &str,
    refresh_token: &str,
    user_info: &UserInfo,
) -> Result<(), AppError> {
    let path = get_auth_file_path(app)?;

    let storage = AuthStorage {
        access_token: access_token.to_string(),
        refresh_token: refresh_token.to_string(),
        user: user_info.clone(),
    };

    let json = serde_json::to_string_pretty(&storage)
        .map_err(|e| format!("Failed to serialize auth data: {}", e))?;

    fs::write(&path, json).map_err(|e| format!("Failed to write auth file: {}", e))?;

    log::info!("Tokens stored to file: {:?}", path);
    Ok(())
}

/// Get access token from file
pub fn get_access_token(app: &tauri::AppHandle<impl tauri::Runtime>) -> Option<String> {
    let path = get_auth_file_path(app).ok()?;
    let content = fs::read_to_string(&path).ok()?;
    let storage: AuthStorage = serde_json::from_str(&content).ok()?;
    Some(storage.access_token)
}

/// Get refresh token from file
pub fn get_refresh_token(app: &tauri::AppHandle<impl tauri::Runtime>) -> Option<String> {
    let path = get_auth_file_path(app).ok()?;
    let content = fs::read_to_string(&path).ok()?;
    let storage: AuthStorage = serde_json::from_str(&content).ok()?;
    Some(storage.refresh_token)
}

/// Get stored user info from file
pub fn get_stored_user_info(app: &tauri::AppHandle<impl tauri::Runtime>) -> Option<UserInfo> {
    let path = get_auth_file_path(app).ok()?;
    log::info!("Reading auth from: {:?}", path);

    let content = match fs::read_to_string(&path) {
        Ok(c) => c,
        Err(e) => {
            log::debug!("No auth file found: {}", e);
            return None;
        }
    };

    match serde_json::from_str::<AuthStorage>(&content) {
        Ok(storage) => {
            log::info!("Loaded user info for: {}", storage.user.email);
            Some(storage.user)
        }
        Err(e) => {
            log::error!("Failed to parse auth file: {}", e);
            None
        }
    }
}

/// Clear all stored tokens (logout)
pub fn clear_tokens(app: &tauri::AppHandle<impl tauri::Runtime>) -> Result<(), AppError> {
    let path = get_auth_file_path(app)?;
    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("Failed to delete auth file: {}", e))?;
    }

    log::info!("Auth data cleared");
    Ok(())
}

// ============ OAuth Flow ============

/// Start the Google OAuth flow
pub async fn start_google_oauth<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    config: OAuthConfig,
) -> Result<(), AppError> {
    log::info!("Starting Google OAuth flow");

    // Build the Google OAuth URL
    let redirect_uri = format!("http://localhost:{}/callback", config.callback_port);

    // Note: client_id doesn't need encoding, but redirect_uri and scope do
    let oauth_url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?client_id={}&redirect_uri={}&response_type=code&scope={}&access_type=offline&prompt=consent",
        config.google_client_id,
        urlencoding::encode(&redirect_uri),
        urlencoding::encode("openid email profile")
    );

    log::info!("OAuth URL: {}", oauth_url);

    // Start local callback server in a separate thread
    let app_clone = app.clone();
    let config_clone = config.clone();
    let server_running = Arc::new(AtomicBool::new(true));
    let server_running_clone = server_running.clone();

    thread::spawn(move || {
        if let Err(e) = run_callback_server(app_clone, config_clone, server_running_clone) {
            log::error!("Callback server error: {}", e);
        }
    });

    // Open browser via Tauri shell plugin
    log::info!("Opening browser for Google login: {}", oauth_url);
    tauri_plugin_opener::open_url(&oauth_url, None::<&str>)
        .map_err(|e| format!("Failed to open browser: {}", e))?;

    Ok(())
}

/// Run local HTTP server to catch OAuth callback
fn run_callback_server<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    config: OAuthConfig,
    running: Arc<AtomicBool>,
) -> Result<(), AppError> {
    let addr = format!("127.0.0.1:{}", config.callback_port);
    let server = tiny_http::Server::http(&addr)
        .map_err(|e| format!("Failed to start callback server: {}", e))?;

    log::info!("Callback server listening on {}", addr);

    // Wait for callback with timeout
    let timeout = std::time::Duration::from_secs(300); // 5 minute timeout
    let start = std::time::Instant::now();

    while running.load(Ordering::SeqCst) && start.elapsed() < timeout {
        // Use recv_timeout for non-blocking receive
        match server.recv_timeout(std::time::Duration::from_millis(500)) {
            Ok(Some(request)) => {
                let url = request.url().to_string();
                log::info!("Received callback: {}", url);

                // Extract authorization code from URL
                if let Some(code) = extract_code_from_url(&url) {
                    log::info!("Authorization code received");

                    // Send success response to browser with Trueears branding
                    let response = tiny_http::Response::from_string(
                        r#"<!DOCTYPE html>
<html>
<head>
    <title>Trueears - Authentication Successful</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: #f8fafc;
            overflow: hidden;
        }
        .bg-pattern {
            position: fixed;
            inset: 0;
            opacity: 0.4;
            background-image: radial-gradient(rgba(16, 185, 129, 0.15) 1px, transparent 1px);
            background-size: 40px 40px;
            mask-image: radial-gradient(circle at center, black 30%, transparent 80%);
            -webkit-mask-image: radial-gradient(circle at center, black 30%, transparent 80%);
        }
        .container {
            position: relative;
            z-index: 10;
            background: white;
            padding: 60px 72px;
            border-radius: 28px;
            box-shadow: 0 25px 80px rgba(0,0,0,0.08);
            text-align: center;
            max-width: 520px;
            min-width: 440px;
            border: 1px solid rgba(0,0,0,0.05);
            animation: slideUp 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .logo {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            border-radius: 22px;
            margin: 0 auto 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 10px 40px rgba(16, 185, 129, 0.3);
        }
        .logo svg { width: 40px; height: 40px; color: white; }
        .badge {
            display: inline-block;
            padding: 8px 18px;
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.2);
            border-radius: 100px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 1.5px;
            color: #10b981;
            margin-bottom: 20px;
        }
        h1 {
            font-weight: 800;
            font-size: 32px;
            color: #111827;
            margin: 0 0 16px 0;
            letter-spacing: -0.5px;
        }
        h1 span { color: #10b981; }
        p {
            color: #6b7280;
            margin: 0 0 36px 0;
            font-size: 16px;
            line-height: 1.6;
        }
        .features {
            text-align: left;
            margin-bottom: 32px;
        }
        .feature {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 0;
            font-size: 14px;
            color: #4b5563;
        }
        .feature svg { width: 18px; height: 18px; color: #10b981; flex-shrink: 0; }
        .close-msg {
            font-size: 13px;
            color: #9ca3af;
            padding-top: 24px;
            border-top: 1px solid #f3f4f6;
        }
        .confetti {
            position: fixed;
            width: 15px;
            height: 20px;
            top: -30px;
            animation: fall linear forwards;
        }
        @keyframes fall {
            to { transform: translateY(110vh) rotate(720deg); }
        }
    </style>
</head>
<body>
    <div class="bg-pattern"></div>
    <div class="container">
        <div class="logo">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
        </div>
        <div class="badge">AUTHENTICATION COMPLETE</div>
        <h1>Welcome to <span>Trueears</span></h1>
        <p>Your account is now connected. You're all set to use voice dictation with AI-powered formatting.</p>
        <div class="features">
            <div class="feature">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Cloud-synced settings
            </div>
            <div class="feature">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                App-specific profiles
            </div>
            <div class="feature">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Priority support access
            </div>
        </div>
        <p class="close-msg">You can close this window and return to Trueears.</p>
    </div>
    <script>
        const colors = ['#3b82f6', '#ef4444', '#eab308', '#10b981'];
        for(let i = 0; i < 30; i++) {
            const c = document.createElement('div');
            c.className = 'confetti';
            c.style.left = Math.random() * 100 + 'vw';
            c.style.background = colors[Math.floor(Math.random() * colors.length)];
            c.style.animationDuration = (Math.random() * 2 + 3) + 's';
            c.style.animationDelay = Math.random() * 2 + 's';
            document.body.appendChild(c);
        }
    </script>
</body>
</html>"#
                    ).with_header(
                        tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"text/html; charset=utf-8"[..]).unwrap()
                    );
                    let _ = request.respond(response);

                    // Exchange code for tokens in a separate async task
                    let app_clone = app.clone();
                    let config_clone = config.clone();

                    // Spawn async task to exchange code
                    tauri::async_runtime::spawn(async move {
                        match exchange_code_for_tokens(&config_clone.api_url, &code).await {
                            Ok(auth_response) => {
                                // Store tokens
                                if let Err(e) = store_tokens(
                                    &app_clone,
                                    &auth_response.access_token,
                                    &auth_response.refresh_token,
                                    &auth_response.user,
                                ) {
                                    log::error!("Failed to store tokens: {}", e);
                                    let _ = app_clone.emit("auth-error", e.to_string());
                                } else {
                                    log::info!(
                                        "User {} authenticated successfully",
                                        auth_response.user.email
                                    );
                                    let _ = app_clone.emit("auth-success", auth_response.user);
                                }
                            }
                            Err(e) => {
                                log::error!("Failed to exchange code: {}", e);
                                let _ = app_clone.emit("auth-error", e.to_string());
                            }
                        }
                    });

                    // Stop the server
                    running.store(false, Ordering::SeqCst);
                    break;
                } else {
                    // Error response
                    let response = tiny_http::Response::from_string(
                        "Authentication failed - no code received",
                    )
                    .with_status_code(400);
                    let _ = request.respond(response);
                }
            }
            Ok(None) => {
                // Timeout, continue waiting
                continue;
            }
            Err(e) => {
                log::error!("Callback server error: {}", e);
                break;
            }
        }
    }

    log::info!("Callback server stopped");
    Ok(())
}

/// Extract authorization code from callback URL
fn extract_code_from_url(url: &str) -> Option<String> {
    let parsed = url::Url::parse(&format!("http://localhost{}", url)).ok()?;
    for (key, value) in parsed.query_pairs() {
        if key == "code" {
            return Some(value.to_string());
        }
    }
    None
}

/// Exchange authorization code for tokens via API server
async fn exchange_code_for_tokens(api_url: &str, code: &str) -> Result<AuthResponse, AppError> {
    log::info!(
        "Exchanging code with API server at: {}/auth/google",
        api_url
    );

    let client = reqwest::Client::new();

    #[derive(Serialize)]
    struct CodeRequest {
        code: String,
    }

    let response = client
        .post(format!("{}/auth/google", api_url))
        .json(&CodeRequest {
            code: code.to_string(),
        })
        .send()
        .await
        .map_err(|e| {
            log::error!("HTTP request failed: {}", e);
            format!("Request failed: {}", e)
        })?;

    log::info!("Response status: {}", response.status());

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        log::error!("Auth failed: {}", error_text);
        return Err(format!("Authentication failed: {}", error_text).into());
    }

    let auth_response = response.json::<AuthResponse>().await.map_err(|e| {
        log::error!("Failed to parse response: {}", e);
        format!("Failed to parse response: {}", e)
    })?;

    log::info!(
        "Successfully got auth response for user: {}",
        auth_response.user.email
    );
    Ok(auth_response)
}

/// Refresh access token using refresh token
#[allow(dead_code)]
pub async fn refresh_tokens(
    app: &tauri::AppHandle<impl tauri::Runtime>,
    api_url: &str,
) -> Result<AuthResponse, AppError> {
    let refresh_token =
        get_refresh_token(app).ok_or_else(|| "No refresh token stored".to_string())?;

    let client = reqwest::Client::new();

    #[derive(Serialize)]
    struct RefreshRequest {
        refresh_token: String,
    }

    let response = client
        .post(format!("{}/auth/refresh", api_url))
        .json(&RefreshRequest { refresh_token })
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Token refresh failed: {}", error_text).into());
    }

    let auth_response: AuthResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    // Store new tokens
    store_tokens(
        app,
        &auth_response.access_token,
        &auth_response.refresh_token,
        &auth_response.user,
    )?;

    Ok(auth_response)
}

/// Logout user - clear tokens and optionally revoke on server
pub async fn logout(
    app: &tauri::AppHandle<impl tauri::Runtime>,
    api_url: &str,
) -> Result<(), AppError> {
    // Try to revoke on server (optional, don't fail if this doesn't work)
    if let Some(refresh_token) = get_refresh_token(app) {
        let client = reqwest::Client::new();

        #[derive(Serialize)]
        struct LogoutRequest {
            refresh_token: String,
        }

        let _ = client
            .post(format!("{}/auth/logout", api_url))
            .json(&LogoutRequest { refresh_token })
            .send()
            .await;
    }

    // Clear local tokens
    clear_tokens(app)?;

    log::info!("User logged out");
    Ok(())
}

/// Get current auth state
pub fn get_auth_state(app: &tauri::AppHandle<impl tauri::Runtime>) -> AuthState {
    log::info!("Checking auth state from file storage");

    match get_stored_user_info(app) {
        Some(user) => {
            log::info!("Found user info: {}", user.email);
            if get_access_token(app).is_some() {
                log::info!("Found access token, user is authenticated");
                return AuthState {
                    is_authenticated: true,
                    user: Some(user),
                };
            } else {
                log::warn!("User info exists but no access token");
            }
        }
        None => {
            log::info!("No user info found in storage");
        }
    }

    AuthState {
        is_authenticated: false,
        user: None,
    }
}
