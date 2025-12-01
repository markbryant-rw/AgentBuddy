-- Refresh the materialized view to show existing office channel
REFRESH MATERIALIZED VIEW CONCURRENTLY user_conversations_summary;

-- Update create_office_channel to auto-refresh the view
CREATE OR REPLACE FUNCTION public.create_office_channel(p_agency_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_conversation_id UUID;
  v_agency_name TEXT;
BEGIN
  -- Get agency name
  SELECT name INTO v_agency_name FROM agencies WHERE id = p_agency_id;
  
  -- Create conversation
  INSERT INTO conversations (type, title, channel_type, is_system_channel, description, icon)
  VALUES (
    'group',
    v_agency_name || ' - Office Updates',
    'standard',
    true,
    'Office-wide announcements and updates for all ' || v_agency_name || ' members',
    'building-2'
  )
  RETURNING id INTO v_conversation_id;
  
  -- Link to agency
  UPDATE agencies 
  SET office_channel_id = v_conversation_id 
  WHERE id = p_agency_id;
  
  -- Add all existing office members
  INSERT INTO conversation_participants (conversation_id, user_id, can_post)
  SELECT DISTINCT v_conversation_id, tm.user_id, true
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  WHERE t.agency_id = p_agency_id
  ON CONFLICT (conversation_id, user_id) DO NOTHING;
  
  -- Force refresh of materialized view for immediate visibility
  PERFORM refresh_conversations_summary();
  
  RETURN v_conversation_id;
END;
$function$;