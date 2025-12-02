-- Phase 1: Add missing columns for critical features

-- 1. profiles table: add presence and activity tracking
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS presence_status TEXT DEFAULT 'offline',
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT now();

-- 2. teams table: add branding and type
ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS team_type TEXT DEFAULT 'standard';

-- 3. goals table: add kpi_type for integration with kpi_entries
ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS kpi_type TEXT;

-- 4. past_sales table: add status and audit columns
ALTER TABLE public.past_sales
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'settled',
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 5. logged_appraisals table: add comprehensive tracking columns
ALTER TABLE public.logged_appraisals
ADD COLUMN IF NOT EXISTS vendor_name TEXT,
ADD COLUMN IF NOT EXISTS suburb TEXT,
ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'prospecting',
ADD COLUMN IF NOT EXISTS lead_source TEXT,
ADD COLUMN IF NOT EXISTS next_follow_up DATE,
ADD COLUMN IF NOT EXISTS last_contact DATE,
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC,
ADD COLUMN IF NOT EXISTS appraisal_range_low NUMERIC,
ADD COLUMN IF NOT EXISTS appraisal_range_high NUMERIC,
ADD COLUMN IF NOT EXISTS appraisal_method TEXT,
ADD COLUMN IF NOT EXISTS converted_date DATE,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_presence_status ON public.profiles(presence_status);
CREATE INDEX IF NOT EXISTS idx_profiles_last_active_at ON public.profiles(last_active_at);
CREATE INDEX IF NOT EXISTS idx_teams_team_type ON public.teams(team_type);
CREATE INDEX IF NOT EXISTS idx_goals_kpi_type ON public.goals(kpi_type);
CREATE INDEX IF NOT EXISTS idx_logged_appraisals_stage ON public.logged_appraisals(stage);
CREATE INDEX IF NOT EXISTS idx_logged_appraisals_team_id ON public.logged_appraisals(team_id);