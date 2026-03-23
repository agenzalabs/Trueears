# Feature Specification: Payment Service (LemonSqueezy)

**Feature Branch**: `006-payment-service`
**Created**: 2026-02-11
**Status**: Draft
**Input**: User description: "Plan to develop the payment service in Scribe using LemonSqueezy payment gateway. Make a separate directory for payment service so in future we can shift to microservices easily."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Subscribe to a Plan via Checkout (Priority: P1)

A Trueears user wants to upgrade from a free tier to a paid subscription plan. From the desktop app's settings or a dedicated pricing screen, they click a "Subscribe" or "Upgrade" button. The system creates a LemonSqueezy checkout session server-side and opens a checkout overlay (or redirects to the hosted checkout page). The user completes payment through LemonSqueezy's secure checkout. Once payment succeeds, LemonSqueezy fires a webhook to our payment service, which records the subscription and links it to the user's account. The desktop app is notified of the new subscription status and unlocks premium features.

**Why this priority**: This is the core monetization flow. Without checkout and subscription creation, there is no revenue. Every other payment feature depends on this working first.

**Independent Test**: Can be fully tested by triggering a checkout creation API call, completing payment in LemonSqueezy test mode, receiving the `subscription_created` webhook, and verifying the user's subscription status is updated in the database and queryable via API.

**Acceptance Scenarios**:

1. **Given** an authenticated user on the free tier, **When** the user initiates a subscription checkout, **Then** the payment service creates a LemonSqueezy checkout with the user's email pre-filled and returns a checkout URL.

2. **Given** a valid checkout URL is returned, **When** the user completes payment on LemonSqueezy's checkout page, **Then** LemonSqueezy sends a `subscription_created` webhook to the payment service.

3. **Given** the payment service receives a `subscription_created` webhook, **When** the webhook signature is verified via HMAC-SHA256, **Then** a new subscription record is created in the payment database linked to the user's account.

4. **Given** a subscription is successfully created, **When** the desktop app queries the user's subscription status, **Then** the API returns the active subscription with plan details, renewal date, and status.

5. **Given** the checkout is in test mode, **When** a test payment is processed, **Then** the subscription is created with `test_mode: true` and does not affect production data.

---

### User Story 2 - Webhook Processing & Signature Verification (Priority: P1)

The payment service receives real-time event notifications from LemonSqueezy via webhooks. Each webhook request includes an `X-Signature` header containing an HMAC-SHA256 hash of the request body. The service MUST verify this signature before processing any event. Supported events include `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_expired`, `subscription_paused`, `subscription_resumed`, `order_created`, and `order_refunded`.

**Why this priority**: Webhook processing is the backbone of the entire payment system. Without reliable, secure webhook handling, the service cannot know about any payment events. This is co-P1 with checkout because checkout is useless without webhook processing.

**Independent Test**: Can be tested by sending mock webhook payloads with valid and invalid signatures to the webhook endpoint and verifying correct acceptance/rejection behavior.

**Acceptance Scenarios**:

1. **Given** a webhook request arrives at `/webhooks/lemonsqueezy`, **When** the `X-Signature` header matches the HMAC-SHA256 of the raw body using the configured webhook secret, **Then** the event is accepted and processed (HTTP 200).

2. **Given** a webhook request arrives with an invalid or missing `X-Signature`, **When** the signature verification fails, **Then** the request is rejected with HTTP 400 and no data is modified.

3. **Given** a valid `subscription_created` event is received, **When** the event is processed, **Then** a subscription record is created/updated with all relevant fields (store_id, customer_id, variant_id, status, renews_at, etc.).

4. **Given** a valid `subscription_updated` event is received with status `cancelled`, **When** the event is processed, **Then** the subscription record is updated with `cancelled: true` and `ends_at` is set.

5. **Given** a valid `order_refunded` event is received, **When** the event is processed, **Then** the associated order is marked as refunded and the subscription (if any) is updated accordingly.

6. **Given** a duplicate webhook event (same event ID), **When** the event is received again, **Then** the system handles it idempotently without creating duplicate records.

---

### User Story 3 - Query Subscription Status (Priority: P2)

An authenticated user or the desktop app needs to check the current subscription status. The payment service exposes an API endpoint that returns the user's active subscription details including plan name, status, renewal date, and whether the subscription is in a trial, active, paused, or cancelled state. The desktop app uses this to gate premium features.

