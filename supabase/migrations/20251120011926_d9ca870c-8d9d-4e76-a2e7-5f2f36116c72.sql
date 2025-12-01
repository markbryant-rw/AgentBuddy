-- Fix stage/outcome field mismatch in listings_pipeline
-- Move 'won' and 'lost' from stage to outcome field

-- First, update records where stage is 'won' to use outcome instead
UPDATE listings_pipeline
SET 
  outcome = 'won',
  stage = NULL
WHERE stage = 'won';

-- Update records where stage is 'lost' to use outcome instead
UPDATE listings_pipeline
SET 
  outcome = 'lost',
  stage = NULL
WHERE stage = 'lost';

-- Set outcome to 'in_progress' for any records where outcome is null
UPDATE listings_pipeline
SET outcome = 'in_progress'
WHERE outcome IS NULL;

-- Add a comment to clarify field usage
COMMENT ON COLUMN listings_pipeline.stage IS 'Pipeline progression stage: call, vap, map, lap (NULL for won/lost)';
COMMENT ON COLUMN listings_pipeline.outcome IS 'Final outcome: in_progress, won, lost';