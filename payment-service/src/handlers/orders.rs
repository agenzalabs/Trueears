use axum::{extract::State, Extension, Json};
use serde::Serialize;

use crate::{errors::PaymentError, middleware::AuthenticatedUser, AppState};

#[derive(Debug, Serialize)]
pub struct OrderDto {
    pub id: String,
    pub status: String,
    pub total: i64,
    pub currency: String,
    pub license_key: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

pub async fn get_my_orders(
    State(state): State<AppState>,
    Extension(user): Extension<AuthenticatedUser>,
) -> Result<Json<Vec<OrderDto>>, PaymentError> {
    let rows = sqlx::query_as::<
        _,
        (
            uuid::Uuid,
            String,
            i64,
            String,
            Option<String>,
            chrono::DateTime<chrono::Utc>,
        ),
    >(
        r#"
        SELECT o.id, o.status::text, o.total, o.currency, o.license_key, o.created_at
        FROM orders o
        INNER JOIN customers c ON c.id = o.customer_id
        WHERE c.user_id = $1
        ORDER BY o.created_at DESC
        "#,
    )
    .bind(user.user_id)
    .fetch_all(&state.pool)
    .await?;

    let orders = rows
        .into_iter()
        .map(
            |(id, status, total, currency, license_key, created_at)| OrderDto {
                id: id.to_string(),
                status,
                total,
                currency,
                license_key,
                created_at,
            },
        )
        .collect::<Vec<_>>();

    Ok(Json(orders))
}
