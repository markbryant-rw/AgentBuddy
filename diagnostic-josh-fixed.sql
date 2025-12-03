-- FIXED JOSH SMITH DIAGNOSTIC
-- Run this to see EXACTLY what exists

DO $$
DECLARE
  target_email TEXT := 'josh.smith@raywhite.com';
  target_user_id UUID;
  auth_exists BOOLEAN := FALSE;
  profile_exists BOOLEAN := FALSE;
  invitation_exists BOOLEAN := FALSE;
BEGIN
  RAISE NOTICE '=== JOSH SMITH DIAGNOSTIC ===';
  RAISE NOTICE 'Email: %', target_email;
  RAISE NOTICE '';

  -- 1. Check auth.users
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(target_email);

  IF target_user_id IS NOT NULL THEN
    RAISE NOTICE '❌ FOUND IN AUTH.USERS';
    RAISE NOTICE '   User ID: %', target_user_id;
    auth_exists := TRUE;
  ELSE
    RAISE NOTICE '✅ Not in auth.users (good!)';
  END IF;
  RAISE NOTICE '';

  -- 2. Check profiles
  IF EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(email) = LOWER(target_email)) THEN
    RAISE NOTICE '❌ FOUND IN PROFILES';
    SELECT id, status, office_id
    INTO target_user_id, rec_status, rec_office
    FROM public.profiles
    WHERE LOWER(email) = LOWER(target_email)
    LIMIT 1;
    RAISE NOTICE '   ID: %, Status: %, Office: %', target_user_id, rec_status, rec_office;
    profile_exists := TRUE;
  ELSE
    RAISE NOTICE '✅ Not in profiles (good!)';
  END IF;
  RAISE NOTICE '';

  -- 3. Check pending_invitations (simpler check)
  SELECT COUNT(*) INTO inv_count
  FROM public.pending_invitations
  WHERE LOWER(email) = LOWER(target_email);

  IF inv_count > 0 THEN
    RAISE NOTICE '❌ FOUND % INVITATION(S)', inv_count;
    invitation_exists := TRUE;
  ELSE
    RAISE NOTICE '✅ Not in pending_invitations (good!)';
  END IF;
  RAISE NOTICE '';

  -- 4. Summary
  RAISE NOTICE '=== SUMMARY ===';
  IF NOT auth_exists AND NOT profile_exists AND NOT invitation_exists THEN
    RAISE NOTICE '✅✅✅ ALL CLEAR! Josh is completely deleted.';
    RAISE NOTICE 'You can now send a fresh invitation!';
  ELSE
    RAISE NOTICE '❌ Josh Smith data still exists.';
    RAISE NOTICE 'Run the NUCLEAR DELETE script next.';
  END IF;

END $$;
