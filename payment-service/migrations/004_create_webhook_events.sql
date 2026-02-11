-- Create webhook_events table for audit trail
CREATE TABLE IF NOT EXISTS webhook_events (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name        VARCHAR(100) NOT NULL,
    ls_event_id       VARCHAR(255),                -- For idempotency
    payload           JSONB NOT NULL,
    processed         BOOLEAN NOT NULL DEFAULT FALSE,
    processing_error  TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_name ON webhook_events(event_name);
CREATE INDEX IF NOT EXISTS idx_webhook_events_ls_event_id ON webhook_events(ls_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);

-- Comments
COMMENT ON TABLE webhook_events IS 'Audit log of all received webhook events from LemonSqueezy';
COMMENT ON COLUMN webhook_events.ls_event_id IS 'LemonSqueezy event ID for idempotency checking';
COMMENT ON COLUMN webhook_events.processed IS 'Whether the event has been successfully processed';
