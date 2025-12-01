-- Drop existing outcome constraint
ALTER TABLE public.logged_appraisals 
DROP CONSTRAINT IF EXISTS logged_appraisals_outcome_check;

-- Add stage column
ALTER TABLE public.logged_appraisals 
ADD COLUMN IF NOT EXISTS stage TEXT;

-- Migrate existing data to new format
UPDATE public.logged_appraisals
SET 
  stage = CASE 
    WHEN status IN ('lap', 'LAP', 'live', 'Live') THEN 'LAP'
    ELSE 'MAP'
  END,
  outcome = CASE 
    WHEN outcome = 'won' OR status IN ('converted', 'Converted', 'won', 'WON') THEN 'WON'
    WHEN outcome = 'lost' OR status IN ('lost', 'Lost', 'LOST', 'archived', 'Archived') THEN 'LOST'
    ELSE 'In Progress'
  END;

-- Set defaults
ALTER TABLE public.logged_appraisals 
ALTER COLUMN stage SET DEFAULT 'MAP',
ALTER COLUMN outcome SET DEFAULT 'In Progress';

-- Add new constraints
ALTER TABLE public.logged_appraisals 
ADD CONSTRAINT logged_appraisals_stage_check CHECK (stage IN ('MAP', 'LAP')),
ADD CONSTRAINT logged_appraisals_outcome_check CHECK (outcome IN ('In Progress', 'WON', 'LOST'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_logged_appraisals_stage ON public.logged_appraisals(stage);
CREATE INDEX IF NOT EXISTS idx_logged_appraisals_outcome ON public.logged_appraisals(outcome);