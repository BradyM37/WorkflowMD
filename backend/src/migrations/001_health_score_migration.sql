-- Migration: Convert risk_score to health_score
-- This migration inverts the scoring logic to make higher scores = better health
-- Run this ONLY on existing databases. New databases will use the correct schema from the start.

BEGIN;

-- Step 1: Add the new health_score column
ALTER TABLE analysis_results ADD COLUMN IF NOT EXISTS health_score INTEGER;

-- Step 2: Convert existing risk_scores to health_scores (invert the logic)
-- Old: Higher risk_score = worse (0-100)
-- New: Higher health_score = better (0-100)
UPDATE analysis_results 
SET health_score = GREATEST(0, 100 - risk_score)
WHERE health_score IS NULL;

-- Step 3: Make health_score NOT NULL now that data is migrated
ALTER TABLE analysis_results ALTER COLUMN health_score SET NOT NULL;

-- Step 4: Drop the old risk_score column
ALTER TABLE analysis_results DROP COLUMN IF EXISTS risk_score;

-- Step 5: Update the index
DROP INDEX IF EXISTS idx_risk_score;
CREATE INDEX IF NOT EXISTS idx_health_score ON analysis_results(health_score DESC);

COMMIT;

-- Verification query (run after migration):
-- SELECT workflow_name, health_score, created_at FROM analysis_results ORDER BY created_at DESC LIMIT 10;
