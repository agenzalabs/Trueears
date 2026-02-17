-- Add stronger idempotency support for webhook delivery retries
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_ls_event_id_unique
ON webhook_events (ls_event_id)
WHERE ls_event_id IS NOT NULL;

-- Extend orders for one-time license tracking
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS license_key VARCHAR(255),
    ADD COLUMN IF NOT EXISTS license_key_id BIGINT,
    ADD COLUMN IF NOT EXISTS license_status VARCHAR(50),
    ADD COLUMN IF NOT EXISTS license_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS license_activations_used INTEGER,
    ADD COLUMN IF NOT EXISTS license_activations_limit INTEGER,
    ADD COLUMN IF NOT EXISTS ls_product_id BIGINT,
    ADD COLUMN IF NOT EXISTS ls_variant_id BIGINT,
    ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_orders_license_key ON orders(license_key);
CREATE INDEX IF NOT EXISTS idx_orders_ls_variant_id ON orders(ls_variant_id);

-- Device activation records
CREATE TABLE IF NOT EXISTS license_activations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID REFERENCES orders(id) ON DELETE SET NULL,
    customer_id         UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL,
    license_key         VARCHAR(255) NOT NULL,
    ls_license_id       BIGINT,
    ls_instance_id      VARCHAR(255) NOT NULL,
    device_name         VARCHAR(255),
    device_fingerprint  VARCHAR(255),
    status              VARCHAR(50) NOT NULL DEFAULT 'active',
    activated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deactivated_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_license_activations_ls_instance_id_unique
ON license_activations(ls_instance_id);

CREATE INDEX IF NOT EXISTS idx_license_activations_user_id ON license_activations(user_id);
CREATE INDEX IF NOT EXISTS idx_license_activations_license_key ON license_activations(license_key);
