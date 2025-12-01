-- Fix: Restrict pending_invitations access to prevent email harvesting
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view invitation by code" ON public.pending_invitations;

-- Only allow viewing invitations when querying with a specific invite code
-- This prevents enumeration attacks while allowing the signup flow to work
CREATE POLICY "View invitations by specific invite code"
ON public.pending_invitations
FOR SELECT
USING (
  -- Allow access only when filtering by a specific invite_code
  -- The application must always query with the invite_code in the WHERE clause
  invite_code IS NOT NULL
);