-- Replace the handle_new_user function to CREATE profiles first
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  personal_team_id uuid;
  personal_team_name text;
  invited_team_id uuid;
  invited_team_name text;
  joining_code text;
  joining_team_id uuid;
  user_status text;
  requested_agency uuid;
  generated_invite_code text;
BEGIN
  -- Generate unique invite code
  generated_invite_code := UPPER(
    SUBSTRING(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email) FROM 1 FOR 2) || 
    '-' || 
    SUBSTRING(gen_random_uuid()::text FROM 1 FOR 8)
  );

  -- **CREATE PROFILE FIRST** (this was missing!)
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    invite_code,
    user_type,
    is_active
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    generated_invite_code,
    'agent',
    true
  );

  -- Extract metadata for team logic
  personal_team_name := NEW.raw_user_meta_data->>'team_name';
  joining_code := NEW.raw_user_meta_data->>'team_join_code';
  user_status := COALESCE(NEW.raw_user_meta_data->>'user_status', 'solo_agent');
  requested_agency := (NEW.raw_user_meta_data->>'requested_agency_id')::uuid;

  -- Check for pending invitation (email-based invite)
  SELECT pi.team_id, t.name INTO invited_team_id, invited_team_name
  FROM public.pending_invitations pi
  JOIN public.teams t ON t.id = pi.team_id
  WHERE pi.email = NEW.email AND pi.used = false
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
    SET used = true
    WHERE email = NEW.email AND team_id = invited_team_id;

  ELSIF joining_team_id IS NOT NULL THEN
    -- Scenario 2: User joined via team code
    UPDATE public.profiles
    SET primary_team_id = joining_team_id
    WHERE id = NEW.id;

    INSERT INTO public.team_members (user_id, team_id, is_primary_team)
    VALUES (NEW.id, joining_team_id, true)
    ON CONFLICT (user_id, team_id) DO NOTHING;

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
    -- Profile already created, no team needed
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

  RETURN NEW;
END;
$$;