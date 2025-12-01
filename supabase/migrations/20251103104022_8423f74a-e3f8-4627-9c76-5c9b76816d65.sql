-- Add geocoding fields to listings_pipeline table
ALTER TABLE listings_pipeline
ADD COLUMN IF NOT EXISTS latitude numeric,
ADD COLUMN IF NOT EXISTS longitude numeric,
ADD COLUMN IF NOT EXISTS geocoded_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS geocode_error text;