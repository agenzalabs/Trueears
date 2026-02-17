use axum::{extract::State, Extension, Json};
use serde::{Deserialize, Serialize};

use crate::{
    errors::PaymentError, middleware::AuthenticatedUser,
    services::lemonsqueezy_client::LemonSqueezyClient, AppState,
};

#[derive(Debug, Deserialize)]
pub struct CreateCheckoutRequest {
    pub variant_id: String,
}

#[derive(Debug, Serialize)]
pub struct CreateCheckoutResponse {
    pub checkout_url: String,
}

pub async fn create_checkout(
    State(state): State<AppState>,
    Extension(user): Extension<AuthenticatedUser>,
    Json(payload): Json<CreateCheckoutRequest>,
) -> Result<Json<CreateCheckoutResponse>, PaymentError> {
    if !state.config.is_allowed_variant(&payload.variant_id) {
        return Err(PaymentError::InvalidVariantId(payload.variant_id));
    }

    let client = LemonSqueezyClient::new(
        state.config.lemonsqueezy_api_key.clone(),
        state.config.lemonsqueezy_api_base_url(),
    );

    let checkout_url = client
        .create_checkout(
            &state.config.lemonsqueezy_store_id,
            &payload.variant_id,
            user.user_id,
            &user.email,
            state.config.lemonsqueezy_test_mode,
        )
        .await?;

    tracing::info!(
        user_id = %user.user_id,
        variant_id = %payload.variant_id,
        "Checkout created"
    );

    Ok(Json(CreateCheckoutResponse { checkout_url }))
}
