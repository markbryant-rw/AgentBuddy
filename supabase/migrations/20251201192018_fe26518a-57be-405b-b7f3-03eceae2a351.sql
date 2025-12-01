-- Add missing columns to quarterly_reviews
ALTER TABLE public.quarterly_reviews
ADD COLUMN IF NOT EXISTS wins TEXT,
ADD COLUMN IF NOT EXISTS challenges TEXT,
ADD COLUMN IF NOT EXISTS lessons_learned TEXT,
ADD COLUMN IF NOT EXISTS action_items TEXT;

-- Add missing column to quarterly_goals
ALTER TABLE public.quarterly_goals
ADD COLUMN IF NOT EXISTS kpi_type TEXT;