use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct WebhookEvent {
    pub id: Uuid,
    pub event_name: String,
    pub ls_event_id: Option<String>,
    pub payload: serde_json::Value,
    pub processed: bool,
    pub processing_error: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateWebhookEventRequest {
    pub event_name: String,
    pub ls_event_id: Option<String>,
    pub payload: serde_json::Value,
}

impl WebhookEvent {
    pub async fn find_by_ls_event_id(
        pool: &sqlx::PgPool,
        ls_event_id: &str,
    ) -> Result<Option<Self>, sqlx::Error> {
        sqlx::query_as::<_, WebhookEvent>(
            r#"
            SELECT id, event_name, ls_event_id, payload, processed, processing_error, created_at
            FROM webhook_events
            WHERE ls_event_id = $1
            "#,
        )
        .bind(ls_event_id)
        .fetch_optional(pool)
        .await
    }

    pub async fn create(
        pool: &sqlx::PgPool,
        request: CreateWebhookEventRequest,
    ) -> Result<Self, sqlx::Error> {
        sqlx::query_as::<_, WebhookEvent>(
            r#"
            INSERT INTO webhook_events (event_name, ls_event_id, payload, processed)
            VALUES ($1, $2, $3, FALSE)
            RETURNING id, event_name, ls_event_id, payload, processed, processing_error, created_at
            "#,
        )
        .bind(request.event_name)
        .bind(request.ls_event_id)
        .bind(request.payload)
        .fetch_one(pool)
        .await
    }

    pub async fn mark_processed(pool: &sqlx::PgPool, id: Uuid) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            UPDATE webhook_events
            SET processed = TRUE, processing_error = NULL
            WHERE id = $1
            "#,
        )
        .bind(id)
        .execute(pool)
        .await?;
        Ok(())
    }

    pub async fn mark_failed(
        pool: &sqlx::PgPool,
        id: Uuid,
        error_message: &str,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            UPDATE webhook_events
            SET processed = FALSE, processing_error = $2
            WHERE id = $1
            "#,
        )
        .bind(id)
        .bind(error_message)
        .execute(pool)
        .await?;
        Ok(())
    }
}
