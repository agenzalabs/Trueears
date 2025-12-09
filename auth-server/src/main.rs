mod config;
mod db;
mod handlers;
mod middleware;
mod models;
mod utils;

use axum::{
    extract::{Request, State},
    http::{header, Method, StatusCode},
    middleware::Next,
    response::Response,
    routing::{get, post},
    Extension, Router,
};
use handlers::auth::AppState;
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::{
    config::Config,
    handlers::{google_auth, logout, refresh_token},
    models::UserInfo,
    utils::JwtManager,
};

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "auth_server=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load environment variables
    let dotenv_result = dotenvy::dotenv();
    match &dotenv_result {
        Ok(path) => tracing::info!("Loaded .env from: {:?}", path),
        Err(e) => tracing::warn!("No .env file found: {}", e),
    }
    
    // Load configuration
    let config = Config::from_env().expect("Failed to load configuration");
    
    // Debug: show what we're connecting to (hide password)
    let db_host = config.database_url
        .split('@')
        .nth(1)
        .and_then(|s| s.split('/').next())
        .unwrap_or("unknown");
    tracing::info!("Database host: {}", db_host);
    
    tracing::info!("Starting auth server on {}:{}", config.api_host, config.api_port);
    tracing::info!("Environment: {}", if config.is_production { "production" } else { "development" });

    // Create database pool
    let pool = db::create_pool(&config.database_url)
        .await
        .expect("Failed to create database pool");

    // Run migrations
    db::run_migrations(&pool)
        .await
        .expect("Failed to run migrations");

    // Create JWT manager
    let jwt = JwtManager::new(
        &config.jwt_secret,
        config.jwt_access_expiry_seconds,
        config.jwt_refresh_expiry_seconds,
    );

    // Create app state
    let state = AppState {
        pool,
        config: config.clone(),
        jwt,
    };

    // Configure CORS
    let cors = CorsLayer::new()
        .allow_origin(Any) // In production, restrict this to your app's origin
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION]);

    // Build router
    let app = Router::new()
        // Public auth routes
        .route("/auth/google", post(google_auth))
        .route("/auth/refresh", post(refresh_token))
        .route("/auth/logout", post(logout))
        // Protected routes (with auth middleware)
        .route("/auth/user", get(get_user_with_auth))
        // Health check
        .route("/health", get(health_check))
        .layer(cors)
        .with_state(state);

    // Start server
    let addr: SocketAddr = format!("{}:{}", config.api_host, config.api_port)
        .parse()
        .expect("Invalid address");
    
    tracing::info!("Auth server listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

/// Health check endpoint
async fn health_check() -> &'static str {
    "OK"
}

/// Protected user endpoint - validates token and returns user info
async fn get_user_with_auth(
    State(state): State<AppState>,
    request: Request,
) -> Result<axum::Json<UserInfo>, (StatusCode, String)> {
    // Get Authorization header
    let auth_header = request
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .ok_or_else(|| {
            (StatusCode::UNAUTHORIZED, "Missing authorization header".to_string())
        })?;

    // Extract Bearer token
    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or_else(|| {
            (StatusCode::UNAUTHORIZED, "Invalid authorization format".to_string())
        })?;

    // Validate token
    let claims = state.jwt.validate_access_token(token)
        .map_err(|e| {
            tracing::warn!("Invalid access token: {}", e);
            (StatusCode::UNAUTHORIZED, "Invalid or expired token".to_string())
        })?;

    // Get user from database
    let uuid = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid user ID".to_string()))?;

    let user = sqlx::query_as::<_, models::User>(
        "SELECT * FROM users WHERE id = $1"
    )
    .bind(uuid)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, "Database error".to_string())
    })?
    .ok_or_else(|| (StatusCode::NOT_FOUND, "User not found".to_string()))?;

    Ok(axum::Json(UserInfo::from(user)))
}
