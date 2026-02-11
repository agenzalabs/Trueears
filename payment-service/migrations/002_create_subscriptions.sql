-- Create subscription status enum
CREATE TYPE subscription_status AS ENUM (
    'on_trial',
    'active',
    'paused',
    'past_due',
    'unpaid',
    'cancelled',
    'expired'
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id                 UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_ls_subscription_id ON subscriptions(ls_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Comments
COMMENT ON TABLE subscriptions IS 'Subscription records from LemonSqueezy';
COMMENT ON COLUMN subscriptions.ls_subscription_id IS 'LemonSqueezy subscription ID';
COMMENT ON COLUMN subscriptions.status IS 'Subscription status: on_trial, active, paused, past_due, unpaid, cancelled, expired';
