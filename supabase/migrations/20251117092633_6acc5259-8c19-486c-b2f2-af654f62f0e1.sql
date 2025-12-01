-- Create demo user account for testing
-- Email: user@agentbuddy.co | Password: agentbuddy

DO $$
DECLARE
  v_user_id uuid;
  v_team_id uuid;
  v_user_exists boolean;
BEGIN
  -- Check if user already exists
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'user@agentbuddy.co') INTO v_user_exists;
  
  -- Only create user if they don't exist
  IF NOT v_user_exists THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      raw_app_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'user@agentbuddy.co',
      crypt('agentbuddy', gen_salt('bf')),
      now(),
      jsonb_build_object('email', 'user@agentbuddy.co', 'full_name', 'Demo User', 'email_verified', true),
      jsonb_build_object('provider', 'email', 'providers', array['email']),
      now(),
      now(),
      '',
      '',
      ''
    );
  END IF;
  
  -- Get the user ID
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'user@agentbuddy.co';
  
  -- Get the first available team
  SELECT id INTO v_team_id FROM teams LIMIT 1;
  
  -- Assign to team if both exist
  IF v_user_id IS NOT NULL AND v_team_id IS NOT NULL THEN
    -- Check if team membership already exists
    IF NOT EXISTS(SELECT 1 FROM team_members WHERE user_id = v_user_id AND team_id = v_team_id) THEN
      -- Temporarily disable the auto friend trigger
      ALTER TABLE team_members DISABLE TRIGGER auto_friend_on_team_join;
      
      -- Insert team membership
      INSERT INTO team_members (user_id, team_id, access_level)
      VALUES (v_user_id, v_team_id, 'edit');
      
      -- Re-enable the trigger
      ALTER TABLE team_members ENABLE TRIGGER auto_friend_on_team_join;
    END IF;
    
    -- Update profile with team assignment
    UPDATE profiles
    SET primary_team_id = v_team_id
    WHERE id = v_user_id AND primary_team_id IS NULL;
  END IF;
END $$;