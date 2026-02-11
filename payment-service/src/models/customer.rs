use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Customer model - maps internal user IDs to LemonSqueezy customer IDs
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Customer {
    pub id: Uuid,
    pub user_id: Uuid,
    pub ls_customer_id: Option<i64>,
    pub email: String,
    pub name: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Request to create or update a customer
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateCustomerRequest {
    pub user_id: Uuid,
    pub email: String,
    pub name: Option<String>,
    pub ls_customer_id: Option<i64>,
}

/// Customer response for API
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomerResponse {
    pub id: Uuid,
    pub user_id: Uuid,
    pub email: String,
    pub name: Option<String>,
    pub has_subscription: bool,
}

impl Customer {
    /// Create a new customer
    pub async fn create(
        pool: &sqlx::PgPool,
        request: CreateCustomerRequest,
    ) -> Result<Self, sqlx::Error> {
        let customer = sqlx::query_as::<_, Customer>(
            r#"
            INSERT INTO customers (user_id, email, name, ls_customer_id)
            VALUES ($1, $2, $3, $4)
            RETURNING id, user_id, ls_customer_id, email, name, created_at, updated_at
            "#,
        )
        .bind(request.user_id)
        .bind(request.email)
        .bind(request.name)
        .bind(request.ls_customer_id)
        .fetch_one(pool)
        .await?;

        Ok(customer)
    }

    /// Find customer by user_id
    pub async fn find_by_user_id(
        pool: &sqlx::PgPool,
        user_id: Uuid,
    ) -> Result<Option<Self>, sqlx::Error> {
        let customer = sqlx::query_as::<_, Customer>(
            r#"
            SELECT id, user_id, ls_customer_id, email, name, created_at, updated_at
            FROM customers
            WHERE user_id = $1
            "#,
        )
        .bind(user_id)
        .fetch_optional(pool)
        .await?;

        Ok(customer)
    }

    /// Find customer by LemonSqueezy customer ID
    pub async fn find_by_ls_customer_id(
        pool: &sqlx::PgPool,
        ls_customer_id: i64,
    ) -> Result<Option<Self>, sqlx::Error> {
        let customer = sqlx::query_as::<_, Customer>(
            r#"
            SELECT id, user_id, ls_customer_id, email, name, created_at, updated_at
            FROM customers
            WHERE ls_customer_id = $1
            "#,
        )
        .bind(ls_customer_id)
        .fetch_optional(pool)
        .await?;

        Ok(customer)
    }

    /// Upsert customer (create or update if exists)
    pub async fn upsert(
        pool: &sqlx::PgPool,
        request: CreateCustomerRequest,
    ) -> Result<Self, sqlx::Error> {
        let customer = sqlx::query_as::<_, Customer>(
            r#"
            INSERT INTO customers (user_id, email, name, ls_customer_id)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id) DO UPDATE
            SET email = EXCLUDED.email,
                name = EXCLUDED.name,
                ls_customer_id = COALESCE(EXCLUDED.ls_customer_id, customers.ls_customer_id),
                updated_at = NOW()
            RETURNING id, user_id, ls_customer_id, email, name, created_at, updated_at
            "#,
        )
        .bind(request.user_id)
        .bind(request.email)
        .bind(request.name)
        .bind(request.ls_customer_id)
        .fetch_one(pool)
        .await?;

        Ok(customer)
    }

    /// Update LemonSqueezy customer ID
    pub async fn update_ls_customer_id(
        &mut self,
        pool: &sqlx::PgPool,
        ls_customer_id: i64,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            UPDATE customers
            SET ls_customer_id = $1, updated_at = NOW()
            WHERE id = $2
            "#,
        )
        .bind(ls_customer_id)
        .bind(self.id)
        .execute(pool)
        .await?;

        self.ls_customer_id = Some(ls_customer_id);
        self.updated_at = Utc::now();

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_customer_request_serialization() {
        let request = CreateCustomerRequest {
            user_id: Uuid::new_v4(),
            email: "test@example.com".to_string(),
            name: Some("Test User".to_string()),
            ls_customer_id: Some(12345),
        };

        let json = serde_json::to_string(&request).unwrap();
        assert!(json.contains("test@example.com"));
    }

    #[test]
    fn test_customer_response_serialization() {
        let response = CustomerResponse {
            id: Uuid::new_v4(),
            user_id: Uuid::new_v4(),
            email: "test@example.com".to_string(),
            name: Some("Test User".to_string()),
            has_subscription: true,
        };

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("test@example.com"));
        assert!(json.contains("true"));
    }
}
