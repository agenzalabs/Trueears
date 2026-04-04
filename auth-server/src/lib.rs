pub mod config;
pub mod db;
pub mod handlers;
pub mod middleware;
pub mod models;
pub mod utils;

use axum::{
    extract::{Request, State},
    http::{header, Method, StatusCode},
    routing::{get, post},
    Router,
};
use handlers::auth::AppState;
use sha2::{Digest, Sha256};
use std::{fs, path::Path};
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::{
    config::Config,
    handlers::{google_auth, logout, refresh_token},
    models::UserInfo,
    utils::JwtManager,
};

pub fn init_tracing() {
    let _ = tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "auth_server=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .try_init();
}

pub fn load_env_with_workspace_fallback() {
    // Clear known config vars so a stale shell session cannot override file-based values.
    for key in [
        "DATABASE_URL",
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
        "JWT_SECRET",
        "JWT_ACCESS_EXPIRY_SECONDS",
        "JWT_REFRESH_EXPIRY_SECONDS",
        "API_HOST",
        "API_PORT",
        "PORT",
        "API_URL",
        "OAUTH_REDIRECT_URI",
        "RUST_ENV",
    ] {
        std::env::remove_var(key);
    }

    load_env_file(Path::new("../.env"), false, "workspace");
    load_env_file(Path::new(".env"), true, "auth-server");
}

fn load_env_file(path: &Path, overwrite: bool, label: &str) {
    let contents = match fs::read_to_string(path) {
        Ok(contents) => contents,
        Err(error) => {
            tracing::debug!("{} env not loaded from {:?}: {}", label, path, error);
            return;
        }
    };

    for raw_line in contents.lines() {
        let line = raw_line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        let Some((key, value)) = line.split_once('=') else {
            continue;
        };

        let key = key.trim();
        let value = value.trim().trim_matches('"');

        if overwrite || std::env::var_os(key).is_none() {
            std::env::set_var(key, value);
        }
    }

    tracing::info!("Loaded {} env from {:?}", label, path);
}

fn secret_fingerprint(secret: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(secret.as_bytes());
    let digest = hasher.finalize();
    digest
        .iter()
        .take(6)
        .map(|b| format!("{:02x}", b))
        .collect::<String>()
}

pub async fn build_app_from_env() -> Result<(Router, Config), String> {
    load_env_with_workspace_fallback();

    let config = Config::from_env().map_err(|e| format!("Failed to load configuration: {}", e))?;
    tracing::info!(
        "JWT secret fingerprint={} len={}",
        secret_fingerprint(&config.jwt_secret),
        config.jwt_secret.len()
    );

    // Debug: show what we're connecting to (hide password)
    let db_host = config
        .database_url
        .split('@')
        .nth(1)
        .and_then(|s| s.split('/').next())
        .unwrap_or("unknown");
    tracing::info!("Database host: {}", db_host);

    tracing::info!(
        "Starting auth server on {}:{}",
        config.api_host,
        config.api_port
    );
    tracing::info!(
        "Environment: {}",
        if config.is_production {
            "production"
        } else {
            "development"
        }
    );

    let pool = db::create_pool(&config.database_url)
        .await
        .map_err(|e| format!("Failed to create database pool: {}", e))?;

    db::run_migrations(&pool)
        .await
        .map_err(|e| format!("Failed to run migrations: {}", e))?;

    let jwt = JwtManager::new(
        &config.jwt_secret,
        config.jwt_access_expiry_seconds,
        config.jwt_refresh_expiry_seconds,
    );

    let state = AppState {
        pool,
        config: config.clone(),
        jwt,
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION]);

    let app = Router::new()
        .route("/auth/google", post(google_auth))
        .route("/auth/refresh", post(refresh_token))
        .route("/auth/logout", post(logout))
        .route("/auth/user", get(get_user_with_auth))
        .route("/health", get(health_check))
        .layer(cors)
        .with_state(state);

    Ok((app, config))
}

async fn health_check() -> &'static str {
    "OK"
}

async fn get_user_with_auth(
    State(state): State<AppState>,
    request: Request,
) -> Result<axum::Json<UserInfo>, (StatusCode, String)> {
    let auth_header = request
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .ok_or_else(|| {
            (
                StatusCode::UNAUTHORIZED,
                "Missing authorization header".to_string(),
            )
        })?;

    let token = auth_header.strip_prefix("Bearer ").ok_or_else(|| {
        (
            StatusCode::UNAUTHORIZED,
            "Invalid authorization format".to_string(),
        )
    })?;

    let claims = state.jwt.validate_access_token(token).map_err(|e| {
        tracing::warn!("Invalid access token: {}", e);
        (
            StatusCode::UNAUTHORIZED,
            "Invalid or expired token".to_string(),
        )
    })?;

    let uuid = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid user ID".to_string()))?;

    let user = sqlx::query_as::<_, models::User>("SELECT * FROM users WHERE id = $1")
        .bind(uuid)
        .fetch_optional(&state.pool)
        .await
        .map_err(|e| {
            tracing::error!("Database error: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Database error".to_string(),
            )
        })?
        .ok_or_else(|| (StatusCode::NOT_FOUND, "User not found".to_string()))?;

    Ok(axum::Json(UserInfo::from(user)))
}
