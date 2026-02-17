use serde_json::{json, Value};
use uuid::Uuid;

use crate::errors::PaymentError;

#[derive(Clone)]
pub struct LemonSqueezyClient {
    client: reqwest::Client,
    api_key: String,
    base_url: String,
}

#[derive(Debug, Clone)]
pub struct LicenseActivationResult {
    pub activated: bool,
    pub error: Option<String>,
    pub license_key: String,
    pub license_key_id: Option<i64>,
    pub instance_id: Option<String>,
    pub activations_used: Option<i32>,
    pub activations_limit: Option<i32>,
    pub product_name: Option<String>,
    pub variant_name: Option<String>,
    pub expires_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Clone)]
pub struct LicenseDeactivationResult {
    pub deactivated: bool,
    pub error: Option<String>,
}

impl LemonSqueezyClient {
    pub fn new(api_key: String, base_url: String) -> Self {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(15))
            .build()
            .expect("reqwest client should build");

        Self {
            client,
            api_key,
            base_url,
        }
    }

    pub async fn create_checkout(
        &self,
        store_id: &str,
        variant_id: &str,
        user_id: Uuid,
        email: &str,
        test_mode: bool,
    ) -> Result<String, PaymentError> {
        let payload = json!({
            "data": {
                "type": "checkouts",
                "attributes": {
                    "checkout_data": {
                        "email": email,
                        "custom": {
                            "user_id": user_id.to_string(),
                            "user_email": email
                        }
                    },
                    "test_mode": test_mode
                },
                "relationships": {
                    "store": {
                        "data": {
                            "type": "stores",
                            "id": store_id
                        }
                    },
                    "variant": {
                        "data": {
                            "type": "variants",
                            "id": variant_id
                        }
                    }
                }
            }
        });

        let url = format!("{}/checkouts", self.base_url);
        let response = self
            .client
            .post(&url)
            .header("Accept", "application/vnd.api+json")
            .header("Content-Type", "application/vnd.api+json")
            .bearer_auth(&self.api_key)
            .json(&payload)
            .send()
            .await?;

        let status = response.status();
        let body = response.text().await?;
        if !status.is_success() {
            return Err(PaymentError::LemonSqueezyApi(format!(
                "Checkout creation failed ({}): {}",
                status, body
            )));
        }

        let parsed: Value = serde_json::from_str(&body).map_err(|e| {
            PaymentError::LemonSqueezyApi(format!("Invalid checkout response: {}", e))
        })?;

        parsed["data"]["attributes"]["url"]
            .as_str()
            .map(str::to_string)
            .ok_or_else(|| PaymentError::LemonSqueezyApi("Missing checkout URL".to_string()))
    }

    pub async fn activate_license_key(
        &self,
        license_key: &str,
        instance_name: &str,
    ) -> Result<LicenseActivationResult, PaymentError> {
        let response = self
            .client
            .post(format!("{}/licenses/activate", self.base_url))
            .header("Accept", "application/json")
            .header("Content-Type", "application/x-www-form-urlencoded")
            .form(&[
                ("license_key", license_key.to_string()),
                ("instance_name", instance_name.to_string()),
            ])
            .send()
            .await?;

        let status = response.status();
        let body = response.text().await?;
        if !status.is_success() {
            return Err(PaymentError::LemonSqueezyApi(format!(
                "License activation failed ({}): {}",
                status, body
            )));
        }

        let parsed: Value = serde_json::from_str(&body).map_err(|e| {
            PaymentError::LemonSqueezyApi(format!("Invalid activation response: {}", e))
        })?;

        let activated = parsed["activated"].as_bool().unwrap_or(false);
        let error = parsed["error"].as_str().map(|s| s.to_string());
        let key = parsed["license_key"]["key"]
            .as_str()
            .map(str::to_string)
            .or_else(|| {
                parsed["license_key"]["attributes"]["key"]
                    .as_str()
                    .map(str::to_string)
            })
            .unwrap_or_else(|| license_key.to_string());

        let license_key_id = parsed["license_key"]["id"].as_i64().or_else(|| {
            parsed["license_key"]["id"]
                .as_str()
                .and_then(|s| s.parse::<i64>().ok())
        });

        let instance_id = parsed["instance"]["id"]
            .as_str()
            .map(str::to_string)
            .or_else(|| parsed["instance"]["id"].as_i64().map(|v| v.to_string()));

        let activations_used = parsed["license_key"]["attributes"]["activation_usage"]
            .as_i64()
            .and_then(|v| i32::try_from(v).ok());
        let activations_limit = parsed["license_key"]["attributes"]["activation_limit"]
            .as_i64()
            .and_then(|v| i32::try_from(v).ok());

        let expires_at = parsed["license_key"]["attributes"]["expires_at"]
            .as_str()
            .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
            .map(|dt| dt.with_timezone(&chrono::Utc));

        let product_name = parsed["meta"]["product_name"]
            .as_str()
            .map(|s| s.to_string());
        let variant_name = parsed["meta"]["variant_name"]
            .as_str()
            .map(|s| s.to_string());

        Ok(LicenseActivationResult {
            activated,
            error,
            license_key: key,
            license_key_id,
            instance_id,
            activations_used,
            activations_limit,
            product_name,
            variant_name,
            expires_at,
        })
    }

    pub async fn deactivate_license_key(
        &self,
        license_key: &str,
        instance_id: &str,
    ) -> Result<LicenseDeactivationResult, PaymentError> {
        let response = self
            .client
            .post(format!("{}/licenses/deactivate", self.base_url))
            .header("Accept", "application/json")
            .header("Content-Type", "application/x-www-form-urlencoded")
            .form(&[
                ("license_key", license_key.to_string()),
                ("instance_id", instance_id.to_string()),
            ])
            .send()
            .await?;

        let status = response.status();
        let body = response.text().await?;
        if !status.is_success() {
            return Err(PaymentError::LemonSqueezyApi(format!(
                "License deactivation failed ({}): {}",
                status, body
            )));
        }

        let parsed: Value = serde_json::from_str(&body).map_err(|e| {
            PaymentError::LemonSqueezyApi(format!("Invalid deactivation response: {}", e))
        })?;

        Ok(LicenseDeactivationResult {
            deactivated: parsed["deactivated"].as_bool().unwrap_or(false),
            error: parsed["error"].as_str().map(|s| s.to_string()),
        })
    }
}
