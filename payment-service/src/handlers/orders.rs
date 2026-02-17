use axum::{extract::State, Extension, Json};
use serde::Serialize;

use crate::{
    errors::PaymentError, middleware::AuthenticatedUser, services::order_sync_service::sync_orders_for_user,
    AppState,
};

#[derive(Debug, Serialize)]
pub struct OrderDto {
    pub id: String,
    pub status: String,
    pub total: i64,
    pub currency: String,
    pub license_key: Option<String>,
    pub variant_id: Option<String>,
    pub license_status: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

pub async fn get_my_orders(
    State(state): State<AppState>,
    Extension(user): Extension<AuthenticatedUser>,
) -> Result<Json<Vec<OrderDto>>, PaymentError> {
    let mut rows = query_orders_for_user(&state, user.user_id).await?;
    if rows.is_empty() {
        let _ = sync_orders_for_user(&state.pool, &state.config, user.user_id, &user.email).await;
        rows = query_orders_for_user(&state, user.user_id).await?;
    }

    let orders = rows
        .into_iter()
        .map(
            |(
                id,
                status,
                total,
                currency,
                license_key,
                variant_id,
                license_status,
                created_at,
            )| OrderDto {
                id: id.to_string(),
                status,
                total,
                currency,
                license_key,
                variant_id: variant_id.map(|v| v.to_string()),
                license_status,
                created_at,
            },
        )
        .collect::<Vec<_>>();

    Ok(Json(orders))
}

async fn query_orders_for_user(
    state: &AppState,
    user_id: uuid::Uuid,
) -> Result<
    Vec<(
        uuid::Uuid,
        String,
        i64,
        String,
        Option<String>,
        Option<i64>,
        Option<String>,
        chrono::DateTime<chrono::Utc>,
    )>,
    PaymentError,
> {
    let rows = sqlx::query_as::<
        _,
        (
            uuid::Uuid,
            String,
            i64,
            String,
            Option<String>,
            Option<i64>,
            Option<String>,
            chrono::DateTime<chrono::Utc>,
        ),
    >(
        r#"
        SELECT o.id, o.status::text, o.total, o.currency, o.license_key, o.ls_variant_id, o.license_status, o.created_at
        FROM orders o
        INNER JOIN customers c ON c.id = o.customer_id
        WHERE c.user_id = $1
        ORDER BY o.created_at DESC
        "#,
    )
    .bind(user_id)
    .fetch_all(&state.pool)
    .await?;

    Ok(rows)
}
