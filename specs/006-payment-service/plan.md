# Implementation Plan: Payment Service (LemonSqueezy)

**Branch**: `006-payment-service` | **Date**: 2026-02-11 | **Spec**: `specs/006-payment-service/spec.md`
**Input**: Feature specification from `/specs/006-payment-service/spec.md`

## Summary

Build a standalone **payment-service** (Axum / Rust) that integrates with the LemonSqueezy payment gateway to handle subscriptions, checkout sessions, webhook processing, and subscription management for the Trueears desktop dictation app. The service lives in its own top-level directory (`payment-service/`) with its own Cargo project, database migrations, and deployment config — fully decoupled from `auth-server/` and `backend/` so it can be extracted into a standalone microservice in the future with zero refactoring.

### Why LemonSqueezy?

LemonSqueezy acts as a **Merchant of Record (MoR)**, meaning it handles global tax compliance, fraud prevention, chargebacks, and payment processing. This dramatically reduces the regulatory and operational burden compared to integrating Stripe directly. The REST API (JSON:API format) supports checkouts, subscriptions, webhooks, and a hosted customer portal — covering all Trueears monetization needs.

## Technical Context

**Language/Version**: Rust 1.77+ (consistent with `auth-server` and `backend`)
**Primary Dependencies**: Axum 0.7.x, SQLx 0.7 (PostgreSQL), reqwest 0.12 (HTTP client for LemonSqueezy API), hmac + sha2 (webhook verification), serde / serde_json, jsonwebtoken 9 (JWT validation — shared secret with auth-server), tokio, tower-http (CORS, tracing), chrono, uuid, thiserror, tracing / tracing-subscriber, dotenvy
**Storage**: PostgreSQL 14+ (separate database or separate schema from auth-server)
**Testing**: `cargo test`, integration tests with mock LemonSqueezy API, contract tests for webhook payloads
**Target Platform**: Linux server (same deployment target as auth-server)
**Project Type**: Standalone Rust web service (microservice-ready)
**Performance Goals**: p95 < 200ms for subscription status queries, p95 < 500ms for checkout creation, webhook processing < 5s
**Constraints**: LemonSqueezy rate limit 300 API calls/minute, webhook signature verification mandatory (HMAC-SHA256), zero hardcoded secrets
**Scale/Scope**: Same user base as Trueears auth-server, single-region initially

## Constitution Check

1299558

https://trueearsai.com/webhooks/lemonsqueezy
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Simplicity & Speed | No impact on desktop bundle; API response < 200ms p95 | ✅ Separate service, no bundle impact |
| II. Test-First (NON-NEGOTIABLE) | Tests written before implementation | ⬜ Will enforce during implementation |
| III. Type Safety | Rust type system + explicit serde types for all API/webhook payloads | ✅ Rust enforces at compile time |
| IV. Clean Architecture | Handlers → Services → Repository layers strictly separated | ✅ Designed below |
| V. Security | API keys in env vars, HMAC webhook verification, JWT auth on all user endpoints | ✅ Designed below |
| VI. Platform-Native | Rust/Axum server — consistent with auth-server stack | ✅ Same tech stack |
| VII. Incremental Changes | Separate directory, own Cargo.toml, feature-flagged integration | ✅ Fully decoupled |

## Architecture Overview

```text
┌──────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Desktop App │────▶│   Auth Server    │     │   LemonSqueezy API  │
│  (Tauri/React)     │  (Axum, :3001)   │     │  api.lemonsqueezy.com│
│              │     └──────────────────┘     └──────────┬──────────┘
│              │                                         │
│              │     ┌──────────────────┐                │ Webhooks
│              │────▶│ Payment Service  │◀───────────────┘
│  GET status  │     │  (Axum, :3002)   │
│  POST checkout     │                  │───▶ LemonSqueezy API
│              │     │  ┌────────────┐  │     (create checkout,
└──────────────┘     │  │ PostgreSQL │  │      update subscription)
                     │  │ (payments) │  │
                     │  └────────────┘  │
                     └──────────────────┘
```

### Service Communication

