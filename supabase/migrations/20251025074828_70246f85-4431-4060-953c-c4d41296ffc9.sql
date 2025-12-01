-- Fix existing users without teams
DO $$
DECLARE
  user_record RECORD;
  new_team_id UUID;
  agency_id_val UUID;
BEGIN
  -- Get Independent Agents agency
  SELECT id INTO agency_id_val FROM public.agencies WHERE slug = 'independent-agents';
  
  -- Find all users without teams
  FOR user_record IN 
    SELECT p.id, p.full_name, p.email 
    FROM public.profiles p
    LEFT JOIN public.team_members tm ON p.id = tm.user_id
    WHERE tm.user_id IS NULL
  LOOP
    -- Create personal team for this user
    INSERT INTO public.teams (name, created_by, team_code, agency_id)
    VALUES (
      COALESCE(user_record.full_name, user_record.email, 'My Team'),
      user_record.id,
      upper(substring(gen_random_uuid()::text, 1, 8)),
      agency_id_val
    )
    RETURNING id INTO new_team_id;
    
    -- Add user as team member
    INSERT INTO public.team_members (user_id, team_id)
    VALUES (user_record.id, new_team_id);
    
    -- Ensure they have admin role on their personal team
    INSERT INTO public.user_roles (user_id, role)
    VALUES (user_record.id, 'admin')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Update handle_new_user function to ALWAYS create personal teams
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  signup_type TEXT;
  team_code_input TEXT;
  team_name_input TEXT;
  agency_slug_input TEXT;
  agency_id_input TEXT;
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
  
  -- Get Independent Agents agency for personal teams
  SELECT id INTO target_agency_id FROM public.agencies WHERE slug = 'independent-agents';
  
  -- Check for pending invitation
  SELECT role, id, team_id INTO invitation_role, invitation_id, invitation_team_id
  FROM public.pending_invitations
  WHERE email = NEW.email AND NOT used AND expires_at > now()
  LIMIT 1;
  
  IF invitation_id IS NOT NULL THEN
    -- Handle invitation signup - ALWAYS create personal team first
    team_name_input := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'My Team');
    uses_fy := COALESCE((NEW.raw_user_meta_data->>'uses_financial_year')::BOOLEAN, false);
    fy_start := COALESCE((NEW.raw_user_meta_data->>'fy_start_month')::INTEGER, 7);
    
    -- Create personal team
    INSERT INTO public.teams (name, created_by, team_code, agency_id, uses_financial_year, financial_year_start_month)
    VALUES (team_name_input, NEW.id, upper(substring(gen_random_uuid()::text, 1, 8)), target_agency_id, uses_fy, fy_start)
    RETURNING id INTO new_team_id;
    
    -- Add user to their personal team
    INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, new_team_id);
    
    -- Add user to invited team as well
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, invitation_role);
    INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, invitation_team_id);
    UPDATE public.pending_invitations SET used = true WHERE id = invitation_id;
  ELSE
    signup_type := NEW.raw_user_meta_data->>'signup_type';
    team_name_input := COALESCE(NEW.raw_user_meta_data->>'team_name', NEW.raw_user_meta_data->>'full_name', NEW.email, 'My Team');
    uses_fy := COALESCE((NEW.raw_user_meta_data->>'uses_financial_year')::BOOLEAN, false);
    fy_start := COALESCE((NEW.raw_user_meta_data->>'fy_start_month')::INTEGER, 7);
    
    CASE signup_type
      WHEN 'joining' THEN
        -- Join existing team - create personal team first, then add to target team
        INSERT INTO public.teams (name, created_by, team_code, agency_id, uses_financial_year, financial_year_start_month)
        VALUES (team_name_input, NEW.id, upper(substring(gen_random_uuid()::text, 1, 8)), target_agency_id, uses_fy, fy_start)
        RETURNING id INTO new_team_id;
        
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
        INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, new_team_id);
        
        -- Now add to target team
        team_code_input := NEW.raw_user_meta_data->>'team_code';
        SELECT id INTO target_team_id FROM public.teams WHERE teams.team_code = team_code_input;
        
        IF target_team_id IS NOT NULL THEN
          INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, target_team_id);
        END IF;
        
      WHEN 'joining-agency' THEN
        -- Join agency with pending approval - create personal team
        agency_id_input := NEW.raw_user_meta_data->>'requested_agency_id';
        
        INSERT INTO public.teams (name, created_by, team_code, agency_id, uses_financial_year, financial_year_start_month)
        VALUES (team_name_input, NEW.id, upper(substring(gen_random_uuid()::text, 1, 8)), target_agency_id, uses_fy, fy_start)
        RETURNING id INTO new_team_id;
        
        -- Create pending agency request
        INSERT INTO public.pending_agency_requests (user_id, team_id, requested_agency_id)
        VALUES (NEW.id, new_team_id, agency_id_input::UUID);
        
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
        INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, new_team_id);
        
      WHEN 'starting-agency' THEN
        -- Start new agency - create agency and personal team
        agency_slug_input := NEW.raw_user_meta_data->>'agency_slug';
        
        INSERT INTO public.agencies (name, slug, created_by)
        VALUES (team_name_input, agency_slug_input, NEW.id)
        RETURNING id INTO new_agency_id;
        
        INSERT INTO public.teams (name, created_by, team_code, agency_id, uses_financial_year, financial_year_start_month)
        VALUES (team_name_input, NEW.id, upper(substring(gen_random_uuid()::text, 1, 8)), new_agency_id, uses_fy, fy_start)
        RETURNING id INTO new_team_id;
        
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
        INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, new_team_id);
        
      ELSE
        -- Default: Always create personal team
        INSERT INTO public.teams (name, created_by, team_code, agency_id, uses_financial_year, financial_year_start_month)
        VALUES (team_name_input, NEW.id, upper(substring(gen_random_uuid()::text, 1, 8)), target_agency_id, uses_fy, fy_start)
        RETURNING id INTO new_team_id;
        
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
        INSERT INTO public.team_members (user_id, team_id) VALUES (NEW.id, new_team_id);
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$function$;