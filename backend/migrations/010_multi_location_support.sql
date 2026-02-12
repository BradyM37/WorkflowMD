-- Multi-location support migration
-- Allows users to manage multiple GHL locations

-- Add last_active_location_id to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_active_location_id VARCHAR(255);

-- Add location metadata to oauth_tokens (acts as ghl_connections)
ALTER TABLE oauth_tokens 
ADD COLUMN IF NOT EXISTS location_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS address TEXT;

-- Create index for location lookups
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_location_id ON oauth_tokens(location_id);
CREATE INDEX IF NOT EXISTS idx_users_last_active_location ON users(last_active_location_id);

-- Add comments for documentation
COMMENT ON COLUMN users.last_active_location_id IS 'User preferred/last active GHL location';
COMMENT ON COLUMN oauth_tokens.location_name IS 'Human-readable name of the GHL location';
COMMENT ON COLUMN oauth_tokens.address IS 'Physical address of the location if available';
