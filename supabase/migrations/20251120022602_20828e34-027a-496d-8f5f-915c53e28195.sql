-- Step 1: Add is_personal_team flag to teams table
ALTER TABLE teams 
ADD COLUMN is_personal_team boolean NOT NULL DEFAULT false;

-- Add index for better query performance
CREATE INDEX idx_teams_is_personal_team ON teams(is_personal_team);

-- Add comment for documentation
COMMENT ON COLUMN teams.is_personal_team IS 'True for auto-generated personal teams (solo agents), hidden from Office Manager UI';

-- Step 2: Create function to ensure personal team exists for a user
CREATE OR REPLACE FUNCTION ensure_personal_team(
  user_id_param uuid,
  user_full_name text,
  office_id_param uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  team_id_result uuid;
  team_name_generated text;
BEGIN
  -- Check if user already has a personal team
  SELECT id INTO team_id_result
  FROM teams
  WHERE created_by = user_id_param 
    AND is_personal_team = true
    AND agency_id = office_id_param
  LIMIT 1;

  -- If no personal team exists, create one
  IF team_id_result IS NULL THEN
    team_name_generated := user_full_name || '''s Team';
    
    INSERT INTO teams (
      name,
      agency_id,
      created_by,
      is_personal_team,
      team_code,
      bio
    ) VALUES (
      team_name_generated,
      office_id_param,
      user_id_param,
      true,
      UPPER(SUBSTRING(MD5(RANDOM()::TEXT || user_id_param::TEXT || NOW()::TEXT) FROM 1 FOR 8)),
      'Personal team for ' || user_full_name
    )
    RETURNING id INTO team_id_result;
  END IF;

  RETURN team_id_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION ensure_personal_team TO authenticated;

-- Step 3: Create personal teams for existing solo agents
DO $$
DECLARE
  solo_agent RECORD;
  new_team_id uuid;
BEGIN
  FOR solo_agent IN 
    SELECT p.id, p.full_name, p.office_id, p.email
    FROM profiles p
    WHERE p.status = 'active'
      AND p.office_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM team_members tm WHERE tm.user_id = p.id
      )
  LOOP
    -- Create personal team for this solo agent
    new_team_id := ensure_personal_team(
      solo_agent.id,
      COALESCE(solo_agent.full_name, split_part(solo_agent.email, '@', 1)),
      solo_agent.office_id
    );
    
    -- Add user to their personal team
    INSERT INTO team_members (team_id, user_id, access_level)
    VALUES (new_team_id, solo_agent.id, 'admin')
    ON CONFLICT DO NOTHING;
    
    -- Set as primary team if user doesn't have one
    UPDATE profiles
    SET primary_team_id = new_team_id
    WHERE id = solo_agent.id 
      AND primary_team_id IS NULL;
    
    RAISE NOTICE 'Created personal team for solo agent: % (%)', solo_agent.full_name, solo_agent.email;
  END LOOP;
END $$;