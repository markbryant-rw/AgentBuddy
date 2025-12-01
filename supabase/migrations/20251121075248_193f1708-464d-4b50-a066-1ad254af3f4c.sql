-- Add lead_source column to listings_pipeline (opportunities)
ALTER TABLE listings_pipeline 
ADD COLUMN lead_source TEXT;

-- Add index for better query performance
CREATE INDEX idx_listings_pipeline_lead_source ON listings_pipeline(lead_source);