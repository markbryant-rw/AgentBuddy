-- DELETE LORYN DARROCH COMPLETELY
-- Run this if she already exists in the system
-- Then have her try accepting the invitation again

DO $$
DECLARE
  target_email TEXT := 'loryn.darroch@raywhite.com';
  target_user_id UUID;
  deleted_count INTEGER;
BEGIN
  RAISE NOTICE '=== DELETING LORYN DARROCH ===';
  RAISE NOTICE 'Email: %', target_email;
  RAISE NOTICE '';

  -- Find user ID from auth
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(target_email);

  IF target_user_id IS NOT NULL THEN
    RAISE NOTICE 'Found user ID: %', target_user_id;
  ELSE
    RAISE NOTICE 'No user found in auth.users';
  END IF;
  RAISE NOTICE '';

  -- Delete from user_roles
  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % user role(s)', deleted_count;

  -- Delete from team_members
  DELETE FROM public.team_members WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % team member(s)', deleted_count;

  -- Delete from profiles
  DELETE FROM public.profiles WHERE id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % profile(s)', deleted_count;

  -- Clean up any orphaned profiles by email
  DELETE FROM public.profiles WHERE LOWER(email) = LOWER(target_email);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count > 0 THEN
    RAISE NOTICE 'Deleted % orphaned profile(s)', deleted_count;
  END IF;

  RAISE NOTICE '';
  IF target_user_id IS NOT NULL THEN
    RAISE NOTICE '⚠️  FINAL STEP REQUIRED:';
    RAISE NOTICE '';
    RAISE NOTICE '   Go to: Authentication > Users';
    RAISE NOTICE '   Search: loryn.darroch@raywhite.com';
    RAISE NOTICE '   Delete the user manually';
    RAISE NOTICE '';
    RAISE NOTICE '   After deleting from auth, have Loryn try accepting the invitation again!';
  ELSE
    RAISE NOTICE '✅ Complete! Loryn is deleted.';
    RAISE NOTICE 'Have her try accepting the invitation again!';
  END IF;

END $$;
