-- Drop existing policies and recreate them properly
-- This fixes the infinite loading issue by ensuring users can read their own data

-- Drop all existing policies on profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Platform admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Platform admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Platform admins can view all users" ON public.profiles;
DROP POLICY IF EXISTS "Platform admins can update all users" ON public.profiles;

-- Drop all existing policies on user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Platform admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Platform admins can view all user roles" ON public.user_roles;

-- Create essential policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Platform admins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Platform admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'platform_admin'));

-- Create essential policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Platform admins can view all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));