| From | To | Method | Auth |
|------|----|--------|------|
| Desktop App → Payment Service | REST API | JWT (same secret as auth-server) |
| LemonSqueezy → Payment Service | Webhooks | HMAC-SHA256 (`X-Signature` header) |
| Payment Service → LemonSqueezy API | REST API | Bearer token (`LEMONSQUEEZY_API_KEY`) |
| Payment Service → Auth Server | Internal REST (optional) | Service-to-service token or shared JWT secret |

### LemonSqueezy API Reference (from Context7 docs)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/checkouts` | POST | Create checkout session with variant_id, checkout_data (email, user_id), checkout_options |
| `/v1/subscriptions/:id` | PATCH | Update subscription (cancel, pause, resume, change variant) |
| `/v1/subscriptions/:id` | GET | Retrieve subscription details |
| `/v1/webhooks` | POST | Register webhook endpoint |

**Key LemonSqueezy Concepts:**
- **Variant**: A specific pricing tier/plan of a Product (e.g., "Basic Monthly", "Pro Annual")
- **Checkout**: A unique payment session URL for a specific variant
- **Store**: Your LemonSqueezy store — webhooks are scoped to a store
- **Webhook Secret**: Used to compute HMAC-SHA256 of request body, compared against `X-Signature` header
- **Customer Portal**: Hosted by LemonSqueezy — users manage payment methods and view invoices
- **Test Mode**: Separate API keys and data for development/staging
- **Rate Limit**: 300 API calls/minute (headers: `X-Ratelimit-Limit`, `X-Ratelimit-Remaining`)

## Project Structure

### Documentation (this feature)

```text
specs/006-payment-service/
├── spec.md              # Feature specification
├── plan.md              # This file — architecture & implementation plan
└── tasks.md             # Task breakdown (to be created via /sp.tasks)
```

### Source Code (new top-level directory)

```text
payment-service/
├── Cargo.toml                    # Standalone Rust crate
├── Cargo.lock
├── .env.example                  # Template for required env vars
├── README.md                     # Service documentation
├── migrations/                   # SQLx PostgreSQL migrations
│   ├── 001_create_customers.sql
│   ├── 002_create_subscriptions.sql
│   ├── 003_create_orders.sql
│   └── 004_create_webhook_events.sql
├── src/
│   ├── main.rs                   # Axum server entry point, router setup
│   ├── config.rs                 # Environment configuration (dotenvy)
│   ├── db.rs                     # Database pool creation & migrations
│   ├── errors.rs                 # Unified error types (thiserror)
│   ├── handlers/                 # HTTP route handlers (thin layer)
│   │   ├── mod.rs
│   │   ├── webhooks.rs           # POST /webhooks/lemonsqueezy
│   │   ├── checkout.rs           # POST /api/checkout
│   │   ├── subscriptions.rs      # GET/POST subscription management
│   │   └── health.rs             # GET /health
│   ├── services/                 # Business logic orchestration
│   │   ├── mod.rs
│   │   ├── webhook_service.rs    # Webhook verification + event routing
│   │   ├── checkout_service.rs   # Checkout creation via LemonSqueezy API
│   │   ├── subscription_service.rs # Subscription CRUD + status queries
│   │   └── lemonsqueezy_client.rs  # HTTP client wrapper for LS API
│   ├── models/                   # Database models + LemonSqueezy types
│   │   ├── mod.rs
│   │   ├── subscription.rs       # Subscription DB model
│   │   ├── order.rs              # Order DB model
│   │   ├── customer.rs           # Customer DB model
│   │   ├── webhook_event.rs      # WebhookEvent audit log model
│   │   └── lemonsqueezy.rs       # LemonSqueezy API request/response types
│   ├── middleware/                # Request middleware
│   │   ├── mod.rs
│   │   └── auth.rs               # JWT validation middleware (shared secret)
│   └── utils/                    # Utilities
│       ├── mod.rs
│       └── jwt.rs                # JWT token validation (reused logic from auth-server)
└── tests/
    ├── common/
    │   └── mod.rs                # Test helpers, mock server setup
    ├── webhook_tests.rs          # Webhook signature verification + event processing
    ├── checkout_tests.rs         # Checkout creation tests
    ├── subscription_tests.rs     # Subscription query + management tests
    └── integration_tests.rs      # End-to-end flow tests
```

