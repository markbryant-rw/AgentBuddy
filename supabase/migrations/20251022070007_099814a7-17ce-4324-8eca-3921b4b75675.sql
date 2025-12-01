-- Update handle_new_user to support agency signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  signup_type TEXT;
  team_code_input TEXT;
  team_name_input TEXT;
  agency_slug_input TEXT;
  new_team_id UUID;
  new_agency_id UUID;
  target_team_id UUID;
  target_agency_id UUID;
  invitation_role app_role;
  invitation_id UUID;
  invitation_team_id UUID;
  uses_fy BOOLEAN;
  fy_start INTEGER;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  
  -- Check for pending invitation
  SELECT role, id, team_id INTO invitation_role, invitation_id, invitation_team_id
  FROM public.pending_invitations
  WHERE email = NEW.email AND NOT used AND expires_at > now()
  LIMIT 1;
  
  IF invitation_id IS NOT NULL THEN
    -- Handle invitation signup
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, invitation_role);
    INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, invitation_team_id);
    UPDATE public.pending_invitations SET used = true WHERE id = invitation_id;
  ELSE
    signup_type := NEW.raw_user_meta_data->>'signup_type';
    
    CASE signup_type
      WHEN 'joining' THEN
        -- Join existing team
        team_code_input := NEW.raw_user_meta_data->>'team_code';
        SELECT id INTO target_team_id FROM public.teams WHERE teams.team_code = team_code_input;
        
        IF target_team_id IS NOT NULL THEN
          INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member');
          INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, target_team_id);
        ELSE
          RAISE EXCEPTION 'Invalid team code';
        END IF;
        
      WHEN 'joining-agency' THEN
        -- Join existing agency (create personal team within agency)
        agency_slug_input := NEW.raw_user_meta_data->>'agency_slug';
        team_name_input := COALESCE(NEW.raw_user_meta_data->>'team_name', 'My Team');
        
        SELECT id INTO target_agency_id FROM public.agencies WHERE agencies.slug = agency_slug_input;
        
        IF target_agency_id IS NOT NULL THEN
          -- Create team within agency
          INSERT INTO public.teams (name, created_by, team_code, agency_id)
          VALUES (team_name_input, NEW.id, upper(substring(gen_random_uuid()::text, 1, 8)), target_agency_id)
          RETURNING id INTO new_team_id;
          
          INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
          INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, new_team_id);
        ELSE
          RAISE EXCEPTION 'Invalid agency code';
        END IF;
        
      WHEN 'starting-agency' THEN
        -- Start new agency
        agency_slug_input := NEW.raw_user_meta_data->>'agency_slug';
        team_name_input := COALESCE(NEW.raw_user_meta_data->>'team_name', 'My Agency');
        uses_fy := COALESCE((NEW.raw_user_meta_data->>'uses_financial_year')::BOOLEAN, false);
        fy_start := COALESCE((NEW.raw_user_meta_data->>'fy_start_month')::INTEGER, 7);
        
        -- Create agency
        INSERT INTO public.agencies (name, slug, created_by)
        VALUES (team_name_input, agency_slug_input, NEW.id)
        RETURNING id INTO new_agency_id;
        
        -- Create first team in agency
        INSERT INTO public.teams (name, created_by, team_code, agency_id, uses_financial_year, financial_year_start_month)
        VALUES (team_name_input, NEW.id, upper(substring(gen_random_uuid()::text, 1, 8)), new_agency_id, uses_fy, fy_start)
        RETURNING id INTO new_team_id;
        
        -- Make user super_admin
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
        INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, new_team_id);
        
      WHEN 'starting', 'individual' THEN
        -- Start team or individual
        team_name_input := COALESCE(NEW.raw_user_meta_data->>'team_name', 'My Team');
        uses_fy := COALESCE((NEW.raw_user_meta_data->>'uses_financial_year')::BOOLEAN, false);
        fy_start := COALESCE((NEW.raw_user_meta_data->>'fy_start_month')::INTEGER, 7);
        
        -- Get Independent Agents agency
        SELECT id INTO target_agency_id FROM public.agencies WHERE slug = 'independent-agents';
        
        INSERT INTO public.teams (name, created_by, team_code, agency_id, uses_financial_year, financial_year_start_month)
        VALUES (team_name_input, NEW.id, upper(substring(gen_random_uuid()::text, 1, 8)), target_agency_id, uses_fy, fy_start)
        RETURNING id INTO new_team_id;
        
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
        INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, new_team_id);
        
      ELSE
        -- Default case
        SELECT id INTO target_agency_id FROM public.agencies WHERE slug = 'independent-agents';
        
        INSERT INTO public.teams (name, created_by, team_code, agency_id)
        VALUES ('My Team', NEW.id, upper(substring(gen_random_uuid()::text, 1, 8)), target_agency_id)
        RETURNING id INTO new_team_id;
        
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
        INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, new_team_id);
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$;