-- Migration: Gamification Badges System
-- Track user achievements and badges

CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  user_name VARCHAR(255),
  badge_type VARCHAR(50) NOT NULL,
  earned_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  
  -- Prevent duplicate badges of same type on same day
  UNIQUE(location_id, user_id, badge_type, (earned_at::DATE))
);

-- Badge types:
-- speed_demon: Response in <1 minute
-- perfect_day: 100% response rate for a day
-- early_bird: First response before 8am
-- night_owl: Responded after 9pm
-- streak_3: 3 consecutive perfect days
-- streak_7: 7 consecutive perfect days

CREATE INDEX IF NOT EXISTS idx_badges_user ON badges(location_id, user_id, earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_badges_type ON badges(badge_type);
CREATE INDEX IF NOT EXISTS idx_badges_location_date ON badges(location_id, (earned_at::DATE));

-- Track streak data for users
CREATE TABLE IF NOT EXISTS user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_perfect_date DATE,
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(location_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_streaks_lookup ON user_streaks(location_id, user_id);
