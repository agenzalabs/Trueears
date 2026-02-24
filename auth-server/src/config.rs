use std::env;

#[derive(Clone, Debug)]
pub struct Config {
    // Database
    pub database_url: String,
    
    // Google OAuth
    pub google_client_id: String,
    pub google_client_secret: String,
    pub oauth_redirect_uri: String,
    
    // JWT
    pub jwt_secret: String,
    pub jwt_access_expiry_seconds: i64,
    pub jwt_refresh_expiry_seconds: i64,
    
    // Server
    pub api_host: String,
    pub api_port: u16,
    pub api_url: String,
    
    // Environment
    pub is_production: bool,
}

impl Config {
    pub fn from_env() -> Result<Self, env::VarError> {
        let rust_env = env::var("RUST_ENV").unwrap_or_else(|_| "development".to_string());
        let is_production = rust_env == "production";
        
        Ok(Config {
            database_url: env::var("DATABASE_URL")?,
            google_client_id: env::var("GOOGLE_CLIENT_ID")?,
            google_client_secret: env::var("GOOGLE_CLIENT_SECRET")?,
            oauth_redirect_uri: env::var("OAUTH_REDIRECT_URI")
                .unwrap_or_else(|_| "http://localhost:8585/callback".to_string()),
            jwt_secret: env::var("JWT_SECRET")?,
            jwt_access_expiry_seconds: env::var("JWT_ACCESS_EXPIRY_SECONDS")
                .unwrap_or_else(|_| "900".to_string())
                .parse()
                .unwrap_or(900),
            jwt_refresh_expiry_seconds: env::var("JWT_REFRESH_EXPIRY_SECONDS")
                .unwrap_or_else(|_| "2592000".to_string())
                .parse()
                .unwrap_or(2592000),
            api_host: env::var("API_HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            api_port: env::var("API_PORT")
                .unwrap_or_else(|_| "3001".to_string())
                .parse()
                .unwrap_or(3001),
            api_url: env::var("API_URL")?,
            is_production,
        })
    }
}