**Why this priority**: Feature gating depends on knowing the subscription status. This is the read-side of the payment system and is essential for the desktop app to enforce plan limits.

**Independent Test**: Can be tested by creating a subscription record in the database and querying the status endpoint with a valid JWT, verifying the correct subscription data is returned.

**Acceptance Scenarios**:

1. **Given** an authenticated user with an active subscription, **When** the user queries `GET /api/subscriptions/me`, **Then** the API returns the subscription details including status, plan name, variant, renewal date, and customer portal URL.

2. **Given** an authenticated user with no subscription, **When** the user queries `GET /api/subscriptions/me`, **Then** the API returns a response indicating no active subscription (free tier).

3. **Given** an authenticated user with a cancelled subscription that hasn't expired yet, **When** the user queries their status, **Then** the API returns `status: "cancelled"` with `ends_at` indicating when access expires.

4. **Given** an unauthenticated request, **When** the status endpoint is called without a valid JWT, **Then** the API returns HTTP 401.

---

### User Story 4 - Manage Subscription (Pause, Resume, Cancel) (Priority: P3)

A subscribed user wants to manage their subscription. They can cancel (which takes effect at end of billing period), pause payments, or resume a paused subscription. These actions are proxied through the payment service to LemonSqueezy's API, and the local subscription record is updated when the corresponding webhook arrives.

**Why this priority**: Subscription management is important for user trust and churn reduction, but it's not required for initial launch. Users can also manage subscriptions through LemonSqueezy's customer portal directly.

**Independent Test**: Can be tested by calling the cancel/pause/resume endpoints and verifying the corresponding LemonSqueezy API call is made and the subscription record is updated when the webhook arrives.

**Acceptance Scenarios**:

1. **Given** an authenticated user with an active subscription, **When** the user requests cancellation via `POST /api/subscriptions/me/cancel`, **Then** the payment service calls LemonSqueezy's update subscription API with `cancelled: true` and returns success.

2. **Given** a cancellation request is processed, **When** the `subscription_updated` webhook arrives, **Then** the local subscription record shows `cancelled: true` with `ends_at` set to end of current billing period.

3. **Given** an authenticated user with an active subscription, **When** the user requests pause via `POST /api/subscriptions/me/pause`, **Then** the payment service calls LemonSqueezy's API with pause mode and the subscription status is updated on webhook receipt.

4. **Given** an authenticated user with a paused subscription, **When** the user requests resume via `POST /api/subscriptions/me/resume`, **Then** the payment service calls LemonSqueezy to unpause and the subscription resumes on webhook confirmation.

---

### User Story 5 - Upgrade/Downgrade Plan (Priority: P3)

A subscribed user wants to change their plan tier (e.g., from Basic to Pro, or Pro to Basic). The payment service handles plan changes by updating the subscription's variant_id through LemonSqueezy's API. Charges are prorated by default (credit issued on downgrade, immediate charge on upgrade).

**Why this priority**: Plan changes are a growth feature. Initially, a single plan may suffice, making this a later priority. LemonSqueezy handles proration automatically.

**Independent Test**: Can be tested by calling the plan change endpoint with a new variant_id, verifying the LemonSqueezy API is called, and confirming the subscription record updates when the webhook arrives.

**Acceptance Scenarios**:

1. **Given** an authenticated user with an active subscription on Plan A, **When** the user requests an upgrade to Plan B via `POST /api/subscriptions/me/change-plan`, **Then** the payment service calls LemonSqueezy's PATCH /v1/subscriptions/:id with the new variant_id.

2. **Given** an upgrade is processed, **When** the `subscription_updated` webhook arrives, **Then** the local subscription record reflects the new variant_id and plan name.

3. **Given** a downgrade request, **When** LemonSqueezy processes it, **Then** a prorated credit is issued for the next invoice (handled by LemonSqueezy, verified via webhook data).

---

### User Story 6 - Customer Portal Access (Priority: P4)

A user wants to update their payment method or view billing history. Rather than building custom UI for this, the payment service provides the LemonSqueezy customer portal URL. The user is redirected to LemonSqueezy's hosted portal where they can manage payment details, view invoices, and update billing information.

**Why this priority**: LemonSqueezy provides a fully hosted customer portal, so building custom billing UI is unnecessary for MVP. This is a convenience feature that reduces development effort.

