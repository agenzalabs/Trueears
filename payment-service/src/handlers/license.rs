use axum::{extract::State, Extension, Json};
use serde::{Deserialize, Serialize};

use crate::{
    errors::PaymentError, middleware::AuthenticatedUser,
    services::{lemonsqueezy_client::LemonSqueezyClient, order_sync_service::sync_orders_for_user},
    AppState,
};

#[derive(Debug, Serialize)]
pub struct LicenseStatusResponse {
    pub valid: bool,
    pub license_key: Option<String>,
    pub product_name: Option<String>,
    pub variant_name: Option<String>,
    pub activations_used: Option<i32>,
    pub activations_limit: Option<i32>,
    pub expires_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct ActivateLicenseRequest {
    pub license_key: String,
    pub device_name: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ActivateLicenseResponse {
    pub success: bool,
    pub activations_used: i32,
    pub activations_limit: i32,
}

#[derive(Debug, Deserialize)]
pub struct DeactivateLicenseRequest {
    pub instance_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct DeactivateLicenseResponse {
    pub success: bool,
}

pub async fn get_license_status(
    State(state): State<AppState>,
    Extension(user): Extension<AuthenticatedUser>,
) -> Result<Json<LicenseStatusResponse>, PaymentError> {
    let mut record = fetch_best_order_record(&state, user.user_id).await?;
    if record.is_none() {
        let _ = sync_orders_for_user(&state.pool, &state.config, user.user_id, &user.email).await;
        record = fetch_best_order_record(&state, user.user_id).await?;
    }

    let Some((
        order_status,
        license_key,
        license_status,
        activations_used,
        activations_limit,
        expires_at,
        _ls_product_id,
        ls_variant_id,
    )) = record
    else {
        return Ok(Json(LicenseStatusResponse {
            valid: false,
            license_key: None,
            product_name: None,
            variant_name: None,
            activations_used: None,
            activations_limit: None,
            expires_at: None,
        }));
    };

    let expired = expires_at.map(|e| e < chrono::Utc::now()).unwrap_or(false);
    let valid = order_status != "refunded"
        && license_status.as_deref() != Some("inactive")
        && license_status.as_deref() != Some("disabled")
        && !expired;

    let variant_name = match ls_variant_id.map(|v| v.to_string()) {
        Some(v) if v == state.config.variant_id_pro => Some("Pro License".to_string()),
        Some(v) if v == state.config.variant_id_basic => Some("Basic License".to_string()),
        _ => None,
    };

    Ok(Json(LicenseStatusResponse {
        valid,
        license_key,
        product_name: Some("Trueears".to_string()),
        variant_name,
        activations_used,
        activations_limit,
        expires_at,
    }))
}

async fn fetch_best_order_record(
    state: &AppState,
    user_id: uuid::Uuid,
) -> Result<
    Option<(
        String,
        Option<String>,
        Option<String>,
        Option<i32>,
        Option<i32>,
        Option<chrono::DateTime<chrono::Utc>>,
        Option<i64>,
        Option<i64>,
    )>,
    PaymentError,
> {
    let record = sqlx::query_as::<
        _,
        (
            String,
            Option<String>,
            Option<String>,
            Option<i32>,
            Option<i32>,
            Option<chrono::DateTime<chrono::Utc>>,
            Option<i64>,
            Option<i64>,
        ),
    >(
        r#"
        SELECT
            o.status::text,
            o.license_key,
            o.license_status,
            o.license_activations_used,
            o.license_activations_limit,
            o.license_expires_at,
            o.ls_product_id,
            o.ls_variant_id
        FROM orders o
        INNER JOIN customers c ON c.id = o.customer_id
        WHERE c.user_id = $1
        ORDER BY
            CASE WHEN o.ls_variant_id::text = $2 THEN 1 ELSE 0 END DESC,
            o.created_at DESC
        LIMIT 1
        "#,
    )
    .bind(user_id)
    .bind(&state.config.variant_id_pro)
    .fetch_optional(&state.pool)
    .await?;

    Ok(record)
}

pub async fn activate_license(
    State(state): State<AppState>,
    Extension(user): Extension<AuthenticatedUser>,
    Json(payload): Json<ActivateLicenseRequest>,
) -> Result<Json<ActivateLicenseResponse>, PaymentError> {
    if payload.license_key.trim().is_empty() {
        return Err(PaymentError::InvalidRequest(
            "license_key is required".to_string(),
        ));
    }

    let order = sqlx::query_as::<_, (uuid::Uuid, uuid::Uuid, Option<i64>)>(
        r#"
        SELECT o.id, o.customer_id, o.license_key_id
        FROM orders o
        INNER JOIN customers c ON c.id = o.customer_id
        WHERE c.user_id = $1 AND o.license_key = $2
        ORDER BY o.created_at DESC
        LIMIT 1
        "#,
    )
    .bind(user.user_id)
    .bind(payload.license_key.trim())
    .fetch_optional(&state.pool)
    .await?
    .ok_or(PaymentError::OrderNotFound)?;

    let client = LemonSqueezyClient::new(
        state.config.lemonsqueezy_api_key.clone(),
        state.config.lemonsqueezy_api_base_url(),
    );
    let instance_name = payload.device_name.as_deref().unwrap_or("Trueears Desktop");
    let activation = client
        .activate_license_key(payload.license_key.trim(), instance_name)
        .await?;

    if !activation.activated {
        return Err(PaymentError::InvalidRequest(
            activation
                .error
                .unwrap_or_else(|| "License activation failed".to_string()),
        ));
    }

    let activations_used = activation.activations_used.unwrap_or(0);
    let activations_limit = activation.activations_limit.unwrap_or(0);

    sqlx::query(
        r#"
        UPDATE orders
        SET license_status = 'active',
            license_activations_used = $2,
            license_activations_limit = $3,
            license_key_id = COALESCE($4, license_key_id),
            license_expires_at = COALESCE($5, license_expires_at),
            updated_at = NOW()
        WHERE id = $1
        "#,
    )
    .bind(order.0)
    .bind(activations_used)
    .bind(activations_limit)
    .bind(activation.license_key_id)
    .bind(activation.expires_at)
    .execute(&state.pool)
    .await?;

    if let Some(instance_id) = activation.instance_id {
        sqlx::query(
            r#"
            INSERT INTO license_activations (
                order_id, customer_id, user_id, license_key, ls_license_id, ls_instance_id, device_name, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
            ON CONFLICT (ls_instance_id) DO UPDATE
            SET status = 'active',
                deactivated_at = NULL,
                device_name = EXCLUDED.device_name
            "#,
        )
        .bind(order.0)
        .bind(order.1)
        .bind(user.user_id)
        .bind(payload.license_key.trim())
        .bind(activation.license_key_id.or(order.2))
        .bind(instance_id)
        .bind(instance_name)
        .execute(&state.pool)
        .await?;
    }

    Ok(Json(ActivateLicenseResponse {
        success: true,
        activations_used,
        activations_limit,
    }))
}

pub async fn deactivate_license(
    State(state): State<AppState>,
    Extension(user): Extension<AuthenticatedUser>,
    Json(payload): Json<DeactivateLicenseRequest>,
) -> Result<Json<DeactivateLicenseResponse>, PaymentError> {
    let activation = if let Some(instance_id) = payload.instance_id {
        sqlx::query_as::<_, (uuid::Uuid, String, String)>(
            r#"
            SELECT id, license_key, ls_instance_id
            FROM license_activations
            WHERE user_id = $1 AND ls_instance_id = $2 AND status = 'active'
            "#,
        )
        .bind(user.user_id)
        .bind(instance_id)
        .fetch_optional(&state.pool)
        .await?
    } else {
        sqlx::query_as::<_, (uuid::Uuid, String, String)>(
            r#"
            SELECT id, license_key, ls_instance_id
            FROM license_activations
            WHERE user_id = $1 AND status = 'active'
            ORDER BY activated_at DESC
            LIMIT 1
            "#,
        )
        .bind(user.user_id)
        .fetch_optional(&state.pool)
        .await?
    }
    .ok_or_else(|| {
        PaymentError::InvalidRequest("No active license activation found".to_string())
    })?;

    let client = LemonSqueezyClient::new(
        state.config.lemonsqueezy_api_key.clone(),
        state.config.lemonsqueezy_api_base_url(),
    );
    let result = client
        .deactivate_license_key(&activation.1, &activation.2)
        .await?;

    if !result.deactivated {
        return Err(PaymentError::InvalidRequest(
            result
                .error
                .unwrap_or_else(|| "License deactivation failed".to_string()),
        ));
    }

    sqlx::query(
        r#"
        UPDATE license_activations
        SET status = 'deactivated',
            deactivated_at = NOW()
        WHERE id = $1
        "#,
    )
    .bind(activation.0)
    .execute(&state.pool)
    .await?;

    Ok(Json(DeactivateLicenseResponse { success: true }))
}
