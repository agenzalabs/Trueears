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

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(Duration::from_secs(3))
        .connect(database_url)
        .await
        .map_err(DatabaseError::ConnectionFailed)?;

    tracing::info!("Database connection pool created successfully");
    Ok(pool)
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
    fn test_database_error_display() {
        let error = DatabaseError::MigrationFailed("test error".to_string());
        assert_eq!(error.to_string(), "Migration failed: test error");
    }
}
