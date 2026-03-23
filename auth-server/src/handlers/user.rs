use axum::{
    extract::State,
    http::StatusCode,
    Json,
};

use crate::{
    handlers::auth::AppState,
    models::{User, UserInfo},
};

/// Get current user info
/// GET /auth/user
/// Requires Authorization header with Bearer token
pub async fn get_current_user(
    State(state): State<AppState>,
    user_id: String,  // Extracted by auth middleware
) -> Result<Json<UserInfo>, (StatusCode, String)> {
    let uuid = uuid::Uuid::parse_str(&user_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid user ID".to_string()))?;

    let user = sqlx::query_as::<_, User>(
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

    Ok(Json(UserInfo::from(user)))
}