**Structure Decision**: A new top-level `payment-service/` directory is created at the project root, following the same pattern as `auth-server/`. This ensures:
1. **Independent deployment** — own Cargo.toml, own binary, own Docker image
2. **Independent database** — own migrations, own connection pool
3. **Microservice extraction** — can be moved to its own repository with zero code changes
4. **Consistent conventions** — mirrors `auth-server/` structure for developer familiarity

## Detailed Design

### Phase 0: Research & Dependencies

**Cargo.toml Dependencies:**

```toml
[package]
name = "payment-service"
version = "0.1.0"
edition = "2021"
description = "Payment & subscription service for Trueears (LemonSqueezy)"

[dependencies]
# Web framework
axum = { version = "0.7", features = ["macros"] }
tokio = { version = "1", features = ["full"] }
tower = "0.4"
tower-http = { version = "0.5", features = ["cors", "trace"] }

# Database
sqlx = { version = "0.7", features = ["runtime-tokio", "postgres", "uuid", "chrono", "tls-native-tls"] }

# Serialization
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# JWT validation (shared secret with auth-server)
jsonwebtoken = "9"

# HTTP client (LemonSqueezy API calls)
reqwest = { version = "0.12", features = ["json"] }

# Webhook signature verification
hmac = "0.12"
sha2 = "0.10"
hex = "0.4"
subtle = "2.5"  # constant-time comparison

# Utilities
uuid = { version = "1.6", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
dotenvy = "0.15"
thiserror = "1.0"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
```

### Phase 1: Database Schema & Models

#### Migration 001: Customers Table

```sql
CREATE TABLE IF NOT EXISTS customers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL UNIQUE,          -- References auth-server users.id
    ls_customer_id  BIGINT UNIQUE,                 -- LemonSqueezy customer ID
    email           VARCHAR(255) NOT NULL,
    name            VARCHAR(255),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_customers_ls_customer_id ON customers(ls_customer_id);
```

#### Migration 002: Subscriptions Table

```sql
CREATE TYPE subscription_status AS ENUM (
    'on_trial', 'active', 'paused', 'past_due',
    'unpaid', 'cancelled', 'expired'
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id                 UUID NOT NULL REFERENCES customers(id),
    ls_subscription_id          BIGINT NOT NULL UNIQUE,    -- LemonSqueezy subscription ID
    ls_order_id                 BIGINT,
    ls_product_id               BIGINT NOT NULL,
    ls_variant_id               BIGINT NOT NULL,
    product_name                VARCHAR(255) NOT NULL,
    variant_name                VARCHAR(255) NOT NULL,
    status                      subscription_status NOT NULL DEFAULT 'active',
    card_brand                  VARCHAR(50),
    card_last_four              VARCHAR(4),
    pause_mode                  VARCHAR(10),               -- 'void' or 'free'
    pause_resumes_at            TIMESTAMPTZ,
    cancelled                   BOOLEAN NOT NULL DEFAULT FALSE,
    trial_ends_at               TIMESTAMPTZ,
    billing_anchor              INTEGER,
    renews_at                   TIMESTAMPTZ,
    ends_at                     TIMESTAMPTZ,
    customer_portal_url         TEXT,
    update_payment_method_url   TEXT,
    test_mode                   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_customer_id ON subscriptions(customer_id);
CREATE INDEX idx_subscriptions_ls_subscription_id ON subscriptions(ls_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
```

#### Migration 003: Orders Table

```sql
CREATE TYPE order_status AS ENUM ('paid', 'refunded', 'partial_refund');

CREATE TABLE IF NOT EXISTS orders (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id       UUID NOT NULL REFERENCES customers(id),
    ls_order_id       BIGINT NOT NULL UNIQUE,      -- LemonSqueezy order ID
    subscription_id   UUID REFERENCES subscriptions(id),
    status            order_status NOT NULL DEFAULT 'paid',
    total             BIGINT NOT NULL,              -- Amount in cents
    currency          VARCHAR(3) NOT NULL DEFAULT 'USD',
    refunded_amount   BIGINT DEFAULT 0,
    test_mode         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_ls_order_id ON orders(ls_order_id);
```

