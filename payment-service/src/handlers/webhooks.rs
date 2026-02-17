use axum::{
    body::Bytes,
    extract::State,
    http::{HeaderMap, StatusCode},
    Json,
};
use serde::Serialize;

use crate::{
    errors::PaymentError,
    services::webhook_service::{process_webhook_event, verify_webhook_signature, WebhookOutcome},
    AppState,
};

#[derive(Debug, Serialize)]
pub struct WebhookResponse {
    pub status: &'static str,
}

pub async fn handle_lemonsqueezy_webhook(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<(StatusCode, Json<WebhookResponse>), PaymentError> {
    tracing::info!(
        body_len = body.len(),
        "Received LemonSqueezy webhook request"
    );

    let signature = headers
        .get("X-Signature")
        .and_then(|v| v.to_str().ok())
        .ok_or(PaymentError::MissingWebhookSignature)?;

    verify_webhook_signature(&state.config.lemonsqueezy_webhook_secret, &body, signature)?;

    let payload: serde_json::Value = serde_json::from_slice(&body)
        .map_err(|e| PaymentError::InvalidRequest(format!("Invalid JSON payload: {}", e)))?;

    let outcome = process_webhook_event(&state.pool, &payload).await?;
    tracing::info!(?outcome, "Webhook processed");
    match outcome {
        WebhookOutcome::Processed | WebhookOutcome::Ignored => {
            Ok((StatusCode::OK, Json(WebhookResponse { status: "ok" })))
        }
        WebhookOutcome::Duplicate => Ok((
            StatusCode::OK,
            Json(WebhookResponse {
                status: "already_processed",
            }),
        )),
    }
}
