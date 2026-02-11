use crate::AppState;
use axum::{extract::State, http::StatusCode, Json};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct CreateCheckoutRequest {
    pub variant_id: String,
    #[serde(default)]
    pub product_name: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CreateCheckoutResponse {
    pub checkout_url: String,
}

/// Create a checkout session with LemonSqueezy
pub async fn create_checkout(
    State(state): State<AppState>,
    Json(payload): Json<CreateCheckoutRequest>,
) -> Result<Json<CreateCheckoutResponse>, (StatusCode, String)> {
    tracing::info!(
        "Creating checkout for variant_id: {}, product: {:?}",
        payload.variant_id,
        payload.product_name
    );

    // Build LemonSqueezy API request
    let client = reqwest::Client::new();
    let api_url = if state.config.lemonsqueezy_test_mode {
        "https://api.lemonsqueezy.com/v1/checkouts"
    } else {
        "https://api.lemonsqueezy.com/v1/checkouts"
    };

    let checkout_data = serde_json::json!({
        "data": {
            "type": "checkouts",
            "attributes": {
                "checkout_data": {
                    "custom": {
                        "product_name": payload.product_name.unwrap_or_else(|| "Trueears License".to_string())
                    }
                }
            },
            "relationships": {
                "store": {
                    "data": {
                        "type": "stores",
                        "id": state.config.lemonsqueezy_store_id
                    }
                },
                "variant": {
                    "data": {
                        "type": "variants",
                        "id": payload.variant_id
                    }
                }
            }
        }
    });

    tracing::debug!("Sending request to LemonSqueezy: {:?}", checkout_data);

    let response = client
        .post(api_url)
        .header("Accept", "application/vnd.api+json")
        .header("Content-Type", "application/vnd.api+json")
        .header(
            "Authorization",
            format!("Bearer {}", state.config.lemonsqueezy_api_key),
        )
        .json(&checkout_data)
        .send()
        .await
        .map_err(|e| {
            tracing::error!("Failed to send request to LemonSqueezy: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to create checkout: {}", e),
            )
        })?;

    let status = response.status();
    let response_text = response.text().await.map_err(|e| {
        tracing::error!("Failed to read response body: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to read response".to_string(),
        )
    })?;

    if !status.is_success() {
        tracing::error!("LemonSqueezy API error ({}): {}", status, response_text);
        return Err((
            StatusCode::BAD_REQUEST,
            format!("LemonSqueezy API error: {}", response_text),
        ));
    }

    // Parse response
    let response_json: serde_json::Value = serde_json::from_str(&response_text).map_err(|e| {
        tracing::error!("Failed to parse LemonSqueezy response: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Invalid response from LemonSqueezy: {}", e),
        )
    })?;

    tracing::debug!("LemonSqueezy response: {:?}", response_json);

    // Extract checkout URL
    let checkout_url = response_json["data"]["attributes"]["url"]
        .as_str()
        .ok_or_else(|| {
            tracing::error!("No checkout URL in response");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "No checkout URL in response".to_string(),
            )
        })?
        .to_string();

    tracing::info!("Checkout created successfully: {}", checkout_url);

    Ok(Json(CreateCheckoutResponse { checkout_url }))
}
