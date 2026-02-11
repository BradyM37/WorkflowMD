-- Migration: White-Label Branding for Agencies
-- Enables agencies to brand reports with their own logos, colors, and company info

-- Agency branding table
CREATE TABLE IF NOT EXISTS agency_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id VARCHAR(255) NOT NULL UNIQUE,
  company_name VARCHAR(255),
  tagline VARCHAR(500),
  logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#667eea',
  secondary_color VARCHAR(7) DEFAULT '#764ba2',
  accent_color VARCHAR(7) DEFAULT '#52c41a',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Report settings table
CREATE TABLE IF NOT EXISTS report_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id VARCHAR(255) NOT NULL UNIQUE,
  include_branding BOOLEAN DEFAULT true,
  custom_footer_text TEXT,
  hide_powered_by BOOLEAN DEFAULT false,
  email_from_name VARCHAR(255),
  report_title_template VARCHAR(255) DEFAULT 'Response Time Report',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Shareable report links table
CREATE TABLE IF NOT EXISTS shared_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id VARCHAR(255) NOT NULL,
  share_token VARCHAR(64) NOT NULL UNIQUE,
  report_type VARCHAR(50) DEFAULT 'response',
  days INTEGER DEFAULT 7,
  expires_at TIMESTAMP,
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Optional: Store generated report data for faster loading
  cached_data JSONB,
  cached_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agency_branding_location ON agency_branding(location_id);
CREATE INDEX IF NOT EXISTS idx_report_settings_location ON report_settings(location_id);
CREATE INDEX IF NOT EXISTS idx_shared_reports_token ON shared_reports(share_token);
CREATE INDEX IF NOT EXISTS idx_shared_reports_location ON shared_reports(location_id);
CREATE INDEX IF NOT EXISTS idx_shared_reports_expires ON shared_reports(expires_at) WHERE expires_at IS NOT NULL;

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_agency_branding_updated_at ON agency_branding;
CREATE TRIGGER update_agency_branding_updated_at
  BEFORE UPDATE ON agency_branding
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_report_settings_updated_at ON report_settings;
CREATE TRIGGER update_report_settings_updated_at
  BEFORE UPDATE ON report_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
