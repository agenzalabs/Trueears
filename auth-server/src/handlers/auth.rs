use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use chrono::{DateTime, Utc};
use sqlx::PgPool;

use crate::{
    config::Config,
    models::{
        AuthResponse, GoogleAuthRequest, GoogleIdTokenClaims, GoogleTokenResponse, RefreshRequest,
        User, UserInfo,
    },
    utils::{hash_token, JwtManager},
};

/// Application state shared across handlers
#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub config: Config,
    pub jwt: JwtManager,
}

/// Exchange Google authorization code for app tokens
/// POST /auth/google
pub async fn google_auth(
    State(state): State<AppState>,
    Json(payload): Json<GoogleAuthRequest>,
) -> Result<Json<AuthResponse>, (StatusCode, String)> {
    tracing::info!("Received Google auth request");

    // 1. Exchange code for Google tokens
    let google_tokens = exchange_code_for_tokens(&state.config, &payload.code)
        .await
        .map_err(|e| {
            tracing::error!("Failed to exchange code: {}", e);
            (
                StatusCode::BAD_REQUEST,
                format!("Failed to exchange code: {}", e),
            )
        })?;

    // 2. Decode and validate the ID token
    let mut claims = decode_id_token(&google_tokens.id_token, &state.config.google_client_id)
        .map_err(|e| {
            tracing::error!("Failed to decode ID token: {}", e);
            (StatusCode::BAD_REQUEST, format!("Invalid ID token: {}", e))
        })?;

    // Some Google accounts omit optional profile fields in the ID token.
    // Fetch userinfo as a fallback so we reliably persist picture/name.
    let needs_userinfo_fallback = claims
        .picture
        .as_deref()
        .map(|v| v.trim().is_empty())
        .unwrap_or(true)
        || claims
            .name
            .as_deref()
            .map(|v| v.trim().is_empty())
            .unwrap_or(true);

    if needs_userinfo_fallback {
        match fetch_google_user_info(&google_tokens.access_token).await {
            Ok(user_info) => {
                if claims
                    .name
                    .as_deref()
                    .map(|v| v.trim().is_empty())
                    .unwrap_or(true)
                {
                    if let Some(name) = user_info.name.filter(|v| !v.trim().is_empty()) {
                        claims.name = Some(name);
                    }
                }

                if claims
                    .picture
                    .as_deref()
                    .map(|v| v.trim().is_empty())
                    .unwrap_or(true)
                {
                    if let Some(picture) = user_info.picture.filter(|v| !v.trim().is_empty()) {
                        claims.picture = Some(picture);
                    }
                }
            }
            Err(err) => {
                tracing::warn!("Failed to fetch Google user info fallback: {}", err);
            }
        }
    }

    tracing::info!("Google auth for user: {}", claims.email);

    // 3. Create or update user in database
    let user = upsert_user(&state.pool, &claims).await.map_err(|e| {
        tracing::error!("Failed to upsert user: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Database error: {}", e),
        )
    })?;

    // 4. Generate our JWT tokens
    let user_id = user.id.to_string();

    let access_token = state
        .jwt
        .generate_access_token(&user_id, &user.email)
        .map_err(|e| {
            tracing::error!("Failed to generate access token: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Token generation failed".to_string(),
            )
        })?;

    let (refresh_token, jti, expires_at) =
        state.jwt.generate_refresh_token(&user_id).map_err(|e| {
            tracing::error!("Failed to generate refresh token: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Token generation failed".to_string(),
            )
        })?;

    // 5. Store refresh token hash in database
    store_refresh_token(&state.pool, user.id, &refresh_token, expires_at)
        .await
        .map_err(|e| {
            tracing::error!("Failed to store refresh token: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to store session".to_string(),
            )
        })?;

    tracing::info!("User {} authenticated successfully", user.email);

    Ok(Json(AuthResponse {
        access_token,
        refresh_token,
        expires_in: state.jwt.access_expiry_seconds(),
        user: UserInfo::from(user),
    }))
}

