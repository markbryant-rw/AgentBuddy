-- Add agent_id column to track who performed the appraisal
ALTER TABLE public.logged_appraisals 
ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES public.profiles(id);

-- Create index for faster filtering by agent
CREATE INDEX IF NOT EXISTS idx_logged_appraisals_agent_id ON public.logged_appraisals(agent_id);