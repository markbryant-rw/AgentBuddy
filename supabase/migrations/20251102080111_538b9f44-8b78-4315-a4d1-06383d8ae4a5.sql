-- Fix 1: Update existing office channels to use emoji instead of 'building-2'
UPDATE conversations
SET icon = '🏢'
WHERE icon = 'building-2';

-- Fix 2: Update create_office_channel function to use emoji
CREATE OR REPLACE FUNCTION public.create_office_channel(p_agency_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_channel_id UUID;
  v_agency_name TEXT;
  v_participant RECORD;
BEGIN
  -- Get agency name
  SELECT name INTO v_agency_name
  FROM public.agencies
  WHERE id = p_agency_id;

  IF v_agency_name IS NULL THEN
    RAISE EXCEPTION 'Agency not found';
  END IF;

  -- Create the office channel
  INSERT INTO public.conversations (type, title, icon, is_system_channel)
  VALUES ('group', v_agency_name || ' Office', '🏢', true)
  RETURNING id INTO v_channel_id;

  -- Add all agency members as participants
  FOR v_participant IN 
    SELECT user_id 
    FROM public.profiles 
    WHERE agency_id = p_agency_id
  LOOP
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (v_channel_id, v_participant.user_id)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Update agency with office channel ID
  UPDATE public.agencies
  SET office_channel_id = v_channel_id
  WHERE id = p_agency_id;

  -- Force refresh of materialized view for immediate visibility
  PERFORM refresh_conversations_summary();

  RETURN v_channel_id;
END;
$$;