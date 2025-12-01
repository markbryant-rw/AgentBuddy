-- Add loss tracking columns to listings_pipeline
ALTER TABLE listings_pipeline 
ADD COLUMN IF NOT EXISTS loss_reason text,
ADD COLUMN IF NOT EXISTS lost_date timestamp with time zone;