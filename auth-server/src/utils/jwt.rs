use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use sha2::{Digest, Sha256};
use uuid::Uuid;

use crate::models::{AccessTokenClaims, RefreshTokenClaims};

#[derive(Clone)]
pub struct JwtManager {
    encoding_key: EncodingKey,
    decoding_key: DecodingKey,
    access_expiry_seconds: i64,
    refresh_expiry_seconds: i64,
}

impl JwtManager {
    pub fn new(secret: &str, access_expiry: i64, refresh_expiry: i64) -> Self {
        JwtManager {
            encoding_key: EncodingKey::from_secret(secret.as_bytes()),
            decoding_key: DecodingKey::from_secret(secret.as_bytes()),
            access_expiry_seconds: access_expiry,
            refresh_expiry_seconds: refresh_expiry,
        }
    }

    /// Generate an access token for API authentication
    pub fn generate_access_token(
        &self,
        user_id: &str,
        email: &str,
    ) -> Result<String, jsonwebtoken::errors::Error> {
        let now = Utc::now();
        let expiry = now + Duration::seconds(self.access_expiry_seconds);

        let claims = AccessTokenClaims {
            sub: user_id.to_string(),
            email: email.to_string(),
            iat: now.timestamp(),
            exp: expiry.timestamp(),
        };

        encode(&Header::default(), &claims, &self.encoding_key)
    }

    /// Generate a refresh token with a unique ID
    pub fn generate_refresh_token(
        &self,
        user_id: &str,
    ) -> Result<(String, String, i64), jsonwebtoken::errors::Error> {
        let now = Utc::now();
        let expiry = now + Duration::seconds(self.refresh_expiry_seconds);
        let jti = Uuid::new_v4().to_string();

        let claims = RefreshTokenClaims {
            sub: user_id.to_string(),
            jti: jti.clone(),
            iat: now.timestamp(),
            exp: expiry.timestamp(),
        };

        let token = encode(&Header::default(), &claims, &self.encoding_key)?;
        Ok((token, jti, expiry.timestamp()))
    }

    /// Validate an access token and return the claims
    pub fn validate_access_token(
        &self,
        token: &str,
    ) -> Result<AccessTokenClaims, jsonwebtoken::errors::Error> {
        let token_data =
            decode::<AccessTokenClaims>(token, &self.decoding_key, &Validation::default())?;
        Ok(token_data.claims)
    }

    /// Validate a refresh token and return the claims
    pub fn validate_refresh_token(
        &self,
        token: &str,
    ) -> Result<RefreshTokenClaims, jsonwebtoken::errors::Error> {
        let token_data =
            decode::<RefreshTokenClaims>(token, &self.decoding_key, &Validation::default())?;
        Ok(token_data.claims)
    }

    pub fn access_expiry_seconds(&self) -> i64 {
        self.access_expiry_seconds
    }
}

/// Hash a refresh token for secure storage
pub fn hash_token(token: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(token.as_bytes());
    let result = hasher.finalize();
    base64::Engine::encode(&base64::engine::general_purpose::STANDARD, result)
}
