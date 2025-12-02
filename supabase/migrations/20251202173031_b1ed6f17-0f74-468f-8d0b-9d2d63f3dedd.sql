-- Add missing columns to teams table
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Add missing columns to team_members table
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS contributes_to_kpis boolean DEFAULT true;

-- Add missing columns to goals table
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS set_by_admin boolean DEFAULT false;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS admin_notes text;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS period text DEFAULT 'weekly';