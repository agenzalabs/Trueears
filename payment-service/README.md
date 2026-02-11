# Payment Service (LemonSqueezy Integration)

Standalone payment and subscription service for Trueears, built with Axum (Rust) and PostgreSQL. Handles checkout creation, webhook processing, and subscription management via the LemonSqueezy API.

## Architecture

- **Language**: Rust 1.77+
- **Framework**: Axum 0.7
- **Database**: PostgreSQL 14+
- **Port**: 3002 (default)
- **Payment Gateway**: LemonSqueezy (Merchant of Record)

## Features

- ✅ Checkout session creation
- ✅ Webhook signature verification (HMAC-SHA256)
- ✅ Subscription lifecycle management (create, update, cancel, pause, resume)
- ✅ Order tracking and refund handling
- ✅ JWT authentication (shared secret with auth-server)
- ✅ Customer portal integration
- ✅ Test mode support
- ✅ Idempotent webhook processing
- ✅ Full audit trail

## Prerequisites

1. **Rust 1.77+** - Install from [rustup.rs](https://rustup.rs/)
2. **PostgreSQL 14+** - Running locally or accessible via connection string
3. **LemonSqueezy Account** - Sign up at [lemonsqueezy.com](https://lemonsqueezy.com/)
   - Create a store
   - Create products and variants (pricing plans)
   - Generate API key (Settings → API)
   - Set up webhook endpoint (Settings → Webhooks)

## Quick Start

### 1. Set Up Environment

```bash
cd payment-service
cp .env.example .env
```

Edit `.env` with your actual values:
- `PAYMENT_DATABASE_URL` - PostgreSQL connection string
- `LEMONSQUEEZY_API_KEY` - From LemonSqueezy dashboard → API
- `LEMONSQUEEZY_STORE_ID` - Your store ID
- `LEMONSQUEEZY_WEBHOOK_SECRET` - Generated when creating webhook
- `LEMONSQUEEZY_VARIANT_ID_*` - Product variant IDs for each plan
- `JWT_SECRET` - Same secret used by auth-server

### 2. Run Database Migrations

```bash
# Install sqlx-cli if not already installed
cargo install sqlx-cli --no-default-features --features postgres

# Run migrations
sqlx migrate run
```

### 3. Run the Service

```bash
cargo run
```

The service will start on `http://localhost:3002`.

### 4. Verify Health

```bash
curl http://localhost:3002/health
# Expected: "OK"
```

## API Endpoints

### Public Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/webhooks/lemonsqueezy` | POST | LemonSqueezy webhook receiver |

### Protected Endpoints (Require JWT)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/checkout` | POST | Create checkout session |
| `/api/subscriptions/me` | GET | Get current user's subscription |
| `/api/subscriptions/me/cancel` | POST | Cancel subscription |
| `/api/subscriptions/me/pause` | POST | Pause subscription |
| `/api/subscriptions/me/resume` | POST | Resume subscription |
| `/api/subscriptions/me/change-plan` | POST | Upgrade/downgrade plan |
| `/api/subscriptions/me/portal` | GET | Get customer portal URL |
| `/api/plans` | GET | List available plans |

## LemonSqueezy Setup

### 1. Create Products & Variants

In LemonSqueezy dashboard:
1. Go to **Products** → **New Product**
2. Create product (e.g., "Trueears Pro")
3. Add variants for each pricing tier:
   - Basic Monthly ($9.99/month)
   - Basic Annual ($99/year)
   - Pro Monthly ($19.99/month)
   - Pro Annual ($199/year)
4. Copy each variant ID and add to `.env`

### 2. Configure Webhook

1. Go to **Settings** → **Webhooks** → **Add endpoint**
2. **URL**: `https://your-domain.com/webhooks/lemonsqueezy`
3. **Events**: Select all subscription and order events:
   - `subscription_created`
   - `subscription_updated`
   - `subscription_cancelled`
   - `subscription_expired`
   - `subscription_paused`
   - `subscription_resumed`
   - `order_created`
   - `order_refunded`
4. **Signing Secret**: Copy the generated secret to `.env` as `LEMONSQUEEZY_WEBHOOK_SECRET`

## Database Schema

### Tables

- **customers** - Maps internal user IDs to LemonSqueezy customer IDs
- **subscriptions** - Active and historical subscription records
- **orders** - Payment orders and refunds
- **webhook_events** - Audit log of all received webhook events

### Migrations

Located in `migrations/`:
- `001_create_customers.sql`
- `002_create_subscriptions.sql`
- `003_create_orders.sql`
- `004_create_webhook_events.sql`

## Development

### Run Tests

```bash
cargo test
```

### Run with Hot Reload (cargo-watch)

```bash
cargo install cargo-watch
cargo watch -x run
```

### Test Mode

Set `LEMONSQUEEZY_TEST_MODE=true` in `.env` to use LemonSqueezy's test mode. This allows testing the full payment flow without real charges.

## Security

- ✅ **Webhook Verification**: All webhooks verified via HMAC-SHA256 signature
- ✅ **JWT Authentication**: User endpoints require valid JWT tokens
- ✅ **Secrets Management**: All secrets loaded from environment variables
- ✅ **Constant-Time Comparison**: Webhook signature uses timing-safe comparison
- ✅ **CORS**: Restricted to desktop app origin in production
- ✅ **Audit Trail**: All webhook events logged for forensic analysis

## Troubleshooting

### Webhook Signature Verification Fails

- Ensure `LEMONSQUEEZY_WEBHOOK_SECRET` matches the secret in LemonSqueezy dashboard
- Verify webhook is sent to the correct endpoint
- Check webhook event logs in `webhook_events` table

### Database Connection Fails

- Verify PostgreSQL is running: `pg_isready`
- Check `PAYMENT_DATABASE_URL` format: `postgres://user:pass@host:port/dbname`
- Ensure database exists: `createdb trueears_payments`

### JWT Validation Fails

- Ensure `JWT_SECRET` matches the secret used by auth-server
- Verify token is sent in `Authorization: Bearer <token>` header
- Check token expiry (tokens from auth-server have configurable TTL)

## Deployment

### Docker

```dockerfile
FROM rust:1.77-slim AS builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/payment-service /usr/local/bin/
EXPOSE 3002
CMD ["payment-service"]
```

Build and run:

```bash
docker build -t payment-service .
docker run -p 3002:3002 --env-file .env payment-service
```

### Production Checklist

- [ ] Set `IS_PRODUCTION=true`
- [ ] Set `LEMONSQUEEZY_TEST_MODE=false`
- [ ] Use production LemonSqueezy API key
- [ ] Configure CORS to restrict to app domain
- [ ] Set up HTTPS/TLS termination (load balancer or reverse proxy)
- [ ] Configure database connection pooling
- [ ] Set up monitoring and alerting
- [ ] Configure log aggregation
- [ ] Set up database backups
- [ ] Document secrets rotation procedure

## Microservice Extraction

This service is designed to be extracted into a standalone microservice with **zero code changes**:

1. Copy `payment-service/` to a new repository
2. Update webhook URL in LemonSqueezy dashboard
3. Update `PAYMENT_SERVICE_URL` in desktop app config
4. Deploy independently with own CI/CD pipeline

## Support

For issues related to:
- **Payment Service**: Check this README and logs
- **LemonSqueezy API**: See [docs.lemonsqueezy.com](https://docs.lemonsqueezy.com/)
- **Trueears Integration**: See main project README

## License

See main project LICENSE file.