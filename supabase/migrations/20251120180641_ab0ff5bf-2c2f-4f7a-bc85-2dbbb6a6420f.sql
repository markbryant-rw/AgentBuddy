-- Function to detect users without roles
CREATE OR REPLACE FUNCTION public.detect_users_without_roles()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  office_id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.email,
    p.full_name,
    p.office_id,
    p.created_at
  FROM profiles p
  WHERE p.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = p.id 
        AND ur.revoked_at IS NULL
    )
  ORDER BY p.created_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.detect_users_without_roles() TO authenticated;