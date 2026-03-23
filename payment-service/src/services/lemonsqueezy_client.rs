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

#[derive(Debug, Clone)]
pub struct LemonOrderSummary {
    pub id: i64,
    pub customer_id: Option<i64>,
    pub status: String,
    pub total: i64,
    pub refunded_amount: i64,
    pub currency: String,
    pub test_mode: bool,
    pub product_id: Option<i64>,
    pub variant_id: Option<i64>,
    pub user_email: Option<String>,
    pub custom_user_id: Option<Uuid>,
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

    pub async fn list_orders_by_user_email(
        &self,
        store_id: &str,
        user_email: &str,
    ) -> Result<Vec<LemonOrderSummary>, PaymentError> {
        let mut last_err: Option<PaymentError> = None;
        let query_variants: [Vec<(&str, &str)>; 2] = [
            vec![
                ("filter[store_id]", store_id),
                ("filter[user_email]", user_email),
                ("page[size]", "100"),
            ],
            vec![
                ("store_id", store_id),
                ("user_email", user_email),
                ("page[size]", "100"),
            ],
        ];

        for query in query_variants {
            let response = self
                .client
                .get(format!("{}/orders", self.base_url))
                .header("Accept", "application/vnd.api+json")
                .bearer_auth(&self.api_key)
                .query(&query)
                .send()
                .await?;

            let status = response.status();
            let body = response.text().await?;
            if !status.is_success() {
                last_err = Some(PaymentError::LemonSqueezyApi(format!(
                    "List orders failed ({}): {}",
                    status, body
                )));
                continue;
            }

            let parsed: Value = serde_json::from_str(&body).map_err(|e| {
                PaymentError::LemonSqueezyApi(format!("Invalid orders response: {}", e))
            })?;
            return parse_order_summaries(&parsed);
        }

        Err(last_err.unwrap_or_else(|| {
            PaymentError::LemonSqueezyApi("Failed to list LemonSqueezy orders".to_string())
        }))
    }

    pub async fn list_recent_orders_by_store(
        &self,
        store_id: &str,
    ) -> Result<Vec<LemonOrderSummary>, PaymentError> {
        let mut last_err: Option<PaymentError> = None;
        let query_variants: [Vec<(&str, &str)>; 2] = [
            vec![("filter[store_id]", store_id), ("page[size]", "100")],
            vec![("store_id", store_id), ("page[size]", "100")],
        ];

        for query in query_variants {
            let response = self
                .client
                .get(format!("{}/orders", self.base_url))
                .header("Accept", "application/vnd.api+json")
                .bearer_auth(&self.api_key)
                .query(&query)
                .send()
                .await?;

            let status = response.status();
            let body = response.text().await?;
            if !status.is_success() {
                last_err = Some(PaymentError::LemonSqueezyApi(format!(
                    "List store orders failed ({}): {}",
                    status, body
                )));
                continue;
            }

            let parsed: Value = serde_json::from_str(&body).map_err(|e| {
                PaymentError::LemonSqueezyApi(format!("Invalid store orders response: {}", e))
            })?;
            return parse_order_summaries(&parsed);
        }

        Err(last_err.unwrap_or_else(|| {
            PaymentError::LemonSqueezyApi("Failed to list store orders".to_string())
        }))
    }
}

fn as_i64(value: &Value) -> Option<i64> {
    value
        .as_i64()
        .or_else(|| value.as_str().and_then(|s| s.parse::<i64>().ok()))
}

fn parse_order_summaries(parsed: &Value) -> Result<Vec<LemonOrderSummary>, PaymentError> {
    let data = parsed["data"]
        .as_array()
        .ok_or_else(|| PaymentError::LemonSqueezyApi("Missing data array in orders response".to_string()))?;

    let mut orders = Vec::with_capacity(data.len());
    for item in data {
        let id = as_i64(&item["id"]).ok_or_else(|| {
            PaymentError::LemonSqueezyApi("Missing order id in orders response".to_string())
        })?;
        let attrs = &item["attributes"];
        let status = attrs["status"].as_str().unwrap_or("pending").to_string();
        let total = as_i64(&attrs["total"]).unwrap_or(0);
        let refunded_amount = as_i64(&attrs["refunded_amount"]).unwrap_or(0);
        let currency = attrs["currency"].as_str().unwrap_or("USD").to_string();
        let test_mode = attrs["test_mode"].as_bool().unwrap_or(false);
        let customer_id = as_i64(&attrs["customer_id"]);
        let product_id = as_i64(&attrs["first_order_item"]["product_id"]);
        let variant_id = as_i64(&attrs["first_order_item"]["variant_id"]);
        let user_email = attrs["user_email"].as_str().map(|s| s.to_string());
        let custom_user_id = attrs["first_order_item"]["custom"]["user_id"]
            .as_str()
            .or_else(|| attrs["custom_data"]["user_id"].as_str())
            .or_else(|| attrs["checkout_data"]["custom"]["user_id"].as_str())
            .and_then(|s| Uuid::parse_str(s).ok());

        orders.push(LemonOrderSummary {
            id,
            customer_id,
            status,
            total,
            refunded_amount,
            currency,
            test_mode,
            product_id,
            variant_id,
            user_email,
            custom_user_id,
        });
    }

    Ok(orders)
}
