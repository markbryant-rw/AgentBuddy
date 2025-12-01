-- Add estimated_value column to logged_appraisals for simplified GCI forecasting
ALTER TABLE public.logged_appraisals 
ADD COLUMN estimated_value NUMERIC;

-- Add comment to explain the field
COMMENT ON COLUMN public.logged_appraisals.estimated_value IS 'Single estimated value for easier GCI forecasting, replaces appraisal range in UI';