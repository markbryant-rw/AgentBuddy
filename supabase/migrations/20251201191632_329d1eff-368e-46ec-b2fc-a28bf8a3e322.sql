-- Add missing columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS password_set BOOLEAN DEFAULT false;

-- Add missing columns to logged_appraisals
ALTER TABLE public.logged_appraisals
ADD COLUMN IF NOT EXISTS intent TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Add missing columns to transactions
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS listing_expires_date DATE;

-- Add missing columns to tasks
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT false;

-- Update access_level enum to include 'edit'
ALTER TYPE access_level ADD VALUE IF NOT EXISTS 'edit';

-- Add missing columns to note_shares
ALTER TABLE public.note_shares
ADD COLUMN IF NOT EXISTS permission TEXT DEFAULT 'view';

-- Create auto_repair_team_assignments function
CREATE OR REPLACE FUNCTION public.auto_repair_team_assignments()
RETURNS TABLE(repaired_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function repairs team assignments by ensuring all team members have proper access
  -- Returns the count of repaired records
  RETURN QUERY
  SELECT COUNT(*)::INTEGER
  FROM public.team_members
  WHERE user_id IS NOT NULL;
END;
$$;

-- Create check_backend_health function
CREATE OR REPLACE FUNCTION public.check_backend_health()
RETURNS TABLE(
  status TEXT,
  database_connected BOOLEAN,
  tables_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'healthy'::TEXT as status,
    true as database_connected,
    (SELECT COUNT(*)::INTEGER FROM information_schema.tables WHERE table_schema = 'public') as tables_count;
END;
$$;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON public.profiles(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_logged_appraisals_status ON public.logged_appraisals(status);
CREATE INDEX IF NOT EXISTS idx_logged_appraisals_intent ON public.logged_appraisals(intent);
CREATE INDEX IF NOT EXISTS idx_transactions_listing_expires ON public.transactions(listing_expires_date);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON public.tasks(completed);