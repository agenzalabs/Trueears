use std::env;
use tracing::warn;

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
    pub variant_id_basic: String,
    pub variant_id_pro: String,
    pub variant_id_basic_monthly: Option<String>,
    pub variant_id_basic_annual: Option<String>,
    pub variant_id_pro_monthly: Option<String>,
    pub variant_id_pro_annual: Option<String>,

    // JWT
    pub jwt_secret: String,

    // Environment
    pub is_production: bool,
    pub lemonsqueezy_test_mode: bool,
    pub payment_allowed_origins: Vec<String>,
}

#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("Missing environment variable: {0}")]
    MissingEnvVar(String),
    #[error("Invalid environment variable value: {0}")]
    InvalidEnvVar(String),
}

impl Config {
    fn first_present_var(keys: &[&str]) -> Option<String> {
        keys.iter().find_map(|k| env::var(k).ok())
    }

    fn extract_host(url: &str) -> Option<&str> {
        let after_scheme = if let Some((_, rest)) = url.split_once("://") {
            rest
        } else {
            url
        };
        let after_auth = after_scheme.rsplit_once('@').map_or(after_scheme, |(_, rest)| rest);
        let host_port = after_auth.split('/').next()?;
        let host = host_port.split(':').next()?;
        if host.is_empty() { None } else { Some(host) }
    }

    fn choose_database_url() -> Option<String> {
        let payment_db = env::var("PAYMENT_DATABASE_URL").ok();
        let shared_db = env::var("DATABASE_URL").ok();

        if let (Some(p), Some(s)) = (&payment_db, &shared_db) {
            let payment_host = Self::extract_host(p).unwrap_or("unknown");
            let shared_host = Self::extract_host(s).unwrap_or("unknown");
            if payment_host != shared_host {
                warn!(
                    "PAYMENT_DATABASE_URL host ({}) differs from DATABASE_URL host ({}). payment-service will use the configured selection rules.",
                    payment_host,
                    shared_host
                );
            }
        }

        // Prefer an explicit Neon URL when available.
        if let Some(db) = &payment_db {
            if db.contains(".neon.tech") {
                return Some(db.clone());
            }
        }
        if let Some(db) = &shared_db {
            if db.contains(".neon.tech") {
                return Some(db.clone());
            }
        }

        payment_db.or(shared_db)
    }