#### Migration 004: Webhook Events Table (Audit Log)

```sql
CREATE TABLE IF NOT EXISTS webhook_events (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name        VARCHAR(100) NOT NULL,
    ls_event_id       VARCHAR(255),                -- For idempotency
    payload           JSONB NOT NULL,
    processed         BOOLEAN NOT NULL DEFAULT FALSE,
    processing_error  TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_events_event_name ON webhook_events(event_name);
CREATE INDEX idx_webhook_events_ls_event_id ON webhook_events(ls_event_id);
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed);
```

### Phase 2: Core Service Implementation

#### 2.1 Configuration (`config.rs`)

Environment variables required:

```env
# Server
PAYMENT_API_HOST=127.0.0.1
PAYMENT_API_PORT=3002

# Database
PAYMENT_DATABASE_URL=postgres://user:pass@localhost:5432/trueears_payments

# LemonSqueezy
LEMONSQUEEZY_API_KEY=your_api_key_here
LEMONSQUEEZY_STORE_ID=your_store_id
LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_signing_secret

# Product Variants (LemonSqueezy variant IDs for each plan)
LEMONSQUEEZY_VARIANT_ID_BASIC_MONTHLY=12345
LEMONSQUEEZY_VARIANT_ID_BASIC_ANNUAL=12346
LEMONSQUEEZY_VARIANT_ID_PRO_MONTHLY=12347
LEMONSQUEEZY_VARIANT_ID_PRO_ANNUAL=12348

# JWT (shared with auth-server for token validation)
JWT_SECRET=same_secret_as_auth_server

# Environment
IS_PRODUCTION=false
LEMONSQUEEZY_TEST_MODE=true
```

#### 2.2 Webhook Signature Verification (`services/webhook_service.rs`)

Based on LemonSqueezy docs (Context7), webhook verification uses HMAC-SHA256:

```text
Algorithm:
1. Read raw request body as bytes
2. Read X-Signature header (hex-encoded)
3. Compute HMAC-SHA256(webhook_secret, raw_body)
4. Convert digest to hex string
5. Constant-time compare digest with X-Signature
6. If mismatch → reject (HTTP 400)
7. If match → parse JSON body, route event
```

**Webhook Event Routing:**

| Event Name | Handler | Database Action |
|------------|---------|----------------|
| `subscription_created` | `handle_subscription_created` | INSERT into subscriptions, UPSERT customer |
| `subscription_updated` | `handle_subscription_updated` | UPDATE subscription (status, variant, pause, etc.) |
| `subscription_cancelled` | `handle_subscription_cancelled` | UPDATE subscription (cancelled=true, ends_at) |
| `subscription_expired` | `handle_subscription_expired` | UPDATE subscription (status=expired) |
| `subscription_paused` | `handle_subscription_paused` | UPDATE subscription (status=paused, pause fields) |
| `subscription_resumed` | `handle_subscription_resumed` | UPDATE subscription (status=active, clear pause) |
| `order_created` | `handle_order_created` | INSERT into orders |
| `order_refunded` | `handle_order_refunded` | UPDATE order (status=refunded) |

**Idempotency**: Each webhook event is logged in `webhook_events` before processing. The `ls_event_id` is checked for duplicates. If the event was already processed, return HTTP 200 without re-processing.

#### 2.3 LemonSqueezy API Client (`services/lemonsqueezy_client.rs`)

A typed HTTP client wrapping the LemonSqueezy REST API:

```text
LemonSqueezyClient {
    base_url: "https://api.lemonsqueezy.com/v1"
    api_key: String (from env)
    http_client: reqwest::Client

    Methods:
    - create_checkout(variant_id, checkout_data) → CheckoutResponse
    - get_subscription(subscription_id) → SubscriptionResponse
    - update_subscription(subscription_id, UpdatePayload) → SubscriptionResponse
    - cancel_subscription(subscription_id) → SubscriptionResponse
    - pause_subscription(subscription_id, PausePayload) → SubscriptionResponse
    - resume_subscription(subscription_id) → SubscriptionResponse
}
```

**Request Headers:**
```text
Authorization: Bearer {LEMONSQUEEZY_API_KEY}
Content-Type: application/vnd.api+json
Accept: application/vnd.api+json
```

