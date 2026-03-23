use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct LicenseActivation {
    pub id: Uuid,
    pub order_id: Option<Uuid>,
    pub customer_id: Uuid,
    pub user_id: Uuid,
    pub license_key: String,
    pub ls_license_id: Option<i64>,
    pub ls_instance_id: String,
    pub device_name: Option<String>,
    pub device_fingerprint: Option<String>,
    pub status: String,
    pub activated_at: DateTime<Utc>,
    pub deactivated_at: Option<DateTime<Utc>>,
}
