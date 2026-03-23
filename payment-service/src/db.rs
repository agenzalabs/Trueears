use sqlx::postgres::{PgPool, PgPoolOptions};
use std::time::Duration;

#[derive(Debug, thiserror::Error)]
pub enum DatabaseError {
    #[error("Database connection failed: {0}")]
    ConnectionFailed(#[from] sqlx::Error),
    #[error("Migration failed: {0}")]
    MigrationFailed(String),
}

/// Create a PostgreSQL connection pool
pub async fn create_pool(database_url: &str) -> Result<PgPool, DatabaseError> {
    tracing::info!("Creating database connection pool");
    let database_url = ensure_neon_secure_params(database_url);

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(Duration::from_secs(10))
        .connect(&database_url)
        .await
        .map_err(DatabaseError::ConnectionFailed)?;

    tracing::info!("Database connection pool created successfully");
    Ok(pool)
}

/// Neon requires TLS. Add recommended params if caller omitted them.
fn ensure_neon_secure_params(database_url: &str) -> String {
    if !database_url.contains(".neon.tech") {
        return database_url.to_string();
    }

    let has_sslmode = database_url.contains("sslmode=");
    let has_channel_binding = database_url.contains("channel_binding=");
    if has_sslmode && has_channel_binding {
        return database_url.to_string();
    }

    let separator = if database_url.contains('?') { '&' } else { '?' };
    let mut normalized = database_url.to_string();
    let mut next_separator = separator;

    if !has_sslmode {
        normalized.push(next_separator);
        normalized.push_str("sslmode=require");
        next_separator = '&';
    }
    if !has_channel_binding {
        normalized.push(next_separator);
        normalized.push_str("channel_binding=require");
    }

    tracing::warn!(
        "Neon URL missing TLS parameters; auto-appended sslmode=require&channel_binding=require"
    );
    normalized
}

/// Run database migrations
pub async fn run_migrations(pool: &PgPool) -> Result<(), DatabaseError> {
    tracing::info!("Running database migrations");

    sqlx::migrate!("./migrations")
        .run(pool)
        .await
        .map_err(|e| DatabaseError::MigrationFailed(e.to_string()))?;

    tracing::info!("Database migrations completed successfully");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_pool_invalid_url() {
        let result = create_pool("postgres://invalid:invalid@localhost:9999/nonexistent").await;
        assert!(result.is_err());
    }

    #[test]
    fn test_ensure_neon_secure_params_adds_missing_flags() {
        let url = "postgresql://user:pass@ep-abc-123.us-east-2.aws.neon.tech/neondb";
        let normalized = ensure_neon_secure_params(url);
        assert!(normalized.contains("sslmode=require"));
        assert!(normalized.contains("channel_binding=require"));
    }

    #[test]
    fn test_ensure_neon_secure_params_keeps_existing_flags() {
        let url = "postgresql://u:p@ep-abc-123.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
        let normalized = ensure_neon_secure_params(url);
        assert_eq!(normalized, url);
    }

    #[test]
    fn test_database_error_display() {
        let error = DatabaseError::MigrationFailed("test error".to_string());
        assert_eq!(error.to_string(), "Migration failed: test error");
    }
}
