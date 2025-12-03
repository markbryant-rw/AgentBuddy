-- Complete deletion of Josh Smith from the platform
-- Email: josh.smith@raywhite.com
-- This script performs a HARD DELETE (not soft delete/archive)

BEGIN;

-- Store the email for reference
DO $$
DECLARE
  target_email TEXT := 'josh.smith@raywhite.com';
  target_user_id UUID;
BEGIN
  RAISE NOTICE 'Starting complete deletion for: %', target_email;

  -- Find user ID from auth.users (if exists)
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(target_email);

  IF target_user_id IS NOT NULL THEN
    RAISE NOTICE 'Found user ID: %', target_user_id;

    -- Delete from user_roles
    DELETE FROM public.user_roles
    WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted from user_roles';

    -- Delete from team_members
    DELETE FROM public.team_members
    WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted from team_members';

    -- Delete from profiles
    DELETE FROM public.profiles
    WHERE id = target_user_id;
    RAISE NOTICE 'Deleted from profiles';

    -- Note: auth.users deletion requires service role, handled separately
    RAISE NOTICE 'Auth user still exists - needs admin deletion';
  ELSE
    RAISE NOTICE 'No user found in auth.users';
  END IF;

  -- Delete from pending_invitations (by email)
  DELETE FROM public.pending_invitations
  WHERE LOWER(email) = LOWER(target_email);
  RAISE NOTICE 'Deleted from pending_invitations';

  RAISE NOTICE 'Complete deletion finished for: %', target_email;
END $$;

COMMIT;

-- After running this, you'll need to delete from auth.users via the Supabase dashboard
-- or using the admin API, as that requires service role privileges
