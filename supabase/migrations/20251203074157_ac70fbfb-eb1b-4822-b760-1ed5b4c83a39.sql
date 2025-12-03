-- Add missing geocoding columns to logged_appraisals
ALTER TABLE logged_appraisals 
ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS geocode_error TEXT;