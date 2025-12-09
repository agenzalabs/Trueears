//! OAuth authentication module for Scribe
//! Handles Google OAuth flow, token storage, and API communication

use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::path::PathBuf;
use std::fs;
use tauri::Emitter;

// File storage for auth data (more reliable than keyring on Windows)
const AUTH_FILE_NAME: &str = "auth.json";

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
    pub fn from_env() -> Option<Self> {
        let google_client_id = std::env::var("GOOGLE_CLIENT_ID").ok()?;
        let api_url = std::env::var("API_URL").unwrap_or_else(|_| "http://localhost:3001".to_string());
        
        Some(OAuthConfig {
            google_client_id,
            api_url,
            callback_port: 8585,
        })
    }
}

// ============ File-based Token Storage ============

/// Get the auth file path
fn get_auth_file_path() -> Option<PathBuf> {
    // Use the system's app data directory
    #[cfg(target_os = "windows")]
    {
        if let Some(app_data) = std::env::var_os("APPDATA") {
            let path = PathBuf::from(app_data).join("scribe").join(AUTH_FILE_NAME);
            // Ensure directory exists
            if let Some(parent) = path.parent() {
                let _ = fs::create_dir_all(parent);
            }
            return Some(path);
        }
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        if let Some(home) = std::env::var_os("HOME") {
            let path = PathBuf::from(home).join(".scribe").join(AUTH_FILE_NAME);
            if let Some(parent) = path.parent() {
                let _ = fs::create_dir_all(parent);
            }
            return Some(path);
        }
    }
    
    None
}

/// Store tokens in file system
pub fn store_tokens(access_token: &str, refresh_token: &str, user_info: &UserInfo) -> Result<(), String> {
    let path = get_auth_file_path().ok_or("Could not determine auth file path")?;
    
    let storage = AuthStorage {
        access_token: access_token.to_string(),
        refresh_token: refresh_token.to_string(),
        user: user_info.clone(),
    };
    
    let json = serde_json::to_string_pretty(&storage)
        .map_err(|e| format!("Failed to serialize auth data: {}", e))?;
    
    fs::write(&path, json)
        .map_err(|e| format!("Failed to write auth file: {}", e))?;
    
    log::info!("Tokens stored to file: {:?}", path);
    Ok(())
}

/// Get access token from file
pub fn get_access_token() -> Option<String> {
    let path = get_auth_file_path()?;
    let content = fs::read_to_string(&path).ok()?;
    let storage: AuthStorage = serde_json::from_str(&content).ok()?;
    Some(storage.access_token)
}

/// Get refresh token from file
pub fn get_refresh_token() -> Option<String> {
    let path = get_auth_file_path()?;
    let content = fs::read_to_string(&path).ok()?;
    let storage: AuthStorage = serde_json::from_str(&content).ok()?;
    Some(storage.refresh_token)
}

