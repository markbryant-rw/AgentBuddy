-- Create function to add participants to channels
CREATE OR REPLACE FUNCTION public.add_channel_participant(
  channel_id UUID,
  new_user_id UUID,
  allow_posting BOOLEAN DEFAULT true
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  channel_type TEXT;
  is_admin BOOLEAN;
BEGIN
  -- Get channel type
  SELECT c.channel_type INTO channel_type
  FROM conversations c
  WHERE c.id = channel_id;
  
  -- Check if new user is admin
  SELECT EXISTS(
    SELECT 1 FROM user_roles 
    WHERE user_id = new_user_id AND role = 'admin'
  ) INTO is_admin;
  
  -- Insert participant with appropriate permissions
  INSERT INTO conversation_participants (conversation_id, user_id, can_post)
  VALUES (
    channel_id,
    new_user_id,
    CASE 
      WHEN channel_type = 'announcement' THEN is_admin
      ELSE allow_posting
    END
  )
  ON CONFLICT (conversation_id, user_id) DO NOTHING;
END;
$$;