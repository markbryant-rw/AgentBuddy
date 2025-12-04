-- Create the missing check_invitation_rate_limit function
CREATE OR REPLACE FUNCTION public.check_invitation_rate_limit(_user_id uuid)
RETURNS TABLE(allowed boolean, message text, retry_after integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Simple implementation: always allow (no rate limiting)
  SELECT true::boolean AS allowed, NULL::text AS message, 0::integer AS retry_after;
$$;