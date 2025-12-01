-- Add role perspective switcher columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS active_role text NULL,
ADD COLUMN IF NOT EXISTS last_role_switch_at timestamptz NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_active_role ON public.profiles(active_role);

-- Add comments
COMMENT ON COLUMN public.profiles.active_role IS 'The currently active role perspective for multi-role users';
COMMENT ON COLUMN public.profiles.last_role_switch_at IS 'Timestamp of the last role perspective switch';

-- Create function to safely set active role
CREATE OR REPLACE FUNCTION public.set_active_role(
  _user_id uuid,
  _role text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user has this role
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id 
    AND role::text = _role
    AND revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'User does not have role: %', _role;
  END IF;

  -- Update active role
  UPDATE profiles
  SET 
    active_role = _role,
    last_role_switch_at = now()
  WHERE id = _user_id;

  RETURN true;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.set_active_role(uuid, text) TO authenticated;