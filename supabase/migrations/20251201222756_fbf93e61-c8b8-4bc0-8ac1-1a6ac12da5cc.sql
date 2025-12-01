-- Add missing column to tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS daily_position INTEGER;

-- Add missing column to transactions  
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;