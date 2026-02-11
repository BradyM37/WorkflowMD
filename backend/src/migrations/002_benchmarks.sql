-- Benchmark History Table
-- Tracks user's percentile rankings over time for trend analysis

CREATE TABLE IF NOT EXISTS benchmark_history (
    id SERIAL PRIMARY KEY,
    location_id VARCHAR(255) NOT NULL,
    percentile INTEGER NOT NULL CHECK (percentile >= 0 AND percentile <= 100),
    tier VARCHAR(20) NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
    avg_response_time INTEGER, -- in seconds
    avg_health_score INTEGER CHECK (avg_health_score >= 0 AND avg_health_score <= 100),
    industry_id VARCHAR(50) DEFAULT 'default',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_benchmark_history_location 
ON benchmark_history(location_id);

CREATE INDEX IF NOT EXISTS idx_benchmark_history_created 
ON benchmark_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_benchmark_history_location_created 
ON benchmark_history(location_id, created_at DESC);

-- User Preferences Table (if not exists)
-- Stores industry preference and other settings

CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    location_id VARCHAR(255) UNIQUE NOT NULL,
    industry_id VARCHAR(50) DEFAULT 'default',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_location 
ON user_preferences(location_id);

-- Response Metrics Table (if not exists)
-- For tracking response times from conversation analysis

CREATE TABLE IF NOT EXISTS response_metrics (
    id SERIAL PRIMARY KEY,
    location_id VARCHAR(255) NOT NULL,
    conversation_id VARCHAR(255),
    response_time_seconds INTEGER NOT NULL,
    channel VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_response_metrics_location 
ON response_metrics(location_id);

CREATE INDEX IF NOT EXISTS idx_response_metrics_created 
ON response_metrics(created_at DESC);

-- Comments for documentation
COMMENT ON TABLE benchmark_history IS 'Historical tracking of user benchmark percentiles for trend analysis';
COMMENT ON TABLE user_preferences IS 'User settings including industry vertical for benchmarking';
COMMENT ON TABLE response_metrics IS 'Individual response time measurements from conversations';
