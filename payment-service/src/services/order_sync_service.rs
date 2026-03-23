use uuid::Uuid;

use crate::{
    config::Config,
    errors::PaymentError,
    models::{CreateCustomerRequest, Customer},
    services::lemonsqueezy_client::{LemonOrderSummary, LemonSqueezyClient},
};

fn to_supported_order_status(status: &str) -> Option<&'static str> {
    match status {
        "paid" => Some("paid"),
        "refunded" => Some("refunded"),
        "partial_refund" => Some("partial_refund"),
        _ => None,
    }
}

pub async fn sync_orders_for_user(
    pool: &sqlx::PgPool,
    config: &Config,
    user_id: Uuid,
    user_email: &str,
) -> Result<u64, PaymentError> {
    let client = LemonSqueezyClient::new(
        config.lemonsqueezy_api_key.clone(),
        config.lemonsqueezy_api_base_url(),
    );
    let mut remote_orders = client
        .list_orders_by_user_email(&config.lemonsqueezy_store_id, user_email)
        .await?;
    if remote_orders.is_empty() {
        tracing::info!(
            user_id = %user_id,
            user_email = %user_email,
            "No Lemon orders found by user_email filter; trying store-wide fallback match"
        );
        let recent_orders = client
            .list_recent_orders_by_store(&config.lemonsqueezy_store_id)
            .await?;
        remote_orders = recent_orders
            .into_iter()
            .filter(|o| {
                o.custom_user_id == Some(user_id)
                    || o.user_email
                        .as_deref()
                        .map(|e| e.eq_ignore_ascii_case(user_email))
                        .unwrap_or(false)
            })
            .collect::<Vec<_>>();
    }

    if remote_orders.is_empty() {
        tracing::info!(
            user_id = %user_id,
            user_email = %user_email,
            "No Lemon orders matched this user"
        );
        return Ok(0);
    }

    let first_customer_id = remote_orders.iter().find_map(|o| o.customer_id);
    let customer = Customer::upsert(
        pool,
        CreateCustomerRequest {
            user_id,
            email: user_email.to_string(),
            name: None,
            ls_customer_id: first_customer_id,
        },
    )
    .await?;

    let mut upserted = 0u64;
    for order in remote_orders {
        if let Some(status) = to_supported_order_status(&order.status) {
            upsert_order(pool, &customer, user_email, status, &order).await?;
            upserted += 1;
        }
    }

    tracing::info!(
        user_id = %user_id,
        user_email = %user_email,
        upserted,
        "Synced orders from LemonSqueezy API fallback"
    );

    Ok(upserted)
}

async fn upsert_order(
    pool: &sqlx::PgPool,
    customer: &Customer,
    user_email: &str,
    status: &str,
    order: &LemonOrderSummary,
) -> Result<(), PaymentError> {
    sqlx::query(
        r#"
        INSERT INTO orders (
            customer_id, ls_order_id, status, total, currency, refunded_amount, test_mode,
            ls_product_id, ls_variant_id, customer_email
        )
        VALUES ($1, $2, $3::order_status, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (ls_order_id) DO UPDATE
        SET customer_id = EXCLUDED.customer_id,
            status = EXCLUDED.status,
            total = EXCLUDED.total,
            currency = EXCLUDED.currency,
            refunded_amount = EXCLUDED.refunded_amount,
            test_mode = EXCLUDED.test_mode,
            ls_product_id = COALESCE(EXCLUDED.ls_product_id, orders.ls_product_id),
            ls_variant_id = COALESCE(EXCLUDED.ls_variant_id, orders.ls_variant_id),
            customer_email = COALESCE(EXCLUDED.customer_email, orders.customer_email),
            updated_at = NOW()
        "#,
    )
    .bind(customer.id)
    .bind(order.id)
    .bind(status)
    .bind(order.total)
    .bind(&order.currency)
    .bind(order.refunded_amount)
    .bind(order.test_mode)
    .bind(order.product_id)
    .bind(order.variant_id)
    .bind(user_email)
    .execute(pool)
    .await?;

    Ok(())
}
