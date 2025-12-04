-- Fix profiles table RLS to prevent cross-agency data leakage

-- Drop existing permissive SELECT policies
DROP POLICY IF EXISTS "Users can view profiles in their agency" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Platform admins can view all profiles" ON public.profiles;

-- Create stricter SELECT policies

-- 1. Users can always view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (id = auth.uid());

-- 2. Platform admins can view all profiles
CREATE POLICY "Platform admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'platform_admin'));

-- 3. Users can view other profiles ONLY if both have a valid office_id AND they're in the same agency
-- This prevents NULL office_id profiles from being visible to others and prevents cross-agency access
CREATE POLICY "Users can view profiles in same agency"
ON public.profiles
FOR SELECT
USING (
  -- Both the viewer and the profile must have a non-null office_id
  office_id IS NOT NULL 
  AND get_user_agency_id(auth.uid()) IS NOT NULL
  AND office_id = get_user_agency_id(auth.uid())
);

-- 4. Office managers can view profiles in agencies they manage
CREATE POLICY "Office managers can view managed agency profiles"
ON public.profiles
FOR SELECT
USING (
  office_id IS NOT NULL
  AND office_id IN (
    SELECT agency_id FROM office_manager_assignments 
    WHERE user_id = auth.uid()
  )
);

-- 5. Team members can view profiles of people in their teams (for collaboration)
CREATE POLICY "Team members can view teammate profiles"
ON public.profiles
FOR SELECT
USING (
  id IN (
    SELECT tm2.user_id 
    FROM team_members tm1
    JOIN team_members tm2 ON tm1.team_id = tm2.team_id
    WHERE tm1.user_id = auth.uid()
  )
);