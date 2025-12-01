-- Phase 1: User-First Model Database Migration
-- This transforms the system from "every user is a team" to "users are primary, teams are optional"

-- 1.1 Update profiles table to make users the primary entity
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_type text DEFAULT 'agent' CHECK (user_type IN ('agent', 'associate', 'va', 'admin_staff'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS primary_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS employs uuid[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reports_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS uses_financial_year boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fy_start_month integer DEFAULT 7;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_primary_team ON public.profiles(primary_team_id);
CREATE INDEX IF NOT EXISTS idx_profiles_reports_to ON public.profiles(reports_to);

-- 1.2 Update teams table to support optional collaboration
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS is_auto_created boolean DEFAULT false;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS team_type text DEFAULT 'standard' CHECK (team_type IN ('standard', 'auto_solo', 'department'));

-- 1.3 Update team_members table with relationship metadata
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS is_primary_team boolean DEFAULT false;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS member_type text DEFAULT 'agent' CHECK (member_type IN ('agent', 'associate', 'va', 'admin_staff'));

-- 1.4 Create pending_office_approvals table
CREATE TABLE IF NOT EXISTS public.pending_office_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  office_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at timestamp with time zone DEFAULT now(),
  processed_at timestamp with time zone,
  processed_by uuid REFERENCES auth.users(id),
  UNIQUE(user_id, office_id)
);

ALTER TABLE public.pending_office_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own office requests"
  ON public.pending_office_approvals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Platform admins can manage office requests"
  ON public.pending_office_approvals FOR ALL
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- 1.5 CRITICAL: Rewrite handle_new_user() function for user-first model
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  personal_team_id uuid;
  personal_team_name text;
  invited_team_id uuid;
  joining_code text;
  joining_team_id uuid;
  user_status text;
  requested_agency uuid;
BEGIN
  -- Extract metadata
  personal_team_name := NEW.raw_user_meta_data->>'team_name';
  joining_code := NEW.raw_user_meta_data->>'team_join_code';
  user_status := COALESCE(NEW.raw_user_meta_data->>'user_status', 'solo_agent');
  requested_agency := (NEW.raw_user_meta_data->>'requested_agency_id')::uuid;

  -- Check for pending invitation (email-based invite)
  SELECT pi.team_id INTO invited_team_id
  FROM public.pending_invitations pi
  WHERE pi.email = NEW.email AND pi.status = 'pending'
  LIMIT 1;

  -- Check for team join code
  IF joining_code IS NOT NULL THEN
    SELECT id INTO joining_team_id
    FROM public.teams
    WHERE team_code = joining_code;
  END IF;

  -- Handle different signup scenarios
  IF invited_team_id IS NOT NULL THEN
    -- Scenario 1: User was invited via email
    INSERT INTO public.team_members (user_id, team_id, is_primary_team)
    VALUES (NEW.id, invited_team_id, true)
    ON CONFLICT (user_id, team_id) DO NOTHING;

    -- Update profile with primary team
    UPDATE public.profiles
    SET primary_team_id = invited_team_id
    WHERE id = NEW.id;

    -- Mark invitation as accepted
    UPDATE public.pending_invitations
    SET status = 'accepted'
    WHERE email = NEW.email AND team_id = invited_team_id;

  ELSIF joining_team_id IS NOT NULL THEN
    -- Scenario 2: User joined via team code
    INSERT INTO public.team_members (user_id, team_id, is_primary_team)
    VALUES (NEW.id, joining_team_id, true)
    ON CONFLICT (user_id, team_id) DO NOTHING;

    -- Update profile with primary team
    UPDATE public.profiles
    SET primary_team_id = joining_team_id
    WHERE id = NEW.id;

  ELSIF user_status = 'creating_team' THEN
    -- Scenario 3: User is creating a new team
    INSERT INTO public.teams (
      name,
      created_by,
      agency_id,
      is_auto_created,
      team_type
    ) VALUES (
      COALESCE(personal_team_name, (NEW.raw_user_meta_data->>'full_name') || '''s Team'),
      NEW.id,
      requested_agency,
      false,
      'standard'
    ) RETURNING id INTO personal_team_id;

    -- Update profile with primary team
    UPDATE public.profiles
    SET primary_team_id = personal_team_id
    WHERE id = NEW.id;

    -- Add creator as team member and admin
    INSERT INTO public.team_members (user_id, team_id, is_primary_team)
    VALUES (NEW.id, personal_team_id, true);

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

  ELSE
    -- Scenario 4: Solo agent (default)
    -- No team created, just a profile
    -- User can create/join teams later from settings
    NULL;
  END IF;

  -- Handle office association (if requested)
  IF requested_agency IS NOT NULL THEN
    INSERT INTO public.pending_office_approvals (
      user_id,
      office_id,
      status
    ) VALUES (
      NEW.id,
      requested_agency,
      'pending'
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Update profile financial year settings
  UPDATE public.profiles
  SET 
    uses_financial_year = COALESCE((NEW.raw_user_meta_data->>'uses_financial_year')::boolean, false),
    fy_start_month = COALESCE((NEW.raw_user_meta_data->>'fy_start_month')::integer, 7)
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- 1.6 Data migration for existing users
UPDATE public.profiles p
SET primary_team_id = (
  SELECT tm.team_id 
  FROM public.team_members tm
  WHERE tm.user_id = p.id
  LIMIT 1
)
WHERE primary_team_id IS NULL;

-- Mark existing auto-created teams
UPDATE public.teams t
SET is_auto_created = true,
    team_type = 'auto_solo'
WHERE id IN (
  SELECT t.id
  FROM public.teams t
  JOIN public.team_members tm ON tm.team_id = t.id
  GROUP BY t.id
  HAVING COUNT(tm.user_id) = 1
  AND t.name LIKE '%''s Team'
);

-- Mark existing team memberships as primary
UPDATE public.team_members tm
SET is_primary_team = true
WHERE (user_id, team_id) IN (
  SELECT p.id, p.primary_team_id
  FROM public.profiles p
  WHERE p.primary_team_id IS NOT NULL
);

-- 1.7 Update RLS policies to support optional teams
DROP POLICY IF EXISTS "Users can view friend and public stats" ON public.kpi_entries;

CREATE POLICY "Users can view friend and public stats" ON public.kpi_entries
FOR SELECT USING (
  auth.uid() = user_id
  OR (
    -- Team members can see each other (if they have teams)
    EXISTS (
      SELECT 1 FROM profiles p1
      JOIN profiles p2 ON p2.primary_team_id = p1.primary_team_id
      WHERE p1.id = auth.uid() 
      AND p2.id = kpi_entries.user_id
      AND p1.primary_team_id IS NOT NULL
    )
  )
  OR (
    -- Friends can see each other
    EXISTS (
      SELECT 1 FROM friend_connections fc
      WHERE fc.accepted = true
      AND ((fc.user_id = auth.uid() AND fc.friend_id = kpi_entries.user_id)
        OR (fc.friend_id = auth.uid() AND fc.user_id = kpi_entries.user_id))
    )
  )
  OR (
    -- Public leaderboard participation
    EXISTS (
      SELECT 1 FROM user_preferences up
      WHERE up.user_id = kpi_entries.user_id
      AND up.leaderboard_participation = true
    )
    OR NOT EXISTS (
      SELECT 1 FROM user_preferences up
      WHERE up.user_id = kpi_entries.user_id
    )
  )
);