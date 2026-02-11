use serde::Deserialize;
use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    // Server configuration
    pub api_host: String,
    pub api_port: u16,

    // Database
    pub database_url: String,

    // LemonSqueezy API
    pub lemonsqueezy_api_key: String,
    pub lemonsqueezy_store_id: String,
    pub lemonsqueezy_webhook_secret: String,

    // Product variants
    pub variant_id_basic_monthly: String,
    pub variant_id_basic_annual: String,
    pub variant_id_pro_monthly: String,
    pub variant_id_pro_annual: String,

    // JWT
    pub jwt_secret: String,

    // Environment
    pub is_production: bool,
    pub lemonsqueezy_test_mode: bool,
}

#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("Missing environment variable: {0}")]
    MissingEnvVar(String),
    #[error("Invalid environment variable value: {0}")]
    InvalidEnvVar(String),
}

impl Config {
    pub fn from_env() -> Result<Self, ConfigError> {
        let api_host = env::var("PAYMENT_API_HOST")
            .unwrap_or_else(|_| "127.0.0.1".to_string());

        let api_port = env::var("PAYMENT_API_PORT")
            .unwrap_or_else(|_| "3002".to_string())
            .parse::<u16>()
            .map_err(|_| ConfigError::InvalidEnvVar("PAYMENT_API_PORT must be a valid port number".to_string()))?;

        let database_url = env::var("PAYMENT_DATABASE_URL")
            .map_err(|_| ConfigError::MissingEnvVar("PAYMENT_DATABASE_URL".to_string()))?;

        let lemonsqueezy_api_key = env::var("LEMONSQUEEZY_API_KEY")
            .map_err(|_| ConfigError::MissingEnvVar("LEMONSQUEEZY_API_KEY".to_string()))?;

        let lemonsqueezy_store_id = env::var("LEMONSQUEEZY_STORE_ID")
            .map_err(|_| ConfigError::MissingEnvVar("LEMONSQUEEZY_STORE_ID".to_string()))?;

        let lemonsqueezy_webhook_secret = env::var("LEMONSQUEEZY_WEBHOOK_SECRET")
            .map_err(|_| ConfigError::MissingEnvVar("LEMONSQUEEZY_WEBHOOK_SECRET".to_string()))?;

        let variant_id_basic_monthly = env::var("LEMONSQUEEZY_VARIANT_ID_BASIC_MONTHLY")
            .map_err(|_| ConfigError::MissingEnvVar("LEMONSQUEEZY_VARIANT_ID_BASIC_MONTHLY".to_string()))?;

        let variant_id_basic_annual = env::var("LEMONSQUEEZY_VARIANT_ID_BASIC_ANNUAL")
            .map_err(|_| ConfigError::MissingEnvVar("LEMONSQUEEZY_VARIANT_ID_BASIC_ANNUAL".to_string()))?;

        let variant_id_pro_monthly = env::var("LEMONSQUEEZY_VARIANT_ID_PRO_MONTHLY")
            .map_err(|_| ConfigError::MissingEnvVar("LEMONSQUEEZY_VARIANT_ID_PRO_MONTHLY".to_string()))?;

        let variant_id_pro_annual = env::var("LEMONSQUEEZY_VARIANT_ID_PRO_ANNUAL")
            .map_err(|_| ConfigError::MissingEnvVar("LEMONSQUEEZY_VARIANT_ID_PRO_ANNUAL".to_string()))?;

        let jwt_secret = env::var("JWT_SECRET")
            .map_err(|_| ConfigError::MissingEnvVar("JWT_SECRET".to_string()))?;

        let is_production = env::var("IS_PRODUCTION")
            .unwrap_or_else(|_| "false".to_string())
            .parse::<bool>()
            .unwrap_or(false);

        let lemonsqueezy_test_mode = env::var("LEMONSQUEEZY_TEST_MODE")
            .unwrap_or_else(|_| "true".to_string())
            .parse::<bool>()
            .unwrap_or(true);

        Ok(Config {
            api_host,
            api_port,
            database_url,
            lemonsqueezy_api_key,
            lemonsqueezy_store_id,
            lemonsqueezy_webhook_secret,
            variant_id_basic_monthly,
            variant_id_basic_annual,
            variant_id_pro_monthly,
            variant_id_pro_annual,
            jwt_secret,
            is_production,
            lemonsqueezy_test_mode,
        })
    }

    /// Returns the full API base URL
    pub fn api_base_url(&self) -> String {
        format!("http://{}:{}", self.api_host, self.api_port)
    }

    /// Returns the LemonSqueezy API base URL
    pub fn lemonsqueezy_api_base_url(&self) -> String {
        "https://api.lemonsqueezy.com/v1".to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_api_base_url() {
        let config = Config {
            api_host: "127.0.0.1".to_string(),
            api_port: 3002,
            database_url: "postgres://test".to_string(),
            lemonsqueezy_api_key: "test".to_string(),
            lemonsqueezy_store_id: "1".to_string(),
            lemonsqueezy_webhook_secret: "secret".to_string(),
            variant_id_basic_monthly: "1".to_string(),
            variant_id_basic_annual: "2".to_string(),
            variant_id_pro_monthly: "3".to_string(),
            variant_id_pro_annual: "4".to_string(),
            jwt_secret: "secret".to_string(),
            is_production: false,
            lemonsqueezy_test_mode: true,
        };

        assert_eq!(config.api_base_url(), "http://127.0.0.1:3002");
        assert_eq!(
            config.lemonsqueezy_api_base_url(),
            "https://api.lemonsqueezy.com/v1"
        );
    }
}
