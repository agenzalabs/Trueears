use hmac::{Hmac, Mac};
use serde_json::Value;
use sha2::Sha256;
use subtle::ConstantTimeEq;
use uuid::Uuid;

use crate::{
    errors::PaymentError,
    models::{CreateCustomerRequest, CreateWebhookEventRequest, Customer, WebhookEvent},
};

type HmacSha256 = Hmac<Sha256>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WebhookOutcome {
    Processed,
    Duplicate,
    Ignored,
}

fn get_str<'a>(value: &'a Value, pointer: &str) -> Option<&'a str> {
    value.pointer(pointer).and_then(|v| v.as_str())
}

fn get_i64(value: &Value, pointer: &str) -> Option<i64> {
    value.pointer(pointer).and_then(|v| {
        v.as_i64()
            .or_else(|| v.as_str().and_then(|s| s.parse::<i64>().ok()))
    })
}

fn get_i32(value: &Value, pointer: &str) -> Option<i32> {
    get_i64(value, pointer).and_then(|v| i32::try_from(v).ok())
}

fn parse_rfc3339(value: Option<&str>) -> Option<chrono::DateTime<chrono::Utc>> {
    value
        .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
        .map(|dt| dt.with_timezone(&chrono::Utc))
}

fn extract_event_name(payload: &Value) -> Result<String, PaymentError> {
    get_str(payload, "/meta/event_name")
        .map(str::to_string)
        .ok_or_else(|| PaymentError::InvalidRequest("Missing meta.event_name".to_string()))
}

fn extract_event_id(payload: &Value, event_name: &str) -> Option<String> {
    get_str(payload, "/meta/event_id")
        .or_else(|| get_str(payload, "/meta/webhook_event_id"))
        .map(str::to_string)
        .or_else(|| get_str(payload, "/data/id").map(|id| format!("{event_name}:{id}")))
}

fn extract_user_id(payload: &Value) -> Option<Uuid> {
    let raw = get_str(payload, "/meta/custom_data/user_id")
        .or_else(|| get_str(payload, "/data/attributes/custom_data/user_id"))
        .or_else(|| get_str(payload, "/data/attributes/first_order_item/custom/user_id"));
    raw.and_then(|s| Uuid::parse_str(s).ok())
}

fn extract_user_email(payload: &Value) -> Option<String> {
    get_str(payload, "/data/attributes/user_email")
        .or_else(|| get_str(payload, "/data/attributes/customer_email"))
        .or_else(|| get_str(payload, "/meta/custom_data/user_email"))
        .map(str::to_string)
}

pub fn verify_webhook_signature(
    webhook_secret: &str,
    raw_body: &[u8],
    provided_signature: &str,
) -> Result<(), PaymentError> {
    let mut mac = HmacSha256::new_from_slice(webhook_secret.as_bytes())
        .map_err(|e| PaymentError::WebhookProcessingFailed(e.to_string()))?;
    mac.update(raw_body);
    let expected_hex = hex::encode(mac.finalize().into_bytes());

    let normalized = provided_signature
        .strip_prefix("sha256=")
        .unwrap_or(provided_signature);
    let is_equal = expected_hex.as_bytes().ct_eq(normalized.as_bytes());
    if is_equal.unwrap_u8() == 1 {
        Ok(())
    } else {
        Err(PaymentError::InvalidWebhookSignature)
    }
}

