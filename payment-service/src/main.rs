mod config;
mod db;
mod errors;
mod handlers;
mod middleware;
mod models;
mod services;
mod utils;

use axum::{
    routing::{get, post},
    Router,
};
use config::Config;
use handlers::checkout::create_checkout;
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

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

    // Load environment variables
    let dotenv_result = dotenvy::dotenv();
    match &dotenv_result {
        Ok(path) => tracing::info!("Loaded .env from: {:?}", path),
        Err(e) => tracing::warn!("No .env file found: {}", e),
    }

    // Load configuration
    let config = Config::from_env().expect("Failed to load configuration");

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
    let cors = CorsLayer::new()
        .allow_origin(Any) // In production, restrict this to your app's origin
        .allow_methods(Any)
        .allow_headers(Any);

    // Build router
    let app = Router::new()
        // Public routes
        .route("/health", get(health_check))
        .route("/api/checkout", post(create_checkout))
        // Protected routes will be added here
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
