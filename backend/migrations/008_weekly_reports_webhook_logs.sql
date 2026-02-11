-- Migration 008: Weekly Reports & Webhook Logs
-- Adds weekly_report_enabled to alert_settings
-- Creates webhook_logs table for debugging

-- ===== WEEKLY REPORTS =====
-- Add weekly_report_enabled to alert_settings
ALTER TABLE alert_settings 
ADD COLUMN IF NOT EXISTS weekly_report_enabled BOOLEAN DEFAULT false;

-- Add daily_report_enabled column for consistency
ALTER TABLE alert_settings 
ADD COLUMN IF NOT EXISTS daily_report_enabled BOOLEAN DEFAULT true;

-- Add updated_at if missing
ALTER TABLE alert_settings 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ===== WEBHOOK LOGS =====
-- Create webhook_logs table for debugging incoming webhooks
CREATE TABLE IF NOT EXISTS webhook_logs (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'ghl', -- 'ghl', 'stripe', 'other'
  location_id VARCHAR(255),
  payload JSONB NOT NULL,
  headers JSONB,
  ip_address VARCHAR(45),
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'received', -- 'received', 'processed', 'failed', 'ignored'
  error_message TEXT,
  processing_time_ms INTEGER
);

-- Create indexes for webhook logs
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_source ON webhook_logs(source);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_location_id ON webhook_logs(location_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed_at ON webhook_logs(processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_webhook_logs_location_time 
ON webhook_logs(location_id, processed_at DESC);

-- Comment on table
COMMENT ON TABLE webhook_logs IS 'Logs all incoming webhooks for debugging and auditing';

-- ===== HEALTH CHECK DATA =====
-- Create system_health table for storing health metrics
CREATE TABLE IF NOT EXISTS system_health (
  id SERIAL PRIMARY KEY,
  component VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'unknown', -- 'healthy', 'degraded', 'unhealthy', 'unknown'
  last_check_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_success_at TIMESTAMP,
  details JSONB,
  UNIQUE(component)
);

-- Insert default health components
INSERT INTO system_health (component, status) VALUES
  ('database', 'unknown'),
  ('ghl_api', 'unknown'),
  ('response_sync', 'unknown'),
  ('webhook_receiver', 'unknown')
ON CONFLICT (component) DO NOTHING;

-- Index for health checks
CREATE INDEX IF NOT EXISTS idx_system_health_component ON system_health(component);
