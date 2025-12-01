-- Fix non-standard team codes and add regenerate function
-- Update any team codes that don't match the expected 8-character alphanumeric format
UPDATE teams
SET team_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT || NOW()::TEXT) FROM 1 FOR 8))
WHERE team_code IS NULL 
   OR LENGTH(team_code) != 8 
   OR team_code ~ '[^A-Z0-9]';

-- Create a function to regenerate a team code
CREATE OR REPLACE FUNCTION regenerate_team_code(p_team_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_code TEXT;
BEGIN
  -- Generate a new 8-character alphanumeric code
  v_new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || p_team_id::TEXT || NOW()::TEXT) FROM 1 FOR 8));
  
  -- Update the team with the new code
  UPDATE teams
  SET team_code = v_new_code
  WHERE id = p_team_id;
  
  RETURN v_new_code;
END;
$$;