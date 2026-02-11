-- Migration: Revenue Attribution & ROI Tracking
-- THE KILLER FEATURE - Connect response time to actual business outcomes
-- Show users the MONEY, not just metrics

-- Link conversations to GHL opportunities/deals
CREATE TABLE IF NOT EXISTS conversation_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  location_id VARCHAR(255) NOT NULL,
  
  -- GHL Opportunity/Deal linkage
  opportunity_id VARCHAR(255),
  pipeline_id VARCHAR(255),
  pipeline_stage VARCHAR(255),
  
  -- Revenue data
  deal_value DECIMAL(12,2),            -- Actual or estimated deal value
  deal_status VARCHAR(50),              -- open, won, lost, abandoned
  converted_at TIMESTAMP,
  lost_at TIMESTAMP,
  
  -- Lead source & estimated value
  lead_source VARCHAR(100),             -- website, facebook, google, referral, etc.
  estimated_lead_value DECIMAL(12,2),   -- Based on source averages
  
  -- Attribution
  response_time_seconds INTEGER,        -- Cached from conversation
  response_time_bucket VARCHAR(20),     -- '<1min', '1-5min', '5-15min', '15-60min', '>1hr', 'missed'
  attributed_to_fast_response BOOLEAN DEFAULT FALSE,
  
  -- Tracking
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(conversation_id)
);

CREATE INDEX idx_conv_revenue_location ON conversation_revenue(location_id);
CREATE INDEX idx_conv_revenue_deal_status ON conversation_revenue(location_id, deal_status);
CREATE INDEX idx_conv_revenue_bucket ON conversation_revenue(location_id, response_time_bucket);
CREATE INDEX idx_conv_revenue_converted ON conversation_revenue(location_id, converted_at) WHERE converted_at IS NOT NULL;

-- Industry conversion benchmarks (based on research)
-- These can be customized per location
CREATE TABLE IF NOT EXISTS revenue_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id VARCHAR(255) UNIQUE NOT NULL,
  
  -- Conversion rates by response time (percentage)
  -- Based on Lead Response Management Study data
  conversion_rate_under_1min DECIMAL(5,2) DEFAULT 21.0,    -- 21% conversion
  conversion_rate_1_5min DECIMAL(5,2) DEFAULT 17.0,        -- 17% conversion
  conversion_rate_5_15min DECIMAL(5,2) DEFAULT 10.0,       -- 10% conversion  
  conversion_rate_15_60min DECIMAL(5,2) DEFAULT 5.0,       -- 5% conversion
  conversion_rate_over_1hr DECIMAL(5,2) DEFAULT 2.0,       -- 2% conversion
  conversion_rate_missed DECIMAL(5,2) DEFAULT 0.5,         -- 0.5% if ever followed up
  
  -- Average deal values by lead source
  avg_deal_value_default DECIMAL(12,2) DEFAULT 500.00,     -- Default if unknown
  avg_deal_value_website DECIMAL(12,2) DEFAULT 750.00,
  avg_deal_value_facebook DECIMAL(12,2) DEFAULT 400.00,
  avg_deal_value_google DECIMAL(12,2) DEFAULT 850.00,
  avg_deal_value_referral DECIMAL(12,2) DEFAULT 1200.00,
  avg_deal_value_organic DECIMAL(12,2) DEFAULT 600.00,
  
  -- User can override these
  custom_avg_deal_value DECIMAL(12,2),
  use_custom_deal_value BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Daily revenue metrics - aggregated for fast dashboards
CREATE TABLE IF NOT EXISTS daily_revenue_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  
  -- Actual revenue (from linked opportunities)
  actual_revenue_won DECIMAL(12,2) DEFAULT 0,
  actual_revenue_lost DECIMAL(12,2) DEFAULT 0,
  actual_deals_won INTEGER DEFAULT 0,
  actual_deals_lost INTEGER DEFAULT 0,
  
  -- Revenue attributed to response speed
  revenue_from_fast_responses DECIMAL(12,2) DEFAULT 0,   -- <5 min responses that converted
  
  -- Estimated lost revenue
  estimated_lost_from_slow DECIMAL(12,2) DEFAULT 0,      -- Slow responses that didn't convert
  estimated_lost_from_missed DECIMAL(12,2) DEFAULT 0,    -- Missed leads (no response)
  
  -- Conversion by bucket
  leads_under_1min INTEGER DEFAULT 0,
  converted_under_1min INTEGER DEFAULT 0,
  leads_1_5min INTEGER DEFAULT 0,
  converted_1_5min INTEGER DEFAULT 0,
  leads_5_15min INTEGER DEFAULT 0,
  converted_5_15min INTEGER DEFAULT 0,
  leads_15_60min INTEGER DEFAULT 0,
  converted_15_60min INTEGER DEFAULT 0,
  leads_over_1hr INTEGER DEFAULT 0,
  converted_over_1hr INTEGER DEFAULT 0,
  leads_missed INTEGER DEFAULT 0,
  converted_missed INTEGER DEFAULT 0,
  
  -- ROI calculation data
  potential_revenue_at_optimal DECIMAL(12,2) DEFAULT 0,  -- If all were <1min
  revenue_gap DECIMAL(12,2) DEFAULT 0,                   -- What they're leaving on table
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(location_id, date)
);

CREATE INDEX idx_daily_revenue_location_date ON daily_revenue_metrics(location_id, date DESC);

-- Monthly aggregated metrics for trends
CREATE TABLE IF NOT EXISTS monthly_revenue_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id VARCHAR(255) NOT NULL,
  year_month VARCHAR(7) NOT NULL, -- '2025-02' format
  
  total_leads INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  
  -- By speed bucket
  fast_response_revenue DECIMAL(12,2) DEFAULT 0,        -- <5 min
  slow_response_revenue DECIMAL(12,2) DEFAULT 0,        -- 5-60 min
  missed_lead_revenue DECIMAL(12,2) DEFAULT 0,          -- >1hr or no response
  
  -- Lost opportunity
  estimated_lost_revenue DECIMAL(12,2) DEFAULT 0,
  
  -- Averages
  avg_response_time_winners INTEGER,
  avg_response_time_losers INTEGER,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(location_id, year_month)
);

-- Insert default benchmarks for existing locations
INSERT INTO revenue_benchmarks (location_id)
SELECT DISTINCT location_id FROM conversations
ON CONFLICT (location_id) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE conversation_revenue IS 'Links conversations to revenue outcomes for ROI tracking';
COMMENT ON TABLE revenue_benchmarks IS 'Industry benchmarks and custom settings for revenue calculations';
COMMENT ON TABLE daily_revenue_metrics IS 'Pre-aggregated daily revenue metrics for fast dashboard loading';
COMMENT ON COLUMN daily_revenue_metrics.revenue_gap IS 'The money being left on the table - difference between actual and optimal performance';
