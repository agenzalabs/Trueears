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
