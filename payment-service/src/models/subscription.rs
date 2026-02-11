use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "subscription_status", rename_all = "snake_case")]
pub enum SubscriptionStatus {
    OnTrial,
    Active,
    Paused,
    PastDue,
    Unpaid,
    Cancelled,
    Expired,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Subscription {
    pub id: Uuid,
    pub customer_id: Uuid,
    pub ls_subscription_id: i64,
    pub ls_order_id: Option<i64>,
    pub ls_product_id: i64,
    pub ls_variant_id: i64,
    pub product_name: String,
    pub variant_name: String,
    pub status: SubscriptionStatus,
    pub card_brand: Option<String>,
    pub card_last_four: Option<String>,
    pub pause_mode: Option<String>,
    pub pause_resumes_at: Option<DateTime<Utc>>,
    pub cancelled: bool,
    pub trial_ends_at: Option<DateTime<Utc>>,
    pub billing_anchor: Option<i32>,
    pub renews_at: Option<DateTime<Utc>>,
    pub ends_at: Option<DateTime<Utc>>,
    pub customer_portal_url: Option<String>,
    pub update_payment_method_url: Option<String>,
    pub test_mode: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSubscriptionRequest {
    pub customer_id: Uuid,
    pub ls_subscription_id: i64,
    pub ls_order_id: Option<i64>,
    pub ls_product_id: i64,
    pub ls_variant_id: i64,
    pub product_name: String,
    pub variant_name: String,
    pub status: SubscriptionStatus,
    pub test_mode: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubscriptionResponse {
    pub id: Uuid,
    pub status: SubscriptionStatus,
    pub product_name: String,
    pub variant_name: String,
    pub renews_at: Option<DateTime<Utc>>,
    pub ends_at: Option<DateTime<Utc>>,
    pub customer_portal_url: Option<String>,
}
