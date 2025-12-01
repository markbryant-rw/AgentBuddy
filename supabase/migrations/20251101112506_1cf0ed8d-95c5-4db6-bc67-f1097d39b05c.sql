-- Fix handle_new_user trigger to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$function$;

-- Add full_name column to pending_invitations
ALTER TABLE public.pending_invitations 
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Drop and recreate get_invitation_by_code to return full_name
DROP FUNCTION IF EXISTS public.get_invitation_by_code(text);

CREATE FUNCTION public.get_invitation_by_code(invite_code_input text)
RETURNS TABLE(email text, role app_role, team_id uuid, expires_at timestamp with time zone, full_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    pi.email,
    pi.role,
    pi.team_id,
    pi.expires_at,
    pi.full_name
  FROM pending_invitations pi
  WHERE pi.invite_code = invite_code_input
    AND pi.used = false
    AND pi.expires_at > now()
  LIMIT 1;
END;
$function$;