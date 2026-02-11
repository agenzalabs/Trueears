use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

/// Unified error type for the payment service
#[derive(Debug, thiserror::Error)]
pub enum PaymentError {
    // Database errors
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    // LemonSqueezy API errors
    #[error("LemonSqueezy API error: {0}")]
    LemonSqueezyApi(String),

    #[error("LemonSqueezy API request failed: {0}")]
    LemonSqueezyRequest(#[from] reqwest::Error),

    // Authentication errors
    #[error("Invalid or expired JWT token: {0}")]
    InvalidToken(String),

    #[error("Missing authorization header")]
    MissingAuthHeader,

    #[error("Unauthorized")]
    Unauthorized,

    // Webhook errors
    #[error("Invalid webhook signature")]
    InvalidWebhookSignature,

    #[error("Webhook processing failed: {0}")]
    WebhookProcessingFailed(String),

    #[error("Missing webhook signature header")]
    MissingWebhookSignature,

    // Resource errors
    #[error("Subscription not found")]
    SubscriptionNotFound,

    #[error("Customer not found")]
    CustomerNotFound,

    #[error("Order not found")]
    OrderNotFound,

    // Validation errors
    #[error("Invalid request: {0}")]
    InvalidRequest(String),

    #[error("Invalid variant ID: {0}")]
    InvalidVariantId(String),

    // Internal errors
    #[error("Internal server error: {0}")]
    Internal(String),

    #[error("Configuration error: {0}")]
    Config(String),
}

impl IntoResponse for PaymentError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            // 400 Bad Request
            PaymentError::InvalidRequest(msg) => (StatusCode::BAD_REQUEST, msg),
            PaymentError::InvalidVariantId(msg) => (StatusCode::BAD_REQUEST, msg),
            PaymentError::InvalidWebhookSignature => {
                (StatusCode::BAD_REQUEST, "Invalid webhook signature".to_string())
            }
            PaymentError::MissingWebhookSignature => {
                (StatusCode::BAD_REQUEST, "Missing X-Signature header".to_string())
            }

            // 401 Unauthorized
            PaymentError::InvalidToken(msg) => (StatusCode::UNAUTHORIZED, msg),
            PaymentError::MissingAuthHeader => {
                (StatusCode::UNAUTHORIZED, "Missing Authorization header".to_string())
            }
            PaymentError::Unauthorized => {
                (StatusCode::UNAUTHORIZED, "Unauthorized".to_string())
            }

            // 404 Not Found
            PaymentError::SubscriptionNotFound => {
                (StatusCode::NOT_FOUND, "Subscription not found".to_string())
            }
            PaymentError::CustomerNotFound => {
                (StatusCode::NOT_FOUND, "Customer not found".to_string())
            }
            PaymentError::OrderNotFound => {
                (StatusCode::NOT_FOUND, "Order not found".to_string())
            }

            // 500 Internal Server Error
            PaymentError::Database(err) => {
                tracing::error!("Database error: {}", err);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Internal server error".to_string(),
                )
            }
            PaymentError::LemonSqueezyApi(msg) => {
                tracing::error!("LemonSqueezy API error: {}", msg);
                (StatusCode::INTERNAL_SERVER_ERROR, msg)
            }
            PaymentError::LemonSqueezyRequest(err) => {
                tracing::error!("LemonSqueezy request error: {}", err);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Payment gateway communication error".to_string(),
                )
            }
            PaymentError::WebhookProcessingFailed(msg) => {
                tracing::error!("Webhook processing failed: {}", msg);
                (StatusCode::INTERNAL_SERVER_ERROR, msg)
            }
            PaymentError::Internal(msg) => {
                tracing::error!("Internal error: {}", msg);
                (StatusCode::INTERNAL_SERVER_ERROR, msg)
            }
            PaymentError::Config(msg) => {
                tracing::error!("Configuration error: {}", msg);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Service configuration error".to_string(),
                )
            }
        };

        let body = Json(json!({
            "error": error_message,
        }));

        (status, body).into_response()
    }
}

/// Convenience type alias for Results
pub type PaymentResult<T> = Result<T, PaymentError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_display() {
        let error = PaymentError::InvalidRequest("missing field".to_string());
        assert_eq!(error.to_string(), "Invalid request: missing field");
    }

    #[test]
    fn test_subscription_not_found_status() {
        let error = PaymentError::SubscriptionNotFound;
        let response = error.into_response();
        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }

    #[test]
    fn test_invalid_token_status() {
        let error = PaymentError::InvalidToken("expired".to_string());
        let response = error.into_response();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[test]
    fn test_invalid_webhook_signature_status() {
        let error = PaymentError::InvalidWebhookSignature;
        let response = error.into_response();
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }
}
