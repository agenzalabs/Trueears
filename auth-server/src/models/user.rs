use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct User {
    pub id: Uuid,
    pub google_id: String,
    pub email: String,
    pub name: Option<String>,
    pub picture: Option<String>,
    pub created_at: DateTime<Utc>,
    pub last_login: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct RefreshToken {
    pub id: Uuid,
    pub user_id: Uuid,
    pub token_hash: String,
    pub expires_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub revoked: bool,
}

/// Response sent to the Tauri app after successful authentication
#[derive(Debug, Serialize, Deserialize)]
pub struct AuthResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: i64,
    pub user: UserInfo,
}

/// User info sent to the frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserInfo {
    pub id: String,
    pub email: String,
    pub name: Option<String>,
    pub picture: Option<String>,
}

impl From<User> for UserInfo {
    fn from(user: User) -> Self {
        UserInfo {
            id: user.id.to_string(),
            email: user.email,
            name: user.name,
            picture: user.picture,
        }
    }
}

/// Google's token response
#[derive(Debug, Deserialize)]
pub struct GoogleTokenResponse {
    pub access_token: String,
    pub id_token: String,
    pub expires_in: i64,
    pub token_type: String,
    pub scope: String,
    #[serde(default)]
    pub refresh_token: Option<String>,
}

/// Google ID token claims (decoded JWT payload)
#[derive(Debug, Deserialize)]
pub struct GoogleIdTokenClaims {
    pub sub: String,        // Google user ID
    pub email: String,
    #[serde(default)]
    pub email_verified: bool,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub picture: Option<String>,
    pub aud: String,        // Should match our client ID
    pub iss: String,        // Should be accounts.google.com
    pub exp: i64,
    pub iat: i64,
}

/// Request to exchange Google auth code for tokens
#[derive(Debug, Deserialize)]
pub struct GoogleAuthRequest {
    pub code: String,
}

/// Request to refresh tokens
#[derive(Debug, Deserialize)]
pub struct RefreshRequest {
    pub refresh_token: String,
}

/// JWT claims for our access token
#[derive(Debug, Serialize, Deserialize)]
pub struct AccessTokenClaims {
    pub sub: String,        // User ID
    pub email: String,
    pub exp: i64,
    pub iat: i64,
}

/// JWT claims for our refresh token
#[derive(Debug, Serialize, Deserialize)]
pub struct RefreshTokenClaims {
    pub sub: String,        // User ID
    pub jti: String,        // Unique token ID
    pub exp: i64,
    pub iat: i64,
}
