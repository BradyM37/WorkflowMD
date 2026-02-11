-- Link oauth_tokens to users table and add subscription tracking fields
ALTER TABLE oauth_tokens 
ADD COLUMN IF NOT EXISTS user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS plan_type VARCHAR(50) DEFAULT 'free',
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id ON oauth_tokens(user_id);

-- Add comment for documentation
COMMENT ON COLUMN oauth_tokens.user_id IS 'Links GHL OAuth token to a user account';
COMMENT ON COLUMN oauth_tokens.plan_type IS 'Subscription plan: free, pro, enterprise';