pub async fn process_webhook_event(
    pool: &sqlx::PgPool,
    payload: &Value,
) -> Result<WebhookOutcome, PaymentError> {
    let event_name = extract_event_name(payload)?;
    let event_id = extract_event_id(payload, &event_name);
    tracing::info!(
        event_name = %event_name,
        event_id = ?event_id,
        "Processing webhook event"
    );

    if let Some(ref event_id) = event_id {
        if let Some(existing) = WebhookEvent::find_by_ls_event_id(pool, event_id).await? {
            if existing.processed {
                tracing::info!(
                    event_name = %event_name,
                    event_id = %event_id,
                    "Webhook already processed (idempotent duplicate)"
                );
                return Ok(WebhookOutcome::Duplicate);
            }
        }
    }

    let event_record = match WebhookEvent::create(
        pool,
        CreateWebhookEventRequest {
            event_name: event_name.clone(),
            ls_event_id: event_id.clone(),
            payload: payload.clone(),
        },
    )
    .await
    {
        Ok(record) => record,
        Err(sqlx::Error::Database(db_err)) if db_err.code().as_deref() == Some("23505") => {
            return Ok(WebhookOutcome::Duplicate)
        }
        Err(e) => return Err(PaymentError::Database(e)),
    };

    let process_result = match event_name.as_str() {
        "order_created" => handle_order_created(pool, payload).await,
        "license_key_created" | "license_key_updated" => {
            handle_license_key_event(pool, payload).await
        }
        "order_refunded" => handle_order_refunded(pool, payload).await,
        _ => Ok(WebhookOutcome::Ignored),
    };

    match process_result {
        Ok(outcome) => {
            WebhookEvent::mark_processed(pool, event_record.id).await?;
            tracing::info!(
                event_name = %event_name,
                event_id = ?event_id,
                ?outcome,
                "Webhook event completed"
            );
            Ok(outcome)
        }
        Err(err) => {
            tracing::error!(
                event_name = %event_name,
                event_id = ?event_id,
                error = %err,
                "Webhook event failed"
            );
            let _ = WebhookEvent::mark_failed(pool, event_record.id, &err.to_string()).await;
            Err(err)
        }
    }
}

async fn handle_order_created(
    pool: &sqlx::PgPool,
    payload: &Value,
) -> Result<WebhookOutcome, PaymentError> {
    let user_id = extract_user_id(payload).ok_or_else(|| {
        PaymentError::WebhookProcessingFailed("Missing user_id in webhook payload".to_string())
    })?;
    let user_email = extract_user_email(payload).ok_or_else(|| {
        PaymentError::WebhookProcessingFailed("Missing user_email in webhook payload".to_string())
    })?;

    let ls_customer_id = get_i64(payload, "/data/attributes/customer_id");
    let ls_order_id = get_i64(payload, "/data/id")
        .ok_or_else(|| PaymentError::WebhookProcessingFailed("Missing order ID".to_string()))?;
    let total = get_i64(payload, "/data/attributes/total").unwrap_or(0);
    let currency = get_str(payload, "/data/attributes/currency")
        .unwrap_or("USD")
        .to_string();
    let test_mode = payload
        .pointer("/data/attributes/test_mode")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let ls_product_id = get_i64(payload, "/data/attributes/first_order_item/product_id")
        .or_else(|| get_i64(payload, "/data/attributes/product_id"));
    let ls_variant_id = get_i64(payload, "/data/attributes/first_order_item/variant_id")
        .or_else(|| get_i64(payload, "/data/attributes/variant_id"));

    let customer = Customer::upsert(
        pool,
        CreateCustomerRequest {
            user_id,
            email: user_email.clone(),
            name: None,
            ls_customer_id,
        },
    )
    .await?;

    sqlx::query(
        r#"
        INSERT INTO orders (
            customer_id, ls_order_id, status, total, currency, refunded_amount, test_mode,
            ls_product_id, ls_variant_id, customer_email
        )
        VALUES ($1, $2, 'paid'::order_status, $3, $4, 0, $5, $6, $7, $8)
        ON CONFLICT (ls_order_id) DO UPDATE
        SET customer_id = EXCLUDED.customer_id,
            total = EXCLUDED.total,
            currency = EXCLUDED.currency,
            test_mode = EXCLUDED.test_mode,
            ls_product_id = COALESCE(EXCLUDED.ls_product_id, orders.ls_product_id),
            ls_variant_id = COALESCE(EXCLUDED.ls_variant_id, orders.ls_variant_id),
            customer_email = COALESCE(EXCLUDED.customer_email, orders.customer_email),
            updated_at = NOW()
        "#,
    )
    .bind(customer.id)
    .bind(ls_order_id)
    .bind(total)
    .bind(currency)
    .bind(test_mode)
    .bind(ls_product_id)
    .bind(ls_variant_id)
    .bind(user_email)
    .execute(pool)
    .await?;

    Ok(WebhookOutcome::Processed)
}

