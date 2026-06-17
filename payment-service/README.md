# Payment Service (LemonSqueezy Integration)

Standalone payment and subscription service for Trueears, built with Axum (Rust) and PostgreSQL. Handles checkout creation, webhook processing, and subscription management via the LemonSqueezy API.

## Architecture

- **Language**: Rust 1.77+
- **Framework**: Axum 0.7
- **Database**: PostgreSQL (Neon recommended)
- **Port**: 3002 (default)
- **Payment Gateway**: LemonSqueezy (Merchant of Record)

## Features

- ✅ Checkout session creation (one-time license purchases)
- ✅ Webhook signature verification (HMAC-SHA256, timing-safe)
- ✅ License key activation / deactivation (per-device, via LemonSqueezy Licensing)
- ✅ Order tracking and refund handling
- ✅ JWT authentication (shared secret with auth-server)
- ✅ Test mode support
- ✅ Idempotent webhook processing
- ✅ Full audit trail

> **Product model:** Trueears sells **one-time license keys**, not recurring
> subscriptions. The `subscriptions` table exists in the schema for historical
> reasons but is unused; there are no subscription endpoints or webhook handlers.

## Prerequisites

1. **Rust 1.77+** - Install from [rustup.rs](https://rustup.rs/)
2. **PostgreSQL 14+ / Neon Postgres** - Accessible via connection string
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
- `PAYMENT_DATABASE_URL` - Neon/PostgreSQL connection string
  - Recommended (Neon pooled): `postgresql://USER:PASSWORD@EP-ENDPOINT-pooler.REGION.aws.neon.tech/DB?sslmode=require&channel_binding=require`
  - If `PAYMENT_DATABASE_URL` is not set, service falls back to shared `DATABASE_URL`
- `PAYMENT_REQUIRE_NEON` - Defaults to `true` (service fails fast if DB host is not Neon)
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
| `/api/checkout` | POST | Create a checkout session for a license variant |
| `/api/license/status` | GET | Resolve the current user's license entitlement |
| `/api/license/activate` | POST | Activate a license key on this device |
| `/api/license/deactivate` | POST | Deactivate a license key instance |
| `/api/orders/me` | GET | List the current user's orders |

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
- Check `PAYMENT_DATABASE_URL` format: `postgresql://user:pass@host:port/dbname`
- Ensure database exists: `createdb trueears_payments`
- For Neon, use the pooled endpoint (`-pooler`) and include:
  - `sslmode=require`
  - `channel_binding=require`

### JWT Validation Fails

- Ensure `JWT_SECRET` matches the secret used by auth-server
- Verify token is sent in `Authorization: Bearer <token>` header
- Check token expiry (tokens from auth-server have configurable TTL)

## Deployment

Deployed to **Render** as a Docker web service. The repo ships a multi-stage
[`Dockerfile`](./Dockerfile) and a [`render.yaml`](./render.yaml) Blueprint.

### Render

1. In the Render dashboard, create a **Web Service** from this repo with
   **Root Directory** = `payment-service` and **Runtime** = Docker (or apply the
   `render.yaml` Blueprint).
2. Set the secret env vars (marked `sync: false` in `render.yaml`):
   `PAYMENT_DATABASE_URL`, `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_STORE_ID`,
   `LEMONSQUEEZY_WEBHOOK_SECRET`, `LEMONSQUEEZY_VARIANT_ID_BASIC`,
   `LEMONSQUEEZY_VARIANT_ID_PRO`, and `JWT_SECRET`.
   > `JWT_SECRET` **must byte-match the auth-server's** or every authed request
   > returns 401. The startup log prints a secret fingerprint to confirm parity.
3. Health check path is `/health`; `/ready` additionally verifies the database.
4. Render injects `$PORT`; the service binds it automatically (host is forced to
   `0.0.0.0` in the container).
5. Auto-deploy on push to `main` is enabled in the Blueprint.

### Local Docker

```bash
docker build -t payment-service ./payment-service
docker run -p 3002:3002 --env-file payment-service/.env payment-service
curl localhost:3002/health   # -> OK
curl -i localhost:3002/ready # -> 200 when the DB is reachable
```

### Production Checklist

- [ ] Set `IS_PRODUCTION=true`
- [ ] Set `LEMONSQUEEZY_TEST_MODE=false` (when ready for live charges)
- [ ] Use production LemonSqueezy API key
- [ ] Set `PAYMENT_ALLOWED_ORIGINS` to the desktop app origins
- [ ] Point the LemonSqueezy webhook at `https://<render-url>/webhooks/lemonsqueezy`
- [ ] Confirm `JWT_SECRET` matches the auth-server
- [ ] Set up monitoring/alerting and database backups (Neon)
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
