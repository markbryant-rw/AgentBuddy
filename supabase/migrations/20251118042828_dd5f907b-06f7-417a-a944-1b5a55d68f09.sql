-- Drop problematic RLS policies that cause infinite recursion
DROP POLICY IF EXISTS "Office managers can view profiles in their office" ON public.profiles;
DROP POLICY IF EXISTS "Office managers can view teams in their office" ON public.teams;

-- The issue was that these policies query the profiles table to check permissions on the profiles table,
-- creating infinite recursion. We'll rely on existing RLS policies and edge functions for office manager permissions.