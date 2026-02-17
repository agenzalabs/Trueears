mod config;
mod db;
mod errors;
mod handlers;
mod middleware;
mod models;
mod services;
mod utils;

use axum::{
    http::HeaderValue,
    middleware::from_fn_with_state,
    routing::{get, post},
    Router,
};
use config::Config;
use handlers::{
    checkout::create_checkout,
    license::{activate_license, deactivate_license, get_license_status},
    orders::get_my_orders,
    webhooks::handle_lemonsqueezy_webhook,
};
use middleware::auth_middleware;
use sha2::{Digest, Sha256};
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

fn load_env_with_workspace_fallback() {
    // Load shared workspace env first, overriding stale exported shell values.
    // This keeps local dev deterministic when multiple services share JWT/API vars.
    match dotenvy::from_filename_override("../.env") {
        Ok(path) => tracing::info!("Loaded workspace env from {:?}", path),
        Err(e) => tracing::debug!("Workspace env not loaded: {}", e),
    }

    // Then load payment-service local env only for missing values.
    match dotenvy::from_filename(".env") {
        Ok(path) => tracing::info!("Loaded payment-service env fallback from {:?}", path),
        Err(e) => tracing::debug!("Payment-service env fallback not loaded: {}", e),
    }
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

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "payment_service=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    load_env_with_workspace_fallback();

    // Load configuration
    let config = Config::from_env().expect("Failed to load configuration");
    tracing::info!(
        "JWT secret fingerprint={} len={}",
        secret_fingerprint(&config.jwt_secret),
        config.jwt_secret.len()
    );

    tracing::info!(
        "Starting payment service on {}:{}",
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
    tracing::info!("LemonSqueezy test mode: {}", config.lemonsqueezy_test_mode);

    // Create database pool
    let pool = db::create_pool(&config.database_url)
        .await
        .expect("Failed to create database pool");

    // Run migrations
    db::run_migrations(&pool)
        .await
        .expect("Failed to run migrations");

    // Create app state
    let state = AppState {
        pool,
        config: config.clone(),
    };

    // Configure CORS
    let cors = if config.is_production {
        let origins = config
            .payment_allowed_origins
            .iter()
            .filter_map(|origin| HeaderValue::from_str(origin).ok())
            .collect::<Vec<_>>();
        if origins.is_empty() {
            CorsLayer::new().allow_methods(Any).allow_headers(Any)
        } else {
            CorsLayer::new()
                .allow_origin(origins)
                .allow_methods(Any)
                .allow_headers(Any)
        }
    } else {
        CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any)
    };

    let protected_routes = Router::new()
        .route("/api/checkout", post(create_checkout))
        .route("/api/license/status", get(get_license_status))
        .route("/api/license/activate", post(activate_license))
        .route("/api/license/deactivate", post(deactivate_license))
        .route("/api/orders/me", get(get_my_orders))
        .route_layer(from_fn_with_state(state.clone(), auth_middleware));

    // Build router
    let app = Router::new()
        .route("/health", get(health_check))
        .route("/webhooks/lemonsqueezy", post(handle_lemonsqueezy_webhook))
        .merge(protected_routes)
        .layer(cors)
        .with_state(state);

    // Start server
    let addr: SocketAddr = format!("{}:{}", config.api_host, config.api_port)
        .parse()
        .expect("Invalid address");

    tracing::info!("Payment service listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

/// Application state shared across handlers
#[derive(Clone)]
pub struct AppState {
    pub pool: sqlx::PgPool,
    pub config: Config,
}

/// Health check endpoint
async fn health_check() -> &'static str {
    "OK"
}
