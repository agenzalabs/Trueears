-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL UNIQUE,          -- References auth-server users.id
    ls_customer_id  BIGINT UNIQUE,                 -- LemonSqueezy customer ID
    email           VARCHAR(255) NOT NULL,
    name            VARCHAR(255),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_ls_customer_id ON customers(ls_customer_id);

-- Comments
COMMENT ON TABLE customers IS 'Maps internal user IDs to LemonSqueezy customer IDs';
COMMENT ON COLUMN customers.user_id IS 'References user ID from auth-server';
COMMENT ON COLUMN customers.ls_customer_id IS 'LemonSqueezy customer ID';