**Checkout Creation Payload (JSON:API format):**
```json
{
  "data": {
    "type": "checkouts",
    "attributes": {
      "checkout_data": {
        "email": "user@example.com",
        "custom": {
          "user_id": "uuid-of-internal-user"
        }
      },
      "checkout_options": {
        "embed": false
      },
      "product_options": {
        "redirect_url": "https://app.trueears.com/payment/success"
      },
      "test_mode": true
    },
    "relationships": {
      "store": {
        "data": { "type": "stores", "id": "STORE_ID" }
      },
      "variant": {
        "data": { "type": "variants", "id": "VARIANT_ID" }
      }
    }
  }
}
```

#### 2.4 API Routes

**Router Structure:**

```text
Router::new()
    // Public routes (no auth required)
    .route("/health", GET → health_check)
    .route("/webhooks/lemonsqueezy", POST → handle_webhook)

    // Authenticated routes (JWT required)
    .route("/api/checkout", POST → create_checkout)
    .route("/api/subscriptions/me", GET → get_my_subscription)
    .route("/api/subscriptions/me/cancel", POST → cancel_subscription)
    .route("/api/subscriptions/me/pause", POST → pause_subscription)
    .route("/api/subscriptions/me/resume", POST → resume_subscription)
    .route("/api/subscriptions/me/change-plan", POST → change_plan)
    .route("/api/subscriptions/me/portal", GET → get_customer_portal_url)
    .route("/api/plans", GET → list_available_plans)
```

**Authentication Flow for Protected Routes:**
1. Extract `Authorization: Bearer <jwt>` header
2. Validate JWT using shared `JWT_SECRET` (same as auth-server)
3. Extract `sub` (user_id UUID) from claims
4. Attach user_id to request extensions
5. Handler accesses user_id from extensions

#### 2.5 Frontend Integration Points

The desktop app (Tauri/React) needs minimal changes:

```text
frontend/src/services/
└── paymentService.ts        # NEW: API client for payment-service

Methods:
- createCheckout(variantId: string): Promise<{ checkoutUrl: string }>
- getSubscription(): Promise<SubscriptionStatus | null>
- cancelSubscription(): Promise<void>
- pauseSubscription(): Promise<void>
- resumeSubscription(): Promise<void>
- changePlan(newVariantId: string): Promise<void>
- getPortalUrl(): Promise<{ url: string }>
```

```text
frontend/src/types/
└── payment.ts               # NEW: TypeScript types for payment API responses

Types:
- SubscriptionStatus { id, status, productName, variantName, renewsAt, endsAt, ... }
- CheckoutResponse { checkoutUrl: string }
- Plan { id, name, price, interval, variantId }
```

### Phase 3: Webhook Event Processing Detail

#### Subscription Created Event Flow

```text
LemonSqueezy → POST /webhooks/lemonsqueezy
  │
  ▼
  Verify X-Signature (HMAC-SHA256)
  │
  ▼
  Log event in webhook_events table
  │
  ▼
  Check idempotency (ls_event_id exists and processed?)
  │  YES → Return 200 OK (skip)
  │  NO  ↓
  ▼
  Parse meta.event_name → "subscription_created"
  │
  ▼
  Extract: user_email, custom.user_id from checkout_data
  │
  ▼
  UPSERT customer (by user_id or ls_customer_id)
  │
  ▼
  INSERT subscription record with all attributes:
    - ls_subscription_id, ls_order_id, ls_product_id, ls_variant_id
    - product_name, variant_name, status
    - card_brand, card_last_four
    - trial_ends_at, billing_anchor, renews_at
    - customer_portal_url, update_payment_method_url
    - test_mode
  │
  ▼
  Mark webhook_event as processed
  │
  ▼
  Return 200 OK
```

### Phase 4: Security Design

#### Secrets Management

| Secret | Source | Usage |
|--------|--------|-------|
| `LEMONSQUEEZY_API_KEY` | LemonSqueezy Dashboard → API Keys | Bearer token for LemonSqueezy API calls |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | LemonSqueezy Dashboard → Webhooks | HMAC-SHA256 webhook signature verification |
| `JWT_SECRET` | Shared with auth-server `.env` | Validate user JWT tokens on protected routes |
| `PAYMENT_DATABASE_URL` | Infrastructure/secrets manager | PostgreSQL connection string |

