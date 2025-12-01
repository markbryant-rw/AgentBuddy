-- Create single-parameter version of get_or_create_direct_conversation
-- This makes it easier to call from the client without passing auth.uid()
CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Call the existing two-parameter version
  RETURN public.get_or_create_direct_conversation(current_user_id, other_user_id);
END;
$$;