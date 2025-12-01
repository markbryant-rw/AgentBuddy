-- Ensure profiles table has office_id for office management
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'office_id'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN office_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_profiles_office_id ON public.profiles(office_id);
  END IF;
END $$;

-- Ensure teams table has office_id for office-team relationship
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'teams' 
    AND column_name = 'agency_id'
  ) THEN
    ALTER TABLE public.teams 
    ADD COLUMN agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_teams_agency_id ON public.teams(agency_id);
  END IF;
END $$;

-- Update team_members table to ensure proper structure
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'team_members' 
    AND column_name = 'joined_at'
  ) THEN
    ALTER TABLE public.team_members 
    ADD COLUMN joined_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- Create function to automatically set office_id when user joins a team
CREATE OR REPLACE FUNCTION public.sync_user_office_from_team()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a user joins a team, update their office_id based on the team's agency_id
  UPDATE public.profiles
  SET office_id = (
    SELECT agency_id 
    FROM public.teams 
    WHERE id = NEW.team_id
  )
  WHERE id = NEW.user_id
  AND office_id IS NULL; -- Only set if not already set
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic office assignment
DROP TRIGGER IF EXISTS sync_office_on_team_join ON public.team_members;
CREATE TRIGGER sync_office_on_team_join
  AFTER INSERT ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_office_from_team();

-- Add RLS policies for office-based access
CREATE POLICY "Office managers can view their office profiles"
  ON public.profiles
  FOR SELECT
  USING (
    office_id IN (
      SELECT p.office_id 
      FROM public.profiles p
      INNER JOIN public.user_roles ur ON ur.user_id = p.id
      WHERE p.id = auth.uid()
      AND ur.role = 'office_manager'
      AND ur.revoked_at IS NULL
    )
  );

-- Office managers can view teams in their office
CREATE POLICY "Office managers can view their office teams"
  ON public.teams
  FOR SELECT
  USING (
    agency_id IN (
      SELECT office_id 
      FROM public.profiles
      INNER JOIN public.user_roles ur ON ur.user_id = profiles.id
      WHERE profiles.id = auth.uid()
      AND ur.role = 'office_manager'
      AND ur.revoked_at IS NULL
    )
  );