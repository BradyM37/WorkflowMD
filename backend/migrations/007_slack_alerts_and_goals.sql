-- Migration: Slack Alerts and Response Time Goals
-- Adds columns for real-time Slack alerting and goal tracking

-- Add slack_alerted flag to conversations to prevent duplicate alerts
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS slack_alerted BOOLEAN DEFAULT FALSE;

-- Index for finding un-alerted waiting conversations
CREATE INDEX IF NOT EXISTS idx_conversations_slack_pending 
ON conversations(location_id, first_inbound_at) 
WHERE first_response_at IS NULL AND slack_alerted = false;

-- Add configurable alert wait threshold (when to send Slack alerts)
ALTER TABLE alert_settings 
ADD COLUMN IF NOT EXISTS alert_wait_threshold INTEGER DEFAULT 300;

-- Add target response time for goal tracking (in seconds)
ALTER TABLE alert_settings 
ADD COLUMN IF NOT EXISTS target_response_time INTEGER DEFAULT 120;

-- Add goal achievement tracking
ALTER TABLE alert_settings 
ADD COLUMN IF NOT EXISTS goal_celebration_shown_date DATE;

-- Create daily goal progress table for historical tracking
CREATE TABLE IF NOT EXISTS daily_goal_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  
  -- Goal settings for that day
  target_response_time INTEGER NOT NULL,
  
  -- Progress metrics
  total_responses INTEGER DEFAULT 0,
  responses_meeting_goal INTEGER DEFAULT 0,
  goal_percentage DECIMAL(5,2) DEFAULT 0,
  
  -- Achievement flag
  goal_achieved BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(location_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_goal_progress_location 
ON daily_goal_progress(location_id, date DESC);

-- Comment on new columns
COMMENT ON COLUMN conversations.slack_alerted IS 'True if a Slack alert was sent for this waiting lead';
COMMENT ON COLUMN alert_settings.alert_wait_threshold IS 'Seconds to wait before sending Slack alert (default 300 = 5 min)';
COMMENT ON COLUMN alert_settings.target_response_time IS 'Target response time goal in seconds (default 120 = 2 min)';
COMMENT ON COLUMN alert_settings.goal_celebration_shown_date IS 'Last date celebration was shown to prevent repeat animations';
