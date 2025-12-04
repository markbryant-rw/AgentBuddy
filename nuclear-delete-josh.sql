-- NUCLEAR DELETE FOR JOSH SMITH
-- This will delete EVERYTHING related to josh.smith@raywhite.com
-- Run this if the diagnostic shows any remaining data

-- WARNING: This is a HARD DELETE - no recovery possible!

DO $$
DECLARE
  target_email TEXT := 'josh.smith@raywhite.com';
  target_user_id UUID;
  deleted_count INTEGER;
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'NUCLEAR DELETE: JOSH SMITH';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Target: %', target_email;
  RAISE NOTICE '';

  -- Find user ID from auth (if exists)
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(target_email);

  IF target_user_id IS NOT NULL THEN
    RAISE NOTICE 'Found user ID: %', target_user_id;
  ELSE
    RAISE NOTICE 'No user ID found in auth.users';
  END IF;
  RAISE NOTICE '';

  -- DELETE 1: pending_invitations (by email - ALL statuses)
  RAISE NOTICE '1. Deleting from pending_invitations...';
  DELETE FROM public.pending_invitations
  WHERE LOWER(email) = LOWER(target_email);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '   Deleted % record(s)', deleted_count;

  -- If user exists in auth, delete all their data
  IF target_user_id IS NOT NULL THEN

    -- DELETE 2: user_roles
    RAISE NOTICE '2. Deleting from user_roles...';
    DELETE FROM public.user_roles
    WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '   Deleted % record(s)', deleted_count;

    -- DELETE 3: team_members
    RAISE NOTICE '3. Deleting from team_members...';
    DELETE FROM public.team_members
    WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '   Deleted % record(s)', deleted_count;

    -- DELETE 4: profiles
    RAISE NOTICE '4. Deleting from profiles...';
    DELETE FROM public.profiles
    WHERE id = target_user_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '   Deleted % record(s)', deleted_count;

  END IF;

  -- Also delete any orphaned profiles by email (shouldn't happen but just in case)
  RAISE NOTICE '5. Checking for orphaned profiles by email...';
  DELETE FROM public.profiles
  WHERE LOWER(email) = LOWER(target_email);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count > 0 THEN
    RAISE NOTICE '   ⚠️  Found and deleted % orphaned profile(s)!', deleted_count;
  ELSE
    RAISE NOTICE '   No orphaned profiles found';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'DATABASE CLEANUP COMPLETE';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';

  IF target_user_id IS NOT NULL THEN
    RAISE NOTICE '⚠️  IMPORTANT FINAL STEP:';
    RAISE NOTICE '';
    RAISE NOTICE '   You MUST manually delete from auth.users:';
    RAISE NOTICE '';
    RAISE NOTICE '   1. Go to: Authentication > Users';
    RAISE NOTICE '   2. Search: josh.smith@raywhite.com';
    RAISE NOTICE '   3. Click ... > Delete User';
    RAISE NOTICE '   4. User ID: %', target_user_id;
    RAISE NOTICE '';
    RAISE NOTICE '   After deleting from auth, you can send a fresh invitation!';
  ELSE
    RAISE NOTICE '✅ COMPLETE! Josh Smith is fully deleted.';
    RAISE NOTICE '   You can now send a fresh invitation!';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '================================================';

END $$;
