use serde::{Deserialize, Serialize};
use uuid::Uuid;

// LemonSqueezy API types

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckoutRequest {
    pub variant_id: String,
    pub user_id: Uuid,
    pub email: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckoutResponse {
    pub checkout_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSubscriptionRequest {
    pub variant_id: Option<String>,
    pub cancelled: Option<bool>,
    pub pause: Option<PauseRequest>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PauseRequest {
    pub mode: String, // "void" or "free"
    pub resumes_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LemonSqueezyWebhookPayload {
    pub meta: WebhookMeta,
    pub data: SubscriptionData,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebhookMeta {
    pub event_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubscriptionData {
    #[serde(rename = "type")]
    pub data_type: String,
    pub id: String,
    pub attributes: SubscriptionAttributes,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubscriptionAttributes {
    pub store_id: i64,
    pub customer_id: i64,
    pub order_id: Option<i64>,
    pub product_id: i64,
    pub variant_id: i64,
    pub product_name: String,
    pub variant_name: String,
    pub user_email: String,
    pub status: String,
    pub card_brand: Option<String>,
    pub card_last_four: Option<String>,
    pub cancelled: bool,
    pub trial_ends_at: Option<String>,
    pub billing_anchor: Option<i32>,
    pub renews_at: Option<String>,
    pub ends_at: Option<String>,
    pub test_mode: bool,
}