**Security Controls:**
- **SEC-PS-001**: All secrets loaded from environment variables via `dotenvy`, never hardcoded
- **SEC-PS-002**: Webhook endpoint validates HMAC-SHA256 signature using constant-time comparison (`subtle::ConstantTimeEq`) before any processing
- **SEC-PS-003**: All user-facing API endpoints require valid JWT token
- **SEC-PS-004**: CORS restricted to desktop app origin in production
- **SEC-PS-005**: All webhook events are logged for audit trail (including rejected ones)
- **SEC-PS-006**: Database credentials use least-privilege PostgreSQL role
- **SEC-PS-007**: LemonSqueezy API key has minimal required permissions
- **SEC-PS-008**: Raw webhook payloads stored in JSONB for forensic analysis

#### JWT Validation

The payment service validates JWTs issued by auth-server using the shared `JWT_SECRET`. It does NOT issue tokens — only validates them. The JWT claims structure is:

```text
{
  "sub": "user-uuid",        // User ID
  "email": "user@example.com",
  "exp": 1234567890,         // Expiry timestamp
  "iat": 1234567890          // Issued at
}
```

### Phase 5: Error Handling & Resilience

#### Error Taxonomy

| Error | HTTP Code | Action |
|-------|-----------|--------|
| Invalid webhook signature | 400 | Log, reject, do not process |
| Duplicate webhook event | 200 | Log, skip processing, return OK |
| LemonSqueezy API timeout | 502 | Retry with exponential backoff (max 3 retries) |
| LemonSqueezy API rate limit (429) | 429 | Respect `Retry-After` header, queue and retry |
| Database connection failure | 500 | Log, return error, retry with backoff |
| Invalid JWT | 401 | Return unauthorized |
| Subscription not found | 404 | Return not found |
| User has no customer record | 404 | Return "no subscription" response |
| Unknown webhook event type | 200 | Log as unhandled, return OK (don't block LS retries) |

#### Resilience Patterns

1. **Webhook Retry Safety**: LemonSqueezy retries failed webhooks. The service MUST be idempotent and return 200 for already-processed events.
2. **Database Transaction**: Webhook processing wraps customer upsert + subscription insert/update in a single transaction.
3. **Graceful Degradation**: If payment-service is unreachable, the desktop app should fall back to showing "Unable to verify subscription" rather than crashing.
4. **Health Check**: `GET /health` checks database connectivity and returns service status.

### Phase 6: Observability

#### Structured Logging

```text
Level: INFO
- Webhook received: event_name, ls_event_id, source_ip
- Webhook processed: event_name, duration_ms, subscription_id
- Checkout created: user_id, variant_id, checkout_id
- Subscription queried: user_id, status

Level: WARN
- Invalid webhook signature: source_ip, truncated_signature
- Rate limit approaching: remaining_calls, window
- JWT validation failed: error_type

Level: ERROR
- Database connection failure: error_message, retry_count
- LemonSqueezy API error: endpoint, status_code, error_body
- Webhook processing failure: event_name, error_message
```

#### Key Metrics (future)

- `payment_webhooks_received_total` (counter, by event_name)
- `payment_webhooks_processed_duration_seconds` (histogram)
- `payment_webhooks_rejected_total` (counter, by reason)
- `payment_checkout_created_total` (counter)
- `payment_subscription_status_queries_total` (counter)
- `payment_lemonsqueezy_api_duration_seconds` (histogram, by endpoint)

## Integration Points

### Desktop App ↔ Payment Service

```text
1. User clicks "Upgrade" in Settings
2. Frontend calls POST /api/checkout with { variant_id }
3. Payment service creates LemonSqueezy checkout (with user email + user_id in custom data)
4. Returns { checkout_url }
5. Frontend opens checkout_url in default browser (via Tauri shell.open)
6. User completes payment on LemonSqueezy hosted checkout
7. LemonSqueezy sends subscription_created webhook to payment service
8. Payment service stores subscription
9. Next time desktop app queries GET /api/subscriptions/me, it gets active status
10. Desktop app unlocks premium features
```

### Payment Service ↔ Auth Server

- **Shared JWT secret** — payment service validates tokens issued by auth-server
- **No direct API calls** between services in Phase 1 (decoupled via shared user_id in JWT)
- **Future**: Event-driven communication via message queue (e.g., user deleted → cancel subscription)

## Deployment Strategy

### Development

```bash
cd payment-service
cp .env.example .env
# Edit .env with test-mode LemonSqueezy keys
cargo run
# Server starts on http://localhost:3002
```

### Docker (Production-Ready)

```text
payment-service/
└── Dockerfile              # Multi-stage Rust build
```

```dockerfile
# Stage 1: Build
FROM rust:1.77-slim AS builder
WORKDIR /app
COPY . .
RUN cargo build --release

# Stage 2: Runtime
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/payment-service /usr/local/bin/
EXPOSE 3002
CMD ["payment-service"]
```

### Microservice Extraction Path

When ready to extract to a separate repository:
1. Copy `payment-service/` to new repo
2. Update webhook URL in LemonSqueezy dashboard
3. Update desktop app's `PAYMENT_SERVICE_URL` config
4. Deploy independently with own CI/CD
5. Zero code changes required — the service is already fully self-contained

## Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| LemonSqueezy API changes | Low | Medium | Pin to `/v1`, monitor deprecation notices, typed response models catch breaking changes at compile time |
| Webhook delivery failures | Medium | High | Idempotent processing, webhook_events audit log, LemonSqueezy auto-retries, manual replay capability |
| Shared JWT secret rotation | Low | High | Document rotation procedure: update both auth-server and payment-service simultaneously |
| Database schema conflicts with auth-server | Low | Medium | Separate database (or at minimum separate schema), own migrations |
| LemonSqueezy rate limiting | Low | Low | 300 calls/min is generous for expected scale; implement backoff if needed |

## Implementation Order (Recommended)

| Phase | Tasks | Depends On | Estimated Complexity |
|-------|-------|------------|---------------------|
| 1 | Project scaffolding: Cargo.toml, config, db, health endpoint | — | Low |
| 2 | Database migrations (all 4 tables) | Phase 1 | Low |
| 3 | Models & types (DB models + LemonSqueezy API types) | Phase 2 | Medium |
| 4 | Webhook handler + signature verification | Phase 3 | Medium |
| 5 | Webhook event processors (subscription_created, etc.) | Phase 4 | Medium |
| 6 | LemonSqueezy API client (checkout creation) | Phase 3 | Medium |
| 7 | Checkout API endpoint | Phase 6 | Low |
| 8 | Subscription status query endpoint | Phase 5 | Low |
| 9 | Subscription management endpoints (cancel, pause, resume) | Phase 6, Phase 8 | Medium |
| 10 | Plan change endpoint | Phase 9 | Low |
| 11 | Customer portal URL endpoint | Phase 8 | Low |
| 12 | Frontend integration (paymentService.ts, types) | Phase 7, Phase 8 | Medium |
| 13 | JWT auth middleware | Phase 1 | Low |
| 14 | Integration tests | All phases | Medium |

## Complexity Tracking

> No Constitution Check violations. The payment service is a new standalone service that does not impact the existing desktop app bundle, maintains clean architecture, and follows all security principles.

## Follow-ups & Open Questions

1. **Pricing Model**: What plans and pricing will Trueears offer? (Basic/Pro? Monthly/Annual? Usage-based?) — This determines the LemonSqueezy product/variant setup but does NOT block service implementation.
2. **Free Tier vs Trial**: Will free-tier users have limited functionality, or will there be a time-limited free trial on the paid plan?
3. **Offline Subscription Caching**: Should the desktop app cache the subscription status locally (with TTL) so it works offline? (Constitution REL-005 requires offline local dictation)
4. **Shared Database vs Separate Database**: Using a separate database is recommended for true microservice isolation, but a separate schema in the same PostgreSQL instance is acceptable for cost savings during early stages.

---

📋 **Architectural decision detected: Standalone payment service with separate database vs. extending auth-server with payment endpoints.** Document reasoning and tradeoffs? Run `/sp.adr payment-service-architecture`
