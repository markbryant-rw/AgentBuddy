-- COMPREHENSIVE JOSH SMITH DIAGNOSTIC
-- Run this to see EXACTLY what exists for Josh Smith

DO $$
DECLARE
  target_email TEXT := 'josh.smith@raywhite.com';
  target_user_id UUID;
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'COMPREHENSIVE JOSH SMITH DIAGNOSTIC';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Target email: %', target_email;
  RAISE NOTICE '';

  -- 1. Check auth.users
  RAISE NOTICE '1. AUTH.USERS:';
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(target_email);

  IF target_user_id IS NOT NULL THEN
    RAISE NOTICE '   ❌ FOUND IN AUTH: %', target_user_id;
  ELSE
    RAISE NOTICE '   ✅ NOT in auth.users (good!)';
  END IF;
  RAISE NOTICE '';

  -- 2. Check profiles
  RAISE NOTICE '2. PROFILES:';
  IF EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(email) = LOWER(target_email)) THEN
    RAISE NOTICE '   ❌ FOUND IN PROFILES:';
    FOR rec IN
      SELECT id, email, full_name, status, office_id, created_at
      FROM public.profiles
      WHERE LOWER(email) = LOWER(target_email)
    LOOP
      RAISE NOTICE '      ID: %, Status: %, Office: %, Created: %',
        rec.id, rec.status, rec.office_id, rec.created_at;
    END LOOP;
  ELSE
    RAISE NOTICE '   ✅ NOT in profiles (good!)';
  END IF;
  RAISE NOTICE '';

  -- 3. Check pending_invitations
  RAISE NOTICE '3. PENDING_INVITATIONS:';
  IF EXISTS (SELECT 1 FROM public.pending_invitations WHERE LOWER(email) = LOWER(target_email)) THEN
    RAISE NOTICE '   ❌ FOUND IN PENDING_INVITATIONS:';
    FOR rec IN
      SELECT id, email, role, status, created_at, expires_at, team_id, office_id
      FROM public.pending_invitations
      WHERE LOWER(email) = LOWER(target_email)
    LOOP
      RAISE NOTICE '      ID: %, Status: %, Role: %, Team: %, Office: %',
        rec.id, rec.status, rec.role, rec.team_id, rec.office_id;
      RAISE NOTICE '      Created: %, Expires: %', rec.created_at, rec.expires_at;
    END LOOP;
  ELSE
    RAISE NOTICE '   ✅ NOT in pending_invitations (good!)';
  END IF;
  RAISE NOTICE '';

  -- 4. Check user_roles (if user exists)
  IF target_user_id IS NOT NULL THEN
    RAISE NOTICE '4. USER_ROLES:';
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = target_user_id) THEN
      RAISE NOTICE '   ❌ FOUND IN USER_ROLES:';
      FOR rec IN
        SELECT role, created_at, revoked_at
        FROM public.user_roles
        WHERE user_id = target_user_id
      LOOP
        RAISE NOTICE '      Role: %, Revoked: %', rec.role, rec.revoked_at;
      END LOOP;
    ELSE
      RAISE NOTICE '   ✅ NOT in user_roles (good!)';
    END IF;
    RAISE NOTICE '';

    -- 5. Check team_members
    RAISE NOTICE '5. TEAM_MEMBERS:';
    IF EXISTS (SELECT 1 FROM public.team_members WHERE user_id = target_user_id) THEN
      RAISE NOTICE '   ❌ FOUND IN TEAM_MEMBERS:';
      FOR rec IN
        SELECT team_id, created_at
        FROM public.team_members
        WHERE user_id = target_user_id
      LOOP
        RAISE NOTICE '      Team: %, Created: %', rec.team_id, rec.created_at;
      END LOOP;
    ELSE
      RAISE NOTICE '   ✅ NOT in team_members (good!)';
    END IF;
    RAISE NOTICE '';
  END IF;

  RAISE NOTICE '================================================';
  RAISE NOTICE 'SUMMARY:';
  RAISE NOTICE '================================================';

  IF target_user_id IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(email) = LOWER(target_email))
    AND NOT EXISTS (SELECT 1 FROM public.pending_invitations WHERE LOWER(email) = LOWER(target_email))
  THEN
    RAISE NOTICE '✅✅✅ ALL CLEAR! Josh Smith is completely deleted.';
    RAISE NOTICE 'You can now send a fresh invitation!';
  ELSE
    RAISE NOTICE '❌ ISSUE FOUND - Josh Smith data still exists (see above)';
    RAISE NOTICE 'Run the NUCLEAR DELETE script below to clean up.';
  END IF;
  RAISE NOTICE '';

END $$;