/// Refresh access token using refresh token
/// POST /auth/refresh
pub async fn refresh_token(
    State(state): State<AppState>,
    Json(payload): Json<RefreshRequest>,
) -> Result<Json<AuthResponse>, (StatusCode, String)> {
    tracing::info!("Received token refresh request");

    // 1. Validate the refresh token JWT
    let claims = state
        .jwt
        .validate_refresh_token(&payload.refresh_token)
        .map_err(|e| {
            tracing::warn!("Invalid refresh token: {}", e);
            (
                StatusCode::UNAUTHORIZED,
                "Invalid refresh token".to_string(),
            )
        })?;

    // 2. Check if token exists and is not revoked in database
    let token_hash = hash_token(&payload.refresh_token);
    let stored_token = sqlx::query_as::<_, (uuid::Uuid, bool, DateTime<Utc>)>(
        "SELECT user_id, revoked, expires_at FROM refresh_tokens WHERE token_hash = $1",
    )
    .bind(&token_hash)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| {
        tracing::error!("Database error checking refresh token: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Database error".to_string(),
        )
    })?;

    let (user_id, revoked, expires_at) = stored_token.ok_or_else(|| {
        tracing::warn!("Refresh token not found in database");
        (StatusCode::UNAUTHORIZED, "Token not found".to_string())
    })?;

    if revoked {
        tracing::warn!("Attempted to use revoked refresh token");
        return Err((
            StatusCode::UNAUTHORIZED,
            "Token has been revoked".to_string(),
        ));
    }

    if expires_at < Utc::now() {
        tracing::warn!("Refresh token has expired");
        return Err((StatusCode::UNAUTHORIZED, "Token has expired".to_string()));
    }

    // 3. Get user info
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
        .bind(user_id)
        .fetch_optional(&state.pool)
        .await
        .map_err(|e| {
            tracing::error!("Database error fetching user: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Database error".to_string(),
            )
        })?
        .ok_or_else(|| {
            tracing::error!("User not found for refresh token");
            (StatusCode::UNAUTHORIZED, "User not found".to_string())
        })?;

    // 4. Revoke old refresh token
    sqlx::query("UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1")
        .bind(&token_hash)
        .execute(&state.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to revoke old token: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Database error".to_string(),
            )
        })?;

    // 5. Generate new tokens
    let user_id_str = user.id.to_string();

    let access_token = state
        .jwt
        .generate_access_token(&user_id_str, &user.email)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let (new_refresh_token, _, new_expires_at) = state
        .jwt
        .generate_refresh_token(&user_id_str)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 6. Store new refresh token
    store_refresh_token(&state.pool, user.id, &new_refresh_token, new_expires_at)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    tracing::info!("Token refreshed for user: {}", user.email);

    Ok(Json(AuthResponse {
        access_token,
        refresh_token: new_refresh_token,
        expires_in: state.jwt.access_expiry_seconds(),
        user: UserInfo::from(user),
    }))
}

/// Logout - revoke refresh token
/// POST /auth/logout
pub async fn logout(
    State(state): State<AppState>,
    Json(payload): Json<RefreshRequest>,
) -> impl IntoResponse {
    tracing::info!("Received logout request");

    let token_hash = hash_token(&payload.refresh_token);

    let result = sqlx::query("UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1")
        .bind(&token_hash)
        .execute(&state.pool)
        .await;

    match result {
        Ok(_) => {
            tracing::info!("Logout successful");
            StatusCode::OK
        }
        Err(e) => {
            tracing::error!("Logout failed: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}

// ============ Helper Functions ============

/// Exchange authorization code for Google tokens
async fn exchange_code_for_tokens(
    config: &Config,
    code: &str,
) -> Result<GoogleTokenResponse, String> {
    let client = reqwest::Client::new();

    let params = [
        ("code", code),
        ("client_id", &config.google_client_id),
        ("client_secret", &config.google_client_secret),
        ("redirect_uri", &config.oauth_redirect_uri),
        ("grant_type", "authorization_code"),
    ];

    let response = client
        .post("https://oauth2.googleapis.com/token")
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Google token exchange failed: {}", error_text));
    }

    response
        .json::<GoogleTokenResponse>()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))
}

#[derive(Debug, serde::Deserialize)]
struct GoogleUserInfoResponse {
    #[serde(default)]
    name: Option<String>,
    #[serde(default)]
    picture: Option<String>,
}

async fn fetch_google_user_info(access_token: &str) -> Result<GoogleUserInfoResponse, String> {
    let client = reqwest::Client::new();

    let response = client
        .get("https://openidconnect.googleapis.com/v1/userinfo")
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|e| format!("Google userinfo request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!(
            "Google userinfo request failed with {}: {}",
            status, error_text
        ));
    }

    response
        .json::<GoogleUserInfoResponse>()
        .await
        .map_err(|e| format!("Failed to parse Google userinfo response: {}", e))
}

