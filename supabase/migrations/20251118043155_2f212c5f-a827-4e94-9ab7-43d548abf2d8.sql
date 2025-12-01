-- Drop the policy causing infinite recursion
DROP POLICY IF EXISTS "Office managers can view their office profiles" ON public.profiles;