-- Fix critical security issue: pending_invitations broken RLS policy
-- Drop the broken policy that allows unrestricted access
DROP POLICY IF EXISTS "View invitations by specific invite code" ON public.pending_invitations;

-- Create a secure RPC function to validate and retrieve invitation data
-- This prevents enumeration attacks while allowing the signup flow to work
CREATE OR REPLACE FUNCTION public.get_invitation_by_code(invite_code_input TEXT)
RETURNS TABLE (
  email TEXT,
  role app_role,
  team_id UUID,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return only the minimal necessary data for ONE valid invitation
  RETURN QUERY
  SELECT 
    pi.email,
    pi.role,
    pi.team_id,
    pi.expires_at
  FROM pending_invitations pi
  WHERE pi.invite_code = invite_code_input
    AND pi.used = false
    AND pi.expires_at > now()
  LIMIT 1;
END;
$$;

-- Grant execute permission to anonymous users (needed for signup flow)
GRANT EXECUTE ON FUNCTION public.get_invitation_by_code(TEXT) TO anon, authenticated;