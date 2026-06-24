use std::time::Duration;

use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

pub async fn create_pool(database_url: &str) -> Result<PgPool, sqlx::Error> {
    let pool = PgPoolOptions::new()
        .max_connections(10)
        // Serverless Postgres (Neon) scales to zero when idle. Give the first
        // connection time to wake the database instead of failing instantly,
        // which is the main cause of "first sign-in fails, retry works".
        .acquire_timeout(Duration::from_secs(30))
        .connect(database_url)
        .await?;

    tracing::info!("Database connection pool established");
    Ok(pool)
}

/// Lightweight query used to wake/keep-warm the database (e.g. for `/ready`).
pub async fn ping(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query("SELECT 1").execute(pool).await?;
    Ok(())
}

pub async fn run_migrations(pool: &PgPool) -> Result<(), sqlx::Error> {
    // Read and execute the migration file
    let migration_sql = include_str!("../migrations/001_create_users.sql");

    sqlx::raw_sql(migration_sql).execute(pool).await?;

    tracing::info!("Database migrations completed");
    Ok(())
}
