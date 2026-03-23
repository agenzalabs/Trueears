-- Create order status enum
CREATE TYPE order_status AS ENUM ('paid', 'refunded', 'partial_refund');

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id       UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_ls_order_id ON orders(ls_order_id);

-- Comments
COMMENT ON TABLE orders IS 'Payment orders from LemonSqueezy';
COMMENT ON COLUMN orders.ls_order_id IS 'LemonSqueezy order ID';
COMMENT ON COLUMN orders.total IS 'Order total amount in cents';
