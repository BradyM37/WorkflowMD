-- Migration: Add stripe_events table for webhook idempotency
-- Ensures we don't process the same Stripe event twice

CREATE TABLE IF NOT EXISTS stripe_events (
  id VARCHAR(255) PRIMARY KEY,
  processed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stripe_events' AND column_name = 'type') THEN
    ALTER TABLE stripe_events ADD COLUMN type VARCHAR(100);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stripe_events' AND column_name = 'data') THEN
    ALTER TABLE stripe_events ADD COLUMN data JSONB;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stripe_events' AND column_name = 'created_at') THEN
    ALTER TABLE stripe_events ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- Index for faster lookups (only create if type column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stripe_events' AND column_name = 'type') THEN
    CREATE INDEX IF NOT EXISTS idx_stripe_events_type ON stripe_events(type);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_stripe_events_processed_at ON stripe_events(processed_at);

-- Add subscription_ends_at column to oauth_tokens if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'oauth_tokens' AND column_name = 'subscription_ends_at'
  ) THEN
    ALTER TABLE oauth_tokens ADD COLUMN subscription_ends_at TIMESTAMP;
  END IF;
END $$;

-- Add risk_score column to analysis_results if health_score doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'analysis_results' AND column_name = 'health_score'
  ) THEN
    -- Rename risk_score to health_score (100 - risk_score if exists)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'analysis_results' AND column_name = 'risk_score'
    ) THEN
      ALTER TABLE analysis_results RENAME COLUMN risk_score TO health_score;
      -- Update values to flip the scale
      UPDATE analysis_results SET health_score = 100 - health_score WHERE health_score IS NOT NULL;
    ELSE
      ALTER TABLE analysis_results ADD COLUMN health_score INTEGER;
    END IF;
  END IF;
END $$;

COMMENT ON TABLE stripe_events IS 'Stores Stripe webhook events for idempotency - prevents duplicate processing';
