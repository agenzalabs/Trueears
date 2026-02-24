use axum::{
    extract::{Request, State},
    http::header,
    middleware::Next,
    response::Response,
};
use uuid::Uuid;

use crate::{errors::PaymentError, utils::validate_access_token, AppState};

#[derive(Debug, Clone)]
pub struct AuthenticatedUser {
    pub user_id: Uuid,
    pub email: String,
}

pub async fn auth_middleware(
    State(state): State<AppState>,
    mut request: Request,
    next: Next,
) -> Result<Response, PaymentError> {
    let auth_header = request
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .ok_or_else(|| {
            tracing::warn!("Missing Authorization header on protected route");
            PaymentError::MissingAuthHeader
        })?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or_else(|| {
            tracing::warn!("Invalid Authorization format on protected route");
            PaymentError::Unauthorized
        })?;

    let claims = validate_access_token(token, &state.config.jwt_secret).map_err(|e| {
        tracing::warn!(error = %e, "JWT validation failed in payment auth middleware");
        e
    })?;
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| {
            tracing::warn!("JWT sub claim is not a valid UUID");
            PaymentError::InvalidToken("Invalid user ID in token".to_string())
        })?;

    request.extensions_mut().insert(AuthenticatedUser {
        user_id,
        email: claims.email,
    });

    Ok(next.run(request).await)
}
