-- Assign platform_admin role to Mark Bryant
-- This will work once the user signs up with the email mark.bryant@raywhite.com

DO $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Get user ID from profiles table by email
  SELECT id INTO target_user_id
  FROM public.profiles
  WHERE email = 'mark.bryant@raywhite.com'
  LIMIT 1;

  -- If user exists, assign platform_admin role
  IF target_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'platform_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Platform admin role assigned to mark.bryant@raywhite.com';
  ELSE
    RAISE NOTICE 'User mark.bryant@raywhite.com not found. Please sign up first, then run this migration again.';
  END IF;
END $$;