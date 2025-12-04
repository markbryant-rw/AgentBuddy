-- Check if Loryn already exists in the system
-- This could cause the invitation acceptance to fail

DO $$
DECLARE
  target_email TEXT := 'loryn.darroch@raywhite.com';
BEGIN
  RAISE NOTICE '=== CHECKING FOR EXISTING LORYN ACCOUNT ===';
  RAISE NOTICE '';

  -- Check auth.users
  IF EXISTS (SELECT 1 FROM auth.users WHERE LOWER(email) = LOWER(target_email)) THEN
    RAISE NOTICE '❌ FOUND IN AUTH.USERS:';
    FOR rec IN
      SELECT id, email, created_at, email_confirmed_at
      FROM auth.users
      WHERE LOWER(email) = LOWER(target_email)
    LOOP
      RAISE NOTICE '   User ID: %', rec.id;
      RAISE NOTICE '   Created: %', rec.created_at;
      RAISE NOTICE '   Email Confirmed: %', rec.email_confirmed_at;
    END LOOP;
  ELSE
    RAISE NOTICE '✅ Not in auth.users (good!)';
  END IF;
  RAISE NOTICE '';

  -- Check profiles
  IF EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(email) = LOWER(target_email)) THEN
    RAISE NOTICE '❌ FOUND IN PROFILES:';
    FOR rec IN
      SELECT id, email, full_name, status, office_id, primary_team_id
      FROM public.profiles
      WHERE LOWER(email) = LOWER(target_email)
    LOOP
      RAISE NOTICE '   Profile ID: %', rec.id;
      RAISE NOTICE '   Name: %', rec.full_name;
      RAISE NOTICE '   Status: %', rec.status;
      RAISE NOTICE '   Office: %', rec.office_id;
      RAISE NOTICE '   Team: %', rec.primary_team_id;
    END LOOP;
  ELSE
    RAISE NOTICE '✅ Not in profiles (good!)';
  END IF;
  RAISE NOTICE '';

  -- Check team_members
  IF EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.profiles p ON p.id = tm.user_id
    WHERE LOWER(p.email) = LOWER(target_email)
  ) THEN
    RAISE NOTICE '❌ FOUND IN TEAM_MEMBERS:';
    FOR rec IN
      SELECT tm.user_id, tm.team_id, t.name as team_name
      FROM public.team_members tm
      JOIN public.profiles p ON p.id = tm.user_id
      JOIN public.teams t ON t.id = tm.team_id
      WHERE LOWER(p.email) = LOWER(target_email)
    LOOP
      RAISE NOTICE '   User: %, Team: % (%)', rec.user_id, rec.team_name, rec.team_id;
    END LOOP;
  ELSE
    RAISE NOTICE '✅ Not in team_members (good!)';
  END IF;
  RAISE NOTICE '';

  RAISE NOTICE '=== SUMMARY ===';
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE LOWER(email) = LOWER(target_email))
    AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(email) = LOWER(target_email))
  THEN
    RAISE NOTICE '✅✅✅ ALL CLEAR! Loryn does not exist.';
    RAISE NOTICE 'The error must be something else.';
    RAISE NOTICE 'CHECK THE EDGE FUNCTION LOGS for the exact error!';
  ELSE
    RAISE NOTICE '❌ Loryn already exists in the system!';
    RAISE NOTICE 'This is likely causing the invitation acceptance to fail.';
    RAISE NOTICE 'Run the DELETE script below to clean up.';
  END IF;
  RAISE NOTICE '';

END $$;
