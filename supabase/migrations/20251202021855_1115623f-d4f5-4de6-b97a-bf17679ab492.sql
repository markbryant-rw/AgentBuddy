-- Create function to set active role for a user
-- This validates the user has the role before switching
CREATE OR REPLACE FUNCTION public.set_active_role(_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user has this role
  IF NOT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = _user_id 
      AND role = _role 
      AND revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'User does not have role: %', _role;
  END IF;
  
  -- Update active role
  UPDATE public.profiles
  SET 
    active_role = _role,
    last_role_switch_at = now()
  WHERE id = _user_id;
END;
$$;