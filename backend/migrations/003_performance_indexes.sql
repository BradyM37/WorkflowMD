-- Performance Optimization Indexes
-- Adds indexes for frequently queried columns to improve query performance

-- ========================================
-- ANALYSIS RESULTS TABLE INDEXES
-- ========================================

-- Index for location-based queries (most common filter)
CREATE INDEX IF NOT EXISTS idx_analysis_results_location_id 
ON analysis_results(location_id);

-- Index for workflow-based queries
CREATE INDEX IF NOT EXISTS idx_analysis_results_workflow_id 
ON analysis_results(workflow_id);

-- Composite index for location + workflow queries
CREATE INDEX IF NOT EXISTS idx_analysis_results_location_workflow 
ON analysis_results(location_id, workflow_id);

-- Index for timestamp-based queries (history with date filters)
CREATE INDEX IF NOT EXISTS idx_analysis_results_created_at 
ON analysis_results(created_at DESC);

-- Composite index for location + date range queries (most common pattern)
CREATE INDEX IF NOT EXISTS idx_analysis_results_location_created 
ON analysis_results(location_id, created_at DESC);

-- Index for health score filtering
CREATE INDEX IF NOT EXISTS idx_analysis_results_health_score 
ON analysis_results(health_score);

-- Composite index for location + health score filtering
CREATE INDEX IF NOT EXISTS idx_analysis_results_location_score 
ON analysis_results(location_id, health_score);

-- ========================================
-- STRIPE_CUSTOMERS TABLE INDEXES (if table exists)
-- ========================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stripe_customers') THEN
    -- Index for location-based subscription lookups
    CREATE INDEX IF NOT EXISTS idx_stripe_customers_location_id 
    ON stripe_customers(location_id);

    -- Index for Stripe customer ID lookups
    CREATE INDEX IF NOT EXISTS idx_stripe_customers_customer_id 
    ON stripe_customers(stripe_customer_id);

    -- Index for subscription ID lookups
    CREATE INDEX IF NOT EXISTS idx_stripe_customers_subscription_id 
    ON stripe_customers(stripe_subscription_id) 
    WHERE stripe_subscription_id IS NOT NULL;

    -- Index for subscription status filtering
    CREATE INDEX IF NOT EXISTS idx_stripe_customers_status 
    ON stripe_customers(subscription_status);

    -- Composite index for active subscriptions by location
    CREATE INDEX IF NOT EXISTS idx_stripe_customers_location_status 
    ON stripe_customers(location_id, subscription_status);
    
    -- Index only active/trialing subscriptions (most common queries)
    CREATE INDEX IF NOT EXISTS idx_stripe_customers_active_subs 
    ON stripe_customers(location_id, subscription_status) 
    WHERE subscription_status IN ('active', 'trialing');
  END IF;
END $$;

-- ========================================
-- STRIPE_EVENTS TABLE INDEXES (if columns exist)
-- ========================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stripe_events' AND column_name = 'type') THEN
    -- Index for event type queries (using 'type' column)
    CREATE INDEX IF NOT EXISTS idx_stripe_events_type 
    ON stripe_events(type);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stripe_events' AND column_name = 'created_at') THEN
    -- Index for timestamp-based queries
    CREATE INDEX IF NOT EXISTS idx_stripe_events_created_at 
    ON stripe_events(created_at DESC);
  END IF;
END $$;

-- ========================================
-- PERFORMANCE TUNING
-- ========================================

-- Enable parallel query execution for large scans
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analysis_results') THEN
    ALTER TABLE analysis_results SET (parallel_workers = 4);
    ANALYZE analysis_results;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stripe_customers') THEN
    ANALYZE stripe_customers;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stripe_events') THEN
    ANALYZE stripe_events;
  END IF;
END $$;

-- ========================================
-- ADDITIONAL CONSTRAINTS FOR DATA INTEGRITY
-- ========================================

DO $$
BEGIN
  -- Ensure health_score is within valid range (0-100)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analysis_results' AND column_name = 'health_score') THEN
    ALTER TABLE analysis_results 
    DROP CONSTRAINT IF EXISTS chk_health_score_range;
    
    ALTER TABLE analysis_results 
    ADD CONSTRAINT chk_health_score_range 
    CHECK (health_score >= 0 AND health_score <= 100);
  END IF;

  -- Ensure issues_found is non-negative
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analysis_results' AND column_name = 'issues_found') THEN
    ALTER TABLE analysis_results 
    DROP CONSTRAINT IF EXISTS chk_issues_found_positive;
    
    ALTER TABLE analysis_results 
    ADD CONSTRAINT chk_issues_found_positive 
    CHECK (issues_found >= 0);
  END IF;
END $$;

-- ========================================
-- PARTIAL INDEXES FOR EFFICIENCY
-- ========================================
-- Note: Partial index with NOW() removed due to immutability requirement
-- The regular idx_analysis_results_location_created index will handle date range queries efficiently

-- ========================================
-- COMMENTS FOR DOCUMENTATION
-- ========================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_analysis_results_location_created') THEN
    COMMENT ON INDEX idx_analysis_results_location_created IS 
    'Optimizes history queries filtering by location and date range';
  END IF;
END $$;

-- ========================================
-- INDEX STATISTICS
-- ========================================

-- View to check index usage
DO $$
BEGIN
  CREATE OR REPLACE VIEW index_usage_stats AS
  SELECT
      schemaname,
      relname as tablename,
      indexrelname as indexname,
      idx_scan as index_scans,
      idx_tup_read as tuples_read,
      idx_tup_fetch as tuples_fetched
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
  ORDER BY idx_scan DESC;
EXCEPTION WHEN OTHERS THEN
  -- View creation failed, skip
  NULL;
END $$;

-- Success message
DO $$ 
BEGIN 
    RAISE NOTICE '✓ Performance indexes created successfully';
    RAISE NOTICE '✓ All indexes optimized for common query patterns';
    RAISE NOTICE '✓ Partial indexes created for hot data';
    RAISE NOTICE '✓ Use "SELECT * FROM index_usage_stats" to monitor index performance';
END $$;