/// Get stored user info from file
pub fn get_stored_user_info() -> Option<UserInfo> {
    let path = get_auth_file_path()?;
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
pub fn clear_tokens() -> Result<(), String> {
    if let Some(path) = get_auth_file_path() {
        if path.exists() {
            fs::remove_file(&path)
                .map_err(|e| format!("Failed to delete auth file: {}", e))?;
        }
    }
    
    log::info!("Auth data cleared");
    Ok(())
}

// ============ OAuth Flow ============

/// Start the Google OAuth flow
pub async fn start_google_oauth<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    config: OAuthConfig,
) -> Result<(), String> {
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

    // Open browser
    log::info!("Opening browser for Google login: {}", oauth_url);
    
    // Use shell open to open the URL
    #[cfg(target_os = "windows")]
    {
        // Use PowerShell's Start-Process to properly handle URLs with special characters
        std::process::Command::new("powershell")
            .args(["-Command", &format!("Start-Process '{}'", oauth_url)])
            .spawn()
            .map_err(|e| format!("Failed to open browser: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&oauth_url)
            .spawn()
            .map_err(|e| format!("Failed to open browser: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&oauth_url)
            .spawn()
            .map_err(|e| format!("Failed to open browser: {}", e))?;
    }

    Ok(())
}

/// Run local HTTP server to catch OAuth callback
fn run_callback_server<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    config: OAuthConfig,
    running: Arc<AtomicBool>,
) -> Result<(), String> {
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
                    
                    // Send success response to browser
                    let response = tiny_http::Response::from_string(
                        r#"<!DOCTYPE html>
<html>
<head>
    <title>Authentication Successful</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #10b981, #059669);
        }
        .container {
            background: white;
            padding: 40px 60px;
            border-radius: 16px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.15);
            text-align: center;
        }
        h1 { color: #10b981; margin: 0 0 10px 0; }
        p { color: #666; margin: 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>✓ Authentication Successful</h1>
        <p>You can close this window and return to Scribe.</p>
    </div>
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
                                    &auth_response.access_token,
                                    &auth_response.refresh_token,
                                    &auth_response.user,
                                ) {
                                    log::error!("Failed to store tokens: {}", e);
                                    let _ = app_clone.emit("auth-error", e);
                                } else {
                                    log::info!("User {} authenticated successfully", auth_response.user.email);
                                    let _ = app_clone.emit("auth-success", auth_response.user);
                                }
                            }
                            Err(e) => {
                                log::error!("Failed to exchange code: {}", e);
                                let _ = app_clone.emit("auth-error", e);
                            }
                        }
                    });

                    // Stop the server
                    running.store(false, Ordering::SeqCst);
                    break;
                } else {
                    // Error response
                    let response = tiny_http::Response::from_string("Authentication failed - no code received")
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
async fn exchange_code_for_tokens(api_url: &str, code: &str) -> Result<AuthResponse, String> {
    log::info!("Exchanging code with API server at: {}/auth/google", api_url);
    
    let client = reqwest::Client::new();
    
    #[derive(Serialize)]
    struct CodeRequest {
        code: String,
    }

    let response = client
        .post(&format!("{}/auth/google", api_url))
        .json(&CodeRequest { code: code.to_string() })
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
        return Err(format!("Authentication failed: {}", error_text));
    }

    let auth_response = response
        .json::<AuthResponse>()
        .await
        .map_err(|e| {
            log::error!("Failed to parse response: {}", e);
            format!("Failed to parse response: {}", e)
        })?;
    
    log::info!("Successfully got auth response for user: {}", auth_response.user.email);
    Ok(auth_response)
}

/// Refresh access token using refresh token
pub async fn refresh_tokens(api_url: &str) -> Result<AuthResponse, String> {
    let refresh_token = get_refresh_token()
        .ok_or_else(|| "No refresh token stored".to_string())?;

    let client = reqwest::Client::new();
    
    #[derive(Serialize)]
    struct RefreshRequest {
        refresh_token: String,
    }

    let response = client
        .post(&format!("{}/auth/refresh", api_url))
        .json(&RefreshRequest { refresh_token })
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Token refresh failed: {}", error_text));
    }

    let auth_response: AuthResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    // Store new tokens
    store_tokens(
        &auth_response.access_token,
        &auth_response.refresh_token,
        &auth_response.user,
    )?;

    Ok(auth_response)
}

/// Logout user - clear tokens and optionally revoke on server
pub async fn logout(api_url: &str) -> Result<(), String> {
    // Try to revoke on server (optional, don't fail if this doesn't work)
    if let Some(refresh_token) = get_refresh_token() {
        let client = reqwest::Client::new();
        
        #[derive(Serialize)]
        struct LogoutRequest {
            refresh_token: String,
        }

        let _ = client
            .post(&format!("{}/auth/logout", api_url))
            .json(&LogoutRequest { refresh_token })
            .send()
            .await;
    }

    // Clear local tokens
    clear_tokens()?;

    log::info!("User logged out");
    Ok(())
}

/// Get current auth state
pub fn get_auth_state() -> AuthState {
    log::info!("Checking auth state from file storage");
    
    match get_stored_user_info() {
        Some(user) => {
            log::info!("Found user info: {}", user.email);
            if get_access_token().is_some() {
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
