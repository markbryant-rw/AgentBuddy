-- Remove auto-add team creator functionality
-- Office managers should explicitly add members to teams

-- Drop the trigger
DROP TRIGGER IF EXISTS auto_add_team_creator_trigger ON public.teams;
DROP TRIGGER IF EXISTS add_team_creator_as_admin ON public.teams;
DROP TRIGGER IF EXISTS on_team_created_add_admin ON public.teams;

-- Drop the function
DROP FUNCTION IF EXISTS public.auto_add_team_creator_as_admin() CASCADE;