-- Migration: Response Time Tracker
-- Pivot from workflow analysis to conversation response tracking

-- Track conversations for response time analysis
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ghl_conversation_id VARCHAR(255) UNIQUE NOT NULL,
  location_id VARCHAR(255) NOT NULL,
  contact_id VARCHAR(255),
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(255),
  channel VARCHAR(50), -- sms, email, facebook, instagram, whatsapp, gmb, etc.
  first_inbound_at TIMESTAMP,
  first_response_at TIMESTAMP,
  response_time_seconds INTEGER,
  assigned_user_id VARCHAR(255),
  assigned_user_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'open', -- open, won, lost, etc.
  is_missed BOOLEAN DEFAULT FALSE,
  last_message_at TIMESTAMP,
  last_message_direction VARCHAR(10), -- inbound, outbound
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_conversations_location ON conversations(location_id);
CREATE INDEX IF NOT EXISTS idx_conversations_first_inbound ON conversations(location_id, first_inbound_at);
CREATE INDEX IF NOT EXISTS idx_conversations_missed ON conversations(location_id, is_missed) WHERE is_missed = true;
CREATE INDEX IF NOT EXISTS idx_conversations_assigned ON conversations(location_id, assigned_user_id);

-- Track individual messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ghl_message_id VARCHAR(255) UNIQUE NOT NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  location_id VARCHAR(255) NOT NULL,
  direction VARCHAR(10) NOT NULL, -- inbound, outbound
  channel VARCHAR(50),
  message_type VARCHAR(50), -- sms, email, fb, ig, etc.
  sent_at TIMESTAMP NOT NULL,
  sent_by_user_id VARCHAR(255),
  sent_by_user_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_location_sent ON messages(location_id, sent_at);

-- Daily aggregated metrics for fast dashboard loading
CREATE TABLE IF NOT EXISTS daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  
  -- Volume metrics
  total_conversations INTEGER DEFAULT 0,
  new_conversations INTEGER DEFAULT 0,
  total_inbound_messages INTEGER DEFAULT 0,
  total_outbound_messages INTEGER DEFAULT 0,
  
  -- Response time metrics (in seconds)
  avg_response_time INTEGER,
  median_response_time INTEGER,
  min_response_time INTEGER,
  max_response_time INTEGER,
  p90_response_time INTEGER,
  
  -- Speed buckets
  responses_under_1min INTEGER DEFAULT 0,
  responses_under_5min INTEGER DEFAULT 0,
  responses_under_15min INTEGER DEFAULT 0,
  responses_under_1hr INTEGER DEFAULT 0,
  responses_over_1hr INTEGER DEFAULT 0,
  
  -- Missed tracking
  missed_conversations INTEGER DEFAULT 0,
  
  -- Channel breakdown (JSON for flexibility)
  channel_breakdown JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(location_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_metrics_location_date ON daily_metrics(location_id, date DESC);

-- Per-user daily metrics
CREATE TABLE IF NOT EXISTS user_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id VARCHAR(255) NOT NULL,
  ghl_user_id VARCHAR(255) NOT NULL,
  user_name VARCHAR(255),
  user_email VARCHAR(255),
  date DATE NOT NULL,
  
  -- Response metrics
  total_responses INTEGER DEFAULT 0,
  avg_response_time INTEGER,
  fastest_response INTEGER,
  slowest_response INTEGER,
  
  -- Conversation metrics
  conversations_handled INTEGER DEFAULT 0,
  missed_conversations INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(location_id, ghl_user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_user_daily_metrics_location ON user_daily_metrics(location_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_user_daily_metrics_user ON user_daily_metrics(ghl_user_id, date DESC);

-- Alert thresholds per location
CREATE TABLE IF NOT EXISTS alert_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id VARCHAR(255) UNIQUE NOT NULL,
  
  -- Thresholds (in seconds)
  warning_threshold INTEGER DEFAULT 300,   -- 5 minutes
  critical_threshold INTEGER DEFAULT 900,  -- 15 minutes
  missed_threshold INTEGER DEFAULT 3600,   -- 1 hour
  
  -- Notification settings
  email_alerts BOOLEAN DEFAULT true,
  slack_webhook_url VARCHAR(500),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sync tracking - know what we've already processed
CREATE TABLE IF NOT EXISTS sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id VARCHAR(255) UNIQUE NOT NULL,
  last_sync_at TIMESTAMP,
  last_conversation_cursor VARCHAR(255),
  sync_status VARCHAR(50) DEFAULT 'pending', -- pending, syncing, completed, error
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