    pub fn from_env() -> Result<Self, ConfigError> {
        let api_host = env::var("PAYMENT_API_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());

        let api_port = env::var("PAYMENT_API_PORT")
            .unwrap_or_else(|_| "3002".to_string())
            .parse::<u16>()
            .map_err(|_| {
                ConfigError::InvalidEnvVar(
                    "PAYMENT_API_PORT must be a valid port number".to_string(),
                )
            })?;

        let database_url = Self::choose_database_url().ok_or_else(|| {
            ConfigError::MissingEnvVar(
                "PAYMENT_DATABASE_URL (or shared DATABASE_URL)".to_string(),
            )
        })?;

        let payment_require_neon = env::var("PAYMENT_REQUIRE_NEON")
            .unwrap_or_else(|_| "true".to_string())
            .parse::<bool>()
            .unwrap_or(true);

        if payment_require_neon && !database_url.contains(".neon.tech") {
            return Err(ConfigError::InvalidEnvVar(
                "Payment DB must use Neon. Set PAYMENT_DATABASE_URL (or DATABASE_URL) to a Neon host ending in .neon.tech, e.g. ...-pooler....neon.tech?sslmode=require&channel_binding=require".to_string(),
            ));
        }

        let lemonsqueezy_api_key = env::var("LEMONSQUEEZY_API_KEY")
            .map_err(|_| ConfigError::MissingEnvVar("LEMONSQUEEZY_API_KEY".to_string()))?;

        let lemonsqueezy_store_id = env::var("LEMONSQUEEZY_STORE_ID")
            .map_err(|_| ConfigError::MissingEnvVar("LEMONSQUEEZY_STORE_ID".to_string()))?;

        let lemonsqueezy_webhook_secret = env::var("LEMONSQUEEZY_WEBHOOK_SECRET")
            .map_err(|_| ConfigError::MissingEnvVar("LEMONSQUEEZY_WEBHOOK_SECRET".to_string()))?;

        let variant_id_basic = Self::first_present_var(&[
            "LEMONSQUEEZY_VARIANT_ID_BASIC",
            "LEMONSQUEEZY_VARIANT_ID_BASIC_MONTHLY",
        ])
        .ok_or_else(|| {
            ConfigError::MissingEnvVar(
                "LEMONSQUEEZY_VARIANT_ID_BASIC (or LEMONSQUEEZY_VARIANT_ID_BASIC_MONTHLY)"
                    .to_string(),
            )
        })?;

        let variant_id_pro = Self::first_present_var(&[
            "LEMONSQUEEZY_VARIANT_ID_PRO",
            "LEMONSQUEEZY_VARIANT_ID_PRO_MONTHLY",
        ])
        .ok_or_else(|| {
            ConfigError::MissingEnvVar(
                "LEMONSQUEEZY_VARIANT_ID_PRO (or LEMONSQUEEZY_VARIANT_ID_PRO_MONTHLY)".to_string(),
            )
        })?;

        let variant_id_basic_monthly = env::var("LEMONSQUEEZY_VARIANT_ID_BASIC_MONTHLY").ok();
        let variant_id_basic_annual = env::var("LEMONSQUEEZY_VARIANT_ID_BASIC_ANNUAL").ok();
        let variant_id_pro_monthly = env::var("LEMONSQUEEZY_VARIANT_ID_PRO_MONTHLY").ok();
        let variant_id_pro_annual = env::var("LEMONSQUEEZY_VARIANT_ID_PRO_ANNUAL").ok();

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

        let payment_allowed_origins = env::var("PAYMENT_ALLOWED_ORIGINS")
            .unwrap_or_else(|_| {
                "http://localhost:1420,http://127.0.0.1:1420,tauri://localhost".to_string()
            })
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect::<Vec<_>>();

        Ok(Config {
            api_host,
            api_port,
            database_url,
            lemonsqueezy_api_key,
            lemonsqueezy_store_id,
            lemonsqueezy_webhook_secret,
            variant_id_basic,
            variant_id_pro,
            variant_id_basic_monthly,
            variant_id_basic_annual,
            variant_id_pro_monthly,
            variant_id_pro_annual,
            jwt_secret,
            is_production,
            lemonsqueezy_test_mode,
            payment_allowed_origins,
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

    /// Returns all allowed variant IDs for checkout validation.
    pub fn allowed_variant_ids(&self) -> Vec<&str> {
        let mut variants = vec![self.variant_id_basic.as_str(), self.variant_id_pro.as_str()];

        if let Some(v) = &self.variant_id_basic_monthly {
            variants.push(v.as_str());
        }
        if let Some(v) = &self.variant_id_basic_annual {
            variants.push(v.as_str());
        }
        if let Some(v) = &self.variant_id_pro_monthly {
            variants.push(v.as_str());
        }
        if let Some(v) = &self.variant_id_pro_annual {
            variants.push(v.as_str());
        }

        variants.sort_unstable();
        variants.dedup();
        variants
    }

    pub fn is_allowed_variant(&self, variant_id: &str) -> bool {
        self.allowed_variant_ids().contains(&variant_id)
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
            variant_id_basic: "1".to_string(),
            variant_id_pro: "3".to_string(),
            variant_id_basic_monthly: Some("1".to_string()),
            variant_id_basic_annual: Some("2".to_string()),
            variant_id_pro_monthly: Some("3".to_string()),
            variant_id_pro_annual: Some("4".to_string()),
            jwt_secret: "secret".to_string(),
            is_production: false,
            lemonsqueezy_test_mode: true,
            payment_allowed_origins: vec!["http://localhost:1420".to_string()],
        };

        assert_eq!(config.api_base_url(), "http://127.0.0.1:3002");
        assert_eq!(
            config.lemonsqueezy_api_base_url(),
            "https://api.lemonsqueezy.com/v1"
        );

        assert!(config.is_allowed_variant("1"));
        assert!(config.is_allowed_variant("3"));
        assert!(!config.is_allowed_variant("999"));
    }
}
