use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

pub async fn create_pool(database_url: &str) -> Result<PgPool, sqlx::Error> {
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(database_url)
        .await?;

    tracing::info!("Database connection pool established");
    Ok(pool)
}

pub async fn run_migrations(pool: &PgPool) -> Result<(), sqlx::Error> {
    // Read and execute the migration file
    let migration_sql = include_str!("../migrations/001_create_users.sql");

    sqlx::raw_sql(migration_sql).execute(pool).await?;

    tracing::info!("Database migrations completed");
    Ok(())
}
