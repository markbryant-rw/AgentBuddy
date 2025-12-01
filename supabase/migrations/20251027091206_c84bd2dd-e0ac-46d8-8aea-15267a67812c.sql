-- Update handle_new_user function to remove auto-team-creation logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  invited_team_id uuid;
  joining_team_id uuid;
  requested_agency uuid;
  generated_invite_code text;
  explicit_team_name text;
  new_team_id uuid;
BEGIN
  -- Generate unique invite code
  generated_invite_code := UPPER(
    SUBSTRING(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email) FROM 1 FOR 2) || 
    '-' || 
    SUBSTRING(gen_random_uuid()::text FROM 1 FOR 8)
  );

  -- CREATE PROFILE FIRST
  INSERT INTO public.profiles (
    id, email, full_name, invite_code, user_type, is_active
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    generated_invite_code,
    'agent',
    true
  );

  -- Extract metadata
  requested_agency := (NEW.raw_user_meta_data->>'requested_agency_id')::uuid;
  explicit_team_name := NEW.raw_user_meta_data->>'team_name';

  -- Check for email invitation
  SELECT pi.team_id INTO invited_team_id
  FROM public.pending_invitations pi
  WHERE pi.email = NEW.email AND pi.used = false
  LIMIT 1;

  -- Check for team join code
  IF NEW.raw_user_meta_data->>'team_join_code' IS NOT NULL THEN
    SELECT id INTO joining_team_id
    FROM public.teams
    WHERE team_code = NEW.raw_user_meta_data->>'team_join_code';
  END IF;

  -- Scenario 1: Invited via email
  IF invited_team_id IS NOT NULL THEN
    INSERT INTO public.team_members (user_id, team_id, is_primary_team)
    VALUES (NEW.id, invited_team_id, true)
    ON CONFLICT (user_id, team_id) DO NOTHING;

    UPDATE public.profiles SET primary_team_id = invited_team_id WHERE id = NEW.id;
    UPDATE public.pending_invitations SET used = true WHERE email = NEW.email AND team_id = invited_team_id;

  -- Scenario 2: Join via team code
  ELSIF joining_team_id IS NOT NULL THEN
    INSERT INTO public.team_members (user_id, team_id, is_primary_team)
    VALUES (NEW.id, joining_team_id, true)
    ON CONFLICT (user_id, team_id) DO NOTHING;

    UPDATE public.profiles SET primary_team_id = joining_team_id WHERE id = NEW.id;

  -- Scenario 3: EXPLICITLY creating a team (only if team_name provided)
  ELSIF explicit_team_name IS NOT NULL THEN
    INSERT INTO public.teams (name, created_by, agency_id, is_auto_created, team_type)
    VALUES (explicit_team_name, NEW.id, requested_agency, false, 'standard')
    RETURNING id INTO new_team_id;

    UPDATE public.profiles SET primary_team_id = new_team_id WHERE id = NEW.id;

    INSERT INTO public.team_members (user_id, team_id, is_primary_team)
    VALUES (NEW.id, new_team_id, true);

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

  -- Scenario 4: Solo agent (NO team created)
  ELSE
    NULL;
  END IF;

  -- Handle office association request
  IF requested_agency IS NOT NULL THEN
    INSERT INTO public.pending_office_approvals (user_id, office_id, status)
    VALUES (NEW.id, requested_agency, 'pending')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Clean up existing auto-created teams
-- Step 1: Remove team members from auto-created teams
DELETE FROM public.team_members 
WHERE team_id IN (
  SELECT id FROM public.teams WHERE is_auto_created = true
);

-- Step 2: Delete auto-created teams
DELETE FROM public.teams WHERE is_auto_created = true;

-- Step 3: Clean up profiles that lost their only team
UPDATE public.profiles 
SET primary_team_id = NULL 
WHERE primary_team_id IS NOT NULL 
  AND primary_team_id NOT IN (SELECT id FROM public.teams);