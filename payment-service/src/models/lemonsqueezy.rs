use serde::{Deserialize, Serialize};
use uuid::Uuid;

// LemonSqueezy API request/response types for the one-time license checkout flow.

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
