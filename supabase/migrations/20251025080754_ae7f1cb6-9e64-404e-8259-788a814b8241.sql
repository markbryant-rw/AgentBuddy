-- Create server-side function for channel creation that uses auth.uid()
CREATE OR REPLACE FUNCTION public.create_team_channel(
  channel_title TEXT,
  channel_type TEXT,
  channel_icon TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_conversation_id UUID;
  user_team_id UUID;
BEGIN
  -- Get the user's team
  SELECT team_id INTO user_team_id
  FROM team_members
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF user_team_id IS NULL THEN
    RAISE EXCEPTION 'User does not have a team';
  END IF;

  -- Create the conversation using auth.uid() for created_by
  INSERT INTO conversations (type, title, created_by, channel_type, icon, is_system_channel)
  VALUES ('group', channel_title, auth.uid(), channel_type, channel_icon, false)
  RETURNING id INTO new_conversation_id;

  -- Add all team members as participants
  INSERT INTO conversation_participants (conversation_id, user_id, can_post)
  SELECT 
    new_conversation_id,
    tm.user_id,
    CASE 
      WHEN channel_type = 'announcement' THEN 
        EXISTS(SELECT 1 FROM user_roles WHERE user_id = tm.user_id AND role = 'admin')
      ELSE true
    END
  FROM team_members tm
  WHERE tm.team_id = user_team_id;

  RETURN new_conversation_id;
END;
$$;