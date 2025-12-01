-- Fix "cannot set parameter 'role' within security-definer function" error
-- The issue is using "SET search_path TO 'public'" with a parameter named _role
-- Change to "SET search_path = public" to avoid parameter confusion

CREATE OR REPLACE FUNCTION public.set_active_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id
    AND role::text = _role
    AND revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'User does not have role: %', _role;
  END IF;

  UPDATE profiles
  SET
    active_role = _role,
    last_role_switch_at = now()
  WHERE id = _user_id;

  RETURN true;
END;
$function$;
