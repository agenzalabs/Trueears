use axum::{extract::State, http::StatusCode};

use crate::AppState;

/// Liveness probe — cheap, no dependencies. Used as the platform health check.
pub async fn health_check() -> &'static str {
    "OK"
}

/// Readiness probe — verifies the database is reachable before declaring the
/// service ready to take traffic. Returns 503 when the pool can't be queried.
pub async fn readiness_check(State(state): State<AppState>) -> StatusCode {
    match sqlx::query("SELECT 1").execute(&state.pool).await {
        Ok(_) => StatusCode::OK,
        Err(e) => {
            tracing::error!(error = %e, "Readiness check failed: database unreachable");
            StatusCode::SERVICE_UNAVAILABLE
        }
    }
}
