-- Add new KPI types for pipeline tracking
ALTER TYPE kpi_type ADD VALUE IF NOT EXISTS 'listings';
ALTER TYPE kpi_type ADD VALUE IF NOT EXISTS 'sales';

-- Create daily log tracker table for streak tracking
CREATE TABLE IF NOT EXISTS public.daily_log_tracker (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  logged_at timestamp with time zone NOT NULL DEFAULT now(),
  is_business_day boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, log_date)
);

-- Enable RLS on daily_log_tracker
ALTER TABLE public.daily_log_tracker ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_log_tracker
CREATE POLICY "Users can insert their own log tracker"
ON public.daily_log_tracker FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own log tracker"
ON public.daily_log_tracker FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_daily_log_tracker_user_date 
ON public.daily_log_tracker(user_id, log_date DESC);

-- Add logged_at timestamp to kpi_entries
ALTER TABLE public.kpi_entries 
ADD COLUMN IF NOT EXISTS logged_at timestamp with time zone;

-- Backfill existing entries with created_at
UPDATE public.kpi_entries 
SET logged_at = created_at 
WHERE logged_at IS NULL;