-- Drop the status column from listings_pipeline
-- We're consolidating into a single 'stage' field with values: call, vap, map, lap, won, lost
ALTER TABLE listings_pipeline DROP COLUMN IF EXISTS status;