**Independent Test**: Can be tested by requesting the portal URL for a subscribed user and verifying a valid LemonSqueezy customer portal URL is returned.

**Acceptance Scenarios**:

1. **Given** an authenticated user with a subscription, **When** the user requests `GET /api/subscriptions/me/portal`, **Then** the API returns the `customer_portal` URL from the subscription's URLs.

2. **Given** the customer portal URL, **When** the user opens it in a browser, **Then** they can view invoices, update payment method, and manage their subscription.

---

### Edge Cases

- What happens if a webhook is received for a user who doesn't exist in the auth database?
- What happens if the payment service is down when LemonSqueezy sends a webhook? (LemonSqueezy retries failed webhooks)
- What happens if a user has multiple subscriptions (should be prevented at checkout creation)?
- How does the system handle LemonSqueezy API rate limits (300 calls/minute)?
- What happens if the user's subscription expires while the desktop app is offline?
- What happens if webhook events arrive out of order (e.g., `subscription_updated` before `subscription_created`)?
- How are PayPal subscriptions handled differently? (LemonSqueezy requires customer portal redirect for PayPal modifications)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST create LemonSqueezy checkout sessions with user email pre-filled and custom data containing the internal user ID.
- **FR-002**: System MUST verify webhook signatures using HMAC-SHA256 with the configured webhook secret before processing any event.
- **FR-003**: System MUST handle the following webhook events: `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_expired`, `subscription_paused`, `subscription_resumed`, `order_created`, `order_refunded`.
- **FR-004**: System MUST store subscription records locally with mapping to internal user IDs.
- **FR-005**: System MUST expose an authenticated API endpoint to query a user's current subscription status.
- **FR-006**: System MUST proxy subscription management actions (cancel, pause, resume, plan change) to LemonSqueezy's API.
- **FR-007**: System MUST handle webhook events idempotently (processing the same event twice must not create duplicate records).
- **FR-008**: System MUST support LemonSqueezy test mode for development and staging environments.
- **FR-009**: System MUST validate JWT tokens from the auth-server for all authenticated endpoints.
- **FR-010**: System MUST be deployed as a standalone service with its own database, independent of the auth-server and desktop backend.
- **FR-011**: System MUST log all webhook events and API calls for auditability.
- **FR-012**: System MUST return customer portal URLs for billing self-service.

### Key Entities

- **Subscription**: Represents a user's subscription. Key attributes: `id`, `user_id`, `lemonsqueezy_subscription_id`, `lemonsqueezy_customer_id`, `variant_id`, `product_name`, `variant_name`, `status` (active, on_trial, paused, cancelled, expired), `card_brand`, `card_last_four`, `renews_at`, `ends_at`, `trial_ends_at`, `customer_portal_url`, `update_payment_method_url`, `test_mode`, `created_at`, `updated_at`.

- **Order**: Represents a payment order. Key attributes: `id`, `user_id`, `lemonsqueezy_order_id`, `lemonsqueezy_customer_id`, `subscription_id` (nullable), `status` (paid, refunded, partial_refund), `total`, `currency`, `created_at`, `updated_at`.

- **WebhookEvent**: Audit log of all received webhook events. Key attributes: `id`, `event_name`, `lemonsqueezy_event_id`, `payload` (JSON), `processed`, `processing_error` (nullable), `created_at`.

- **Customer**: Maps LemonSqueezy customer to internal user. Key attributes: `id`, `user_id`, `lemonsqueezy_customer_id`, `email`, `name`, `created_at`, `updated_at`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete a subscription checkout flow end-to-end in under 60 seconds (excluding payment time on LemonSqueezy).
- **SC-002**: Webhook events are processed and subscription status is updated within 5 seconds of receipt.
- **SC-003**: 100% of webhook events with invalid signatures are rejected (zero false accepts).
- **SC-004**: Subscription status query API responds in under 100ms (p95).
- **SC-005**: Payment service starts up and passes health check within 3 seconds.
- **SC-006**: All webhook events are idempotent — processing the same event N times produces the same database state as processing it once.
- **SC-007**: Payment service can be deployed, scaled, and torn down independently of auth-server and desktop backend.
- **SC-008**: Zero secrets (API keys, webhook secrets) are hardcoded in source code; all loaded from environment variables.