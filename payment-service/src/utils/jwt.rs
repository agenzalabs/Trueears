use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};
use serde::{Deserialize, Serialize};

use crate::errors::PaymentError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessTokenClaims {
    pub sub: String,
    pub email: String,
    pub exp: i64,
    pub iat: i64,
}

pub fn validate_access_token(
    token: &str,
    jwt_secret: &str,
) -> Result<AccessTokenClaims, PaymentError> {
    let validation = Validation::new(Algorithm::HS256);
    let token_data = decode::<AccessTokenClaims>(
        token,
        &DecodingKey::from_secret(jwt_secret.as_bytes()),
        &validation,
    )
    .map_err(|e| PaymentError::InvalidToken(e.to_string()))?;

    Ok(token_data.claims)
}

#[cfg(test)]
mod tests {
    use super::*;
    use jsonwebtoken::{encode, EncodingKey, Header};

    #[test]
    fn validates_valid_token() {
        let secret = "test-secret";
        let claims = AccessTokenClaims {
            sub: uuid::Uuid::new_v4().to_string(),
            email: "test@example.com".to_string(),
            exp: chrono::Utc::now().timestamp() + 300,
            iat: chrono::Utc::now().timestamp(),
        };

        let token = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(secret.as_bytes()),
        )
        .expect("token should encode");

        let parsed = validate_access_token(&token, secret).expect("token should validate");
        assert_eq!(parsed.sub, claims.sub);
        assert_eq!(parsed.email, claims.email);
    }

    #[test]
    fn rejects_invalid_token() {
        let result = validate_access_token("not-a-jwt", "test-secret");
        assert!(result.is_err());
    }
}
