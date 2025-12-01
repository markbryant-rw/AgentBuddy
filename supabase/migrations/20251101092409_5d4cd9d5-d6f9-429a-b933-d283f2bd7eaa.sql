-- Add geocoding columns to transactions table
ALTER TABLE transactions 
ADD COLUMN latitude DOUBLE PRECISION,
ADD COLUMN longitude DOUBLE PRECISION,
ADD COLUMN geocoded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN geocode_error TEXT;

-- Add index for spatial queries (future optimization)
CREATE INDEX idx_transactions_lat_lng ON transactions(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;