-- Bootstrap Mark Bryant's complete setup
-- This creates the office, team, and assigns all necessary roles

DO $$
DECLARE
  v_user_id uuid := 'be8de55d-ae51-4c4a-9b14-9fc06f67334d'; -- mark.bryant@raywhite.com (correct ID)
  v_agency_id uuid;
  v_team_id uuid;
  v_team_code text;
BEGIN
  -- Step 1: Create Ray White Austar agency
  INSERT INTO public.agencies (
    name,
    slug,
    brand,
    brand_color,
    created_by,
    is_archived
  ) VALUES (
    'Ray White Austar',
    'ray-white-austar',
    'Ray White',
    '#fee600',
    v_user_id,
    false
  )
  RETURNING id INTO v_agency_id;

  -- Step 2: Generate team code and create Mark & Co. team
  v_team_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
  
  INSERT INTO public.teams (
    name,
    agency_id,
    team_code,
    is_archived,
    is_personal_team,
    uses_financial_year,
    financial_year_start_month
  ) VALUES (
    'Mark & Co.',
    v_agency_id,
    v_team_code,
    false,
    false,
    true,
    7
  )
  RETURNING id INTO v_team_id;

  -- Step 3: Add Mark as team member with admin access
  INSERT INTO public.team_members (
    team_id,
    user_id,
    access_level
  ) VALUES (
    v_team_id,
    v_user_id,
    'admin'
  );

  -- Step 4: Update Mark's profile
  UPDATE public.profiles
  SET
    office_id = v_agency_id,
    primary_team_id = v_team_id,
    active_role = 'platform_admin',
    updated_at = NOW()
  WHERE id = v_user_id;

  -- Step 5: Assign additional roles (salesperson, team_leader, office_manager)
  INSERT INTO public.user_roles (user_id, role, granted_by)
  VALUES 
    (v_user_id, 'salesperson', v_user_id),
    (v_user_id, 'team_leader', v_user_id),
    (v_user_id, 'office_manager', v_user_id)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Step 6: Create office manager assignment
  INSERT INTO public.office_manager_assignments (
    user_id,
    agency_id,
    assigned_by
  ) VALUES (
    v_user_id,
    v_agency_id,
    v_user_id
  );

  RAISE NOTICE 'Successfully created Ray White Austar (%), Mark & Co. team (%), and assigned all roles', v_agency_id, v_team_id;
END $$;