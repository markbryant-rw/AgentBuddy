CREATE OR REPLACE FUNCTION public.create_office_channel(p_agency_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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

  -- Add all office members as participants
  -- profiles.office_id references agencies.id
  FOR v_participant IN 
    SELECT id 
    FROM public.profiles 
    WHERE office_id = p_agency_id
  LOOP
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (v_channel_id, v_participant.id)
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
$function$;