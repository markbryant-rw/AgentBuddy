-- Fix RLS policy on team_members to allow users to see all teammates
DROP POLICY IF EXISTS team_members_select ON team_members;

CREATE POLICY team_members_select ON team_members
FOR SELECT TO authenticated
USING (
  -- User can see their own record
  user_id = auth.uid()
  OR
  -- User can see all members of teams they belong to
  team_id IN (
    SELECT team_id 
    FROM team_members 
    WHERE user_id = auth.uid()
  )
  OR
  -- Admins can see all
  has_role(auth.uid(), 'platform_admin'::app_role)
  OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Function to auto-friend new team members
CREATE OR REPLACE FUNCTION auto_friend_team_members()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  teammate_record RECORD;
BEGIN
  -- For each existing team member (excluding the new user)
  FOR teammate_record IN 
    SELECT user_id 
    FROM team_members 
    WHERE team_id = NEW.team_id 
    AND user_id != NEW.user_id
  LOOP
    -- Create bidirectional friend connection (already accepted)
    INSERT INTO friend_connections (user_id, friend_id, accepted, invite_code)
    VALUES (NEW.user_id, teammate_record.user_id, true, '')
    ON CONFLICT (user_id, friend_id) DO NOTHING;
    
    -- Create reverse connection
    INSERT INTO friend_connections (user_id, friend_id, accepted, invite_code)
    VALUES (teammate_record.user_id, NEW.user_id, true, '')
    ON CONFLICT (user_id, friend_id) DO NOTHING;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Trigger to run after team member is added
DROP TRIGGER IF EXISTS auto_friend_on_team_join ON team_members;
CREATE TRIGGER auto_friend_on_team_join
AFTER INSERT ON team_members
FOR EACH ROW
EXECUTE FUNCTION auto_friend_team_members();