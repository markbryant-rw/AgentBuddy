-- Add outcome column to listings_pipeline
ALTER TABLE public.listings_pipeline 
ADD COLUMN outcome text DEFAULT 'in_progress' CHECK (outcome IN ('in_progress', 'won', 'lost'));

-- Add comment
COMMENT ON COLUMN public.listings_pipeline.outcome IS 'Track the final outcome of the opportunity: in_progress, won, or lost';

-- Migrate existing data: move won/lost from stage to outcome
UPDATE public.listings_pipeline 
SET outcome = 'won', stage = 'lap'
WHERE stage = 'won';

UPDATE public.listings_pipeline 
SET outcome = 'lost', stage = 'lap'
WHERE stage = 'lost';

-- Add outcome column to logged_appraisals
ALTER TABLE public.logged_appraisals 
ADD COLUMN outcome text DEFAULT 'in_progress' CHECK (outcome IN ('in_progress', 'won', 'lost'));

COMMENT ON COLUMN public.logged_appraisals.outcome IS 'Track the final outcome of the appraisal: in_progress, won, or lost';

-- Migrate existing appraisal data
UPDATE public.logged_appraisals 
SET outcome = 'won'
WHERE status = 'won';

UPDATE public.logged_appraisals 
SET outcome = 'lost'
WHERE status = 'lost';