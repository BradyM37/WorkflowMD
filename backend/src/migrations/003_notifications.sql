-- Notifications table for in-app notification center
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255),
  type VARCHAR(50) NOT NULL CHECK (type IN ('missed_lead', 'goal_achieved', 'badge_earned', 'report_ready')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR(500),
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_notifications_location ON notifications(location_id);
CREATE INDEX IF NOT EXISTS idx_notifications_location_read ON notifications(location_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
