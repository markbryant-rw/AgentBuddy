-- Update handle_new_user function to prevent duplicate team member insertions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  invited_team_id uuid;
  invited_team_name text;
  personal_team_id uuid;
  personal_team_name text;
  target_team_id uuid;
  joining_code text;
  joining_team_id uuid;
  joining_team_name text;
  joining_agency_id uuid;
  starting_agency_id uuid;
  starting_agency_name text;
  starting_team_name text;
  discount_access_type text;
  discount_code_value text;
BEGIN
  -- Set default personal team name
  personal_team_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '''s Team';

  -- Check for invitation
  SELECT team_id, team_name INTO invited_team_id, invited_team_name
  FROM public.pending_invitations
  WHERE email = NEW.email AND status = 'pending'
  LIMIT 1;

  -- Check for team join code
  joining_code := NEW.raw_user_meta_data->>'team_join_code';
  IF joining_code IS NOT NULL THEN
    SELECT id, name INTO joining_team_id, joining_team_name
    FROM public.teams
    WHERE invite_code = joining_code;
  END IF;

  -- Check for agency join
  joining_agency_id := (NEW.raw_user_meta_data->>'agency_id')::uuid;
  starting_agency_id := (NEW.raw_user_meta_data->>'starting_agency_id')::uuid;

  IF invited_team_id IS NOT NULL THEN
    -- User was invited to a team
    personal_team_name := invited_team_name || ' - ' || COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
    
    INSERT INTO public.teams (name, created_by) VALUES (personal_team_name, NEW.id) RETURNING id INTO personal_team_id;
    INSERT INTO public.team_members (user_id, team_id) 
    VALUES (NEW.id, personal_team_id)
    ON CONFLICT (user_id, team_id) DO NOTHING;
    
    INSERT INTO public.team_members (user_id, team_id) 
    VALUES (NEW.id, invited_team_id)
    ON CONFLICT (user_id, team_id) DO NOTHING;
    
    UPDATE public.pending_invitations SET status = 'accepted' WHERE email = NEW.email AND team_id = invited_team_id;

  ELSIF joining_team_id IS NOT NULL THEN
    -- User is joining via team code
    starting_team_name := NEW.raw_user_meta_data->>'team_name';
    
    IF starting_team_name IS NOT NULL AND starting_team_name != '' THEN
      -- Create their own team if they specified one
      INSERT INTO public.teams (name, created_by) VALUES (starting_team_name, NEW.id) RETURNING id INTO personal_team_id;
    ELSE
      -- Use default personal team name
      INSERT INTO public.teams (name, created_by) VALUES (personal_team_name, NEW.id) RETURNING id INTO personal_team_id;
    END IF;
    
    INSERT INTO public.team_members (user_id, team_id) 
    VALUES (NEW.id, personal_team_id)
    ON CONFLICT (user_id, team_id) DO NOTHING;
    
    -- Add to the team they're joining
    INSERT INTO public.team_members (user_id, team_id) 
    VALUES (NEW.id, joining_team_id)
    ON CONFLICT (user_id, team_id) DO NOTHING;

  ELSIF joining_agency_id IS NOT NULL THEN
    -- User is joining an existing agency
    starting_team_name := NEW.raw_user_meta_data->>'team_name';
    
    IF starting_team_name IS NOT NULL AND starting_team_name != '' THEN
      INSERT INTO public.teams (name, created_by, agency_id) 
      VALUES (starting_team_name, NEW.id, joining_agency_id) RETURNING id INTO personal_team_id;
    ELSE
      INSERT INTO public.teams (name, created_by, agency_id) 
      VALUES (personal_team_name, NEW.id, joining_agency_id) RETURNING id INTO personal_team_id;
    END IF;
    
    INSERT INTO public.team_members (user_id, team_id) 
    VALUES (NEW.id, personal_team_id)
    ON CONFLICT (user_id, team_id) DO NOTHING;

  ELSIF starting_agency_id IS NOT NULL THEN
    -- User is starting a new agency
    starting_agency_name := NEW.raw_user_meta_data->>'agency_name';
    starting_team_name := NEW.raw_user_meta_data->>'team_name';
    
    IF starting_agency_name IS NOT NULL AND starting_agency_name != '' THEN
      IF starting_team_name IS NOT NULL AND starting_team_name != '' THEN
        INSERT INTO public.teams (name, created_by, agency_id) 
        VALUES (starting_team_name, NEW.id, starting_agency_id) RETURNING id INTO personal_team_id;
      ELSE
        INSERT INTO public.teams (name, created_by, agency_id) 
        VALUES (personal_team_name, NEW.id, starting_agency_id) RETURNING id INTO personal_team_id;
      END IF;
    ELSE
      INSERT INTO public.teams (name, created_by) VALUES (personal_team_name, NEW.id) RETURNING id INTO personal_team_id;
    END IF;
    
    INSERT INTO public.team_members (user_id, team_id) 
    VALUES (NEW.id, personal_team_id)
    ON CONFLICT (user_id, team_id) DO NOTHING;

  ELSE
    -- Default: create personal team
    INSERT INTO public.teams (name, created_by) VALUES (personal_team_name, NEW.id) RETURNING id INTO personal_team_id;
    INSERT INTO public.team_members (user_id, team_id) 
    VALUES (NEW.id, personal_team_id)
    ON CONFLICT (user_id, team_id) DO NOTHING;
  END IF;

  -- Handle discount code if provided
  discount_code_value := NEW.raw_user_meta_data->>'discount_code';
  IF discount_code_value IS NOT NULL THEN
    SELECT access_type INTO discount_access_type
    FROM public.discount_codes
    WHERE code = discount_code_value AND active = true
    AND (expires_at IS NULL OR expires_at > now());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;