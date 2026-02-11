use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "order_status", rename_all = "snake_case")]
pub enum OrderStatus {
    Paid,
    Refunded,
    PartialRefund,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Order {
    pub id: Uuid,
    pub customer_id: Uuid,
    pub ls_order_id: i64,
    pub subscription_id: Option<Uuid>,
    pub status: OrderStatus,
    pub total: i64,
    pub currency: String,
    pub refunded_amount: i64,
    pub test_mode: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateOrderRequest {
    pub customer_id: Uuid,
    pub ls_order_id: i64,
    pub subscription_id: Option<Uuid>,
    pub total: i64,
    pub currency: String,
    pub test_mode: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderResponse {
    pub id: Uuid,
    pub status: OrderStatus,
    pub total: i64,
    pub currency: String,
    pub created_at: DateTime<Utc>,
}
