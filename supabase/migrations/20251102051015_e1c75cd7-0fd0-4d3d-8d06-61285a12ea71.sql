-- Add invite_code column to agencies table
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- Generate invite codes for existing agencies
UPDATE agencies 
SET invite_code = gen_random_uuid()::text 
WHERE invite_code IS NULL;

-- Update the auto_add_to_office_channel trigger function to auto-create channels
CREATE OR REPLACE FUNCTION public.auto_add_to_office_channel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_office_channel_id UUID;
  v_agency_id UUID;
BEGIN
  -- Get the agency ID and office channel for this team
  SELECT t.agency_id, a.office_channel_id 
  INTO v_agency_id, v_office_channel_id
  FROM teams t
  JOIN agencies a ON a.id = t.agency_id
  WHERE t.id = NEW.team_id;
  
  -- If office channel doesn't exist, create it automatically
  IF v_office_channel_id IS NULL THEN
    SELECT create_office_channel(v_agency_id) 
    INTO v_office_channel_id;
  END IF;
  
  -- Add user to office channel
  IF v_office_channel_id IS NOT NULL THEN
    INSERT INTO conversation_participants (conversation_id, user_id, can_post)
    VALUES (v_office_channel_id, NEW.user_id, true)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Backfill Ray White New Lynn office channel
DO $$
DECLARE
  v_ray_white_id UUID := '871815ac-c74e-4e2e-a60d-51ca62009811';
  v_channel_id UUID;
BEGIN
  -- Check if channel already exists
  SELECT office_channel_id INTO v_channel_id
  FROM agencies 
  WHERE id = v_ray_white_id;
  
  -- If no channel exists, create it
  IF v_channel_id IS NULL THEN
    SELECT create_office_channel(v_ray_white_id) INTO v_channel_id;
    RAISE NOTICE 'Created office channel for Ray White New Lynn: %', v_channel_id;
  ELSE
    RAISE NOTICE 'Ray White New Lynn already has an office channel: %', v_channel_id;
  END IF;
END $$;