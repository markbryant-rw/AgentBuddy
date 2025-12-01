-- Add stage column to listings_pipeline table
ALTER TABLE listings_pipeline 
ADD COLUMN stage text CHECK (stage IN ('call', 'vap', 'map', 'lap', 'won', 'lost'));

-- Add index for performance on stage column
CREATE INDEX idx_listings_pipeline_stage ON listings_pipeline(stage);

-- Set default stage for existing listings
UPDATE listings_pipeline 
SET stage = 'call' 
WHERE stage IS NULL;