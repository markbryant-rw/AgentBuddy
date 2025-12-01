
-- Create function to generate random team code
CREATE OR REPLACE FUNCTION generate_team_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 8-character random code (uppercase alphanumeric)
    new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM teams WHERE team_code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Create trigger function to auto-generate team code if not provided
CREATE OR REPLACE FUNCTION auto_generate_team_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only generate if team_code is NULL or empty
  IF NEW.team_code IS NULL OR NEW.team_code = '' THEN
    NEW.team_code := generate_team_code();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on teams table
DROP TRIGGER IF EXISTS trigger_auto_generate_team_code ON teams;
CREATE TRIGGER trigger_auto_generate_team_code
  BEFORE INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_team_code();

COMMENT ON FUNCTION generate_team_code() IS 'Generates a unique 8-character uppercase alphanumeric team code';
COMMENT ON FUNCTION auto_generate_team_code() IS 'Trigger function that auto-generates team codes before insert if not provided';