/// Decode Google's ID token (JWT) to extract user claims
/// Note: In production, you should also verify the signature using Google's public keys
fn decode_id_token(id_token: &str, expected_audience: &str) -> Result<GoogleIdTokenClaims, String> {
    // Split the JWT and decode the payload (middle part)
    let parts: Vec<&str> = id_token.split('.').collect();
    if parts.len() != 3 {
        return Err("Invalid JWT format".to_string());
    }

    // Decode base64url payload
    let payload =
        base64::Engine::decode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, parts[1])
            .map_err(|e| format!("Failed to decode payload: {}", e))?;

    let claims: GoogleIdTokenClaims =
        serde_json::from_slice(&payload).map_err(|e| format!("Failed to parse claims: {}", e))?;

    // Validate issuer
    if claims.iss != "https://accounts.google.com" && claims.iss != "accounts.google.com" {
        return Err("Invalid issuer".to_string());
    }

    // Validate audience
    if claims.aud != expected_audience {
        return Err("Invalid audience".to_string());
    }

    // Check expiration
    if claims.exp < Utc::now().timestamp() {
        return Err("Token has expired".to_string());
    }

    Ok(claims)
}

/// Create or update user in database
async fn upsert_user(pool: &PgPool, claims: &GoogleIdTokenClaims) -> Result<User, sqlx::Error> {
    // Try to find existing user
    let existing = sqlx::query_as::<_, User>("SELECT * FROM users WHERE google_id = $1")
        .bind(&claims.sub)
        .fetch_optional(pool)
        .await?;

    if let Some(mut user) = existing {
        // Update last login and possibly other fields
        user = sqlx::query_as::<_, User>(
            r#"UPDATE users 
               SET last_login = NOW(), name = $2, picture = $3, email = $4
               WHERE google_id = $1
               RETURNING *"#,
        )
        .bind(&claims.sub)
        .bind(&claims.name)
        .bind(&claims.picture)
        .bind(&claims.email)
        .fetch_one(pool)
        .await?;

        Ok(user)
    } else {
        // Create new user
        let user = sqlx::query_as::<_, User>(
            r#"INSERT INTO users (google_id, email, name, picture)
               VALUES ($1, $2, $3, $4)
               RETURNING *"#,
        )
        .bind(&claims.sub)
        .bind(&claims.email)
        .bind(&claims.name)
        .bind(&claims.picture)
        .fetch_one(pool)
        .await?;

        Ok(user)
    }
}

/// Store refresh token hash in database
async fn store_refresh_token(
    pool: &PgPool,
    user_id: uuid::Uuid,
    token: &str,
    expires_at: i64,
) -> Result<(), String> {
    let token_hash = hash_token(token);
    let expires_at = DateTime::from_timestamp(expires_at, 0)
        .ok_or_else(|| "Invalid expiry timestamp".to_string())?;

    sqlx::query(
        r#"INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
           VALUES ($1, $2, $3)"#,
    )
    .bind(user_id)
    .bind(token_hash)
    .bind(expires_at)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}