async fn handle_license_key_event(
    pool: &sqlx::PgPool,
    payload: &Value,
) -> Result<WebhookOutcome, PaymentError> {
    let order_id = get_i64(payload, "/data/attributes/order_id");
    let ls_customer_id = get_i64(payload, "/data/attributes/customer_id");
    let license_key = get_str(payload, "/data/attributes/key")
        .or_else(|| get_str(payload, "/data/attributes/license_key"))
        .ok_or_else(|| PaymentError::WebhookProcessingFailed("Missing license key".to_string()))?
        .to_string();
    let license_key_id = get_i64(payload, "/data/id");
    let license_status = get_str(payload, "/data/attributes/status").map(|s| s.to_string());
    let expires_at = parse_rfc3339(get_str(payload, "/data/attributes/expires_at"));
    let activations_used = get_i32(payload, "/data/attributes/activation_usage");
    let activations_limit = get_i32(payload, "/data/attributes/activation_limit");

    let updated_rows = if let Some(order_id) = order_id {
        sqlx::query(
            r#"
            UPDATE orders
            SET license_key = $1,
                license_key_id = $2,
                license_status = $3,
                license_expires_at = $4,
                license_activations_used = $5,
                license_activations_limit = $6,
                updated_at = NOW()
            WHERE ls_order_id = $7
            "#,
        )
        .bind(license_key)
        .bind(license_key_id)
        .bind(license_status)
        .bind(expires_at)
        .bind(activations_used)
        .bind(activations_limit)
        .bind(order_id)
        .execute(pool)
        .await?
        .rows_affected()
    } else if let Some(ls_customer_id) = ls_customer_id {
        sqlx::query(
            r#"
            UPDATE orders
            SET license_key = $1,
                license_key_id = $2,
                license_status = $3,
                license_expires_at = $4,
                license_activations_used = $5,
                license_activations_limit = $6,
                updated_at = NOW()
            WHERE id = (
                SELECT o.id
                FROM orders o
                INNER JOIN customers c ON c.id = o.customer_id
                WHERE c.ls_customer_id = $7
                ORDER BY o.created_at DESC
                LIMIT 1
            )
            "#,
        )
        .bind(license_key)
        .bind(license_key_id)
        .bind(license_status)
        .bind(expires_at)
        .bind(activations_used)
        .bind(activations_limit)
        .bind(ls_customer_id)
        .execute(pool)
        .await?
        .rows_affected()
    } else {
        0
    };

    if updated_rows == 0 {
        return Err(PaymentError::WebhookProcessingFailed(
            "Unable to map license event to order".to_string(),
        ));
    }

    Ok(WebhookOutcome::Processed)
}

async fn handle_order_refunded(
    pool: &sqlx::PgPool,
    payload: &Value,
) -> Result<WebhookOutcome, PaymentError> {
    let order_id = get_i64(payload, "/data/attributes/order_id")
        .or_else(|| get_i64(payload, "/data/id"))
        .ok_or_else(|| {
            PaymentError::WebhookProcessingFailed("Missing order ID for refund".to_string())
        })?;
    let refunded = get_i64(payload, "/data/attributes/refund_amount")
        .or_else(|| get_i64(payload, "/data/attributes/refunded_amount"))
        .unwrap_or(0);

    let updated = sqlx::query(
        r#"
        UPDATE orders
        SET refunded_amount = COALESCE(refunded_amount, 0) + $2,
            status = CASE
                WHEN (COALESCE(refunded_amount, 0) + $2) >= total THEN 'refunded'::order_status
                ELSE 'partial_refund'::order_status
            END,
            updated_at = NOW()
        WHERE ls_order_id = $1
        "#,
    )
    .bind(order_id)
    .bind(refunded)
    .execute(pool)
    .await?
    .rows_affected();

    if updated == 0 {
        return Err(PaymentError::WebhookProcessingFailed(
            "Refund event received for unknown order".to_string(),
        ));
    }

    Ok(WebhookOutcome::Processed)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn webhook_signature_accepts_valid_hmac() {
        let secret = "webhook-secret";
        let body = br#"{"meta":{"event_name":"order_created"}}"#;
        let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).unwrap();
        mac.update(body);
        let signature = hex::encode(mac.finalize().into_bytes());

        let result = verify_webhook_signature(secret, body, &signature);
        assert!(result.is_ok());
    }

    #[test]
    fn webhook_signature_rejects_invalid_hmac() {
        let secret = "webhook-secret";
        let body = br#"{"meta":{"event_name":"order_created"}}"#;
        let result = verify_webhook_signature(secret, body, "bad-signature");
        assert!(result.is_err());
    }
}
