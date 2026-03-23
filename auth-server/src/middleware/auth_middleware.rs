use axum::{
    extract::{Request, State},
    http::{header, StatusCode},
    middleware::Next,
    response::Response,
};

use crate::handlers::auth::AppState;

/// Middleware to validate JWT access token
/// Extracts user_id from token and adds it to request extensions
pub async fn auth_middleware(
    State(state): State<AppState>,
    mut request: Request,
    next: Next,
) -> Result<Response, (StatusCode, String)> {
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

    // Add user_id to request extensions for handlers to use
    request.extensions_mut().insert(claims.sub);

    Ok(next.run(request).await)
}

/// Extract user ID from request extensions (set by auth_middleware)
pub fn get_user_id_from_request(request: &Request) -> Option<String> {
    request.extensions().get::<String>().cloned()
}
