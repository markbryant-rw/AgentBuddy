-- Emergency Josh Smith Deletion Script
-- Run this in Supabase SQL Editor to completely remove Josh Smith
-- Then you can retry the invitation

-- First, let's see what exists
DO $$
DECLARE
  target_email TEXT := 'josh.smith@raywhite.com';
  target_user_id UUID;
  auth_count INTEGER;
  profile_count INTEGER;
  role_count INTEGER;
  team_member_count INTEGER;
  invitation_count INTEGER;
BEGIN
  RAISE NOTICE '=== CHECKING FOR JOSH SMITH DATA ===';
  RAISE NOTICE 'Email: %', target_email;
  RAISE NOTICE '';

  -- Check auth.users
  SELECT COUNT(*), MAX(id)
  INTO auth_count, target_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(target_email);

  RAISE NOTICE '1. Auth Users: % found', auth_count;
  IF target_user_id IS NOT NULL THEN
    RAISE NOTICE '   User ID: %', target_user_id;
  END IF;

  -- Check profiles
  IF target_user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO profile_count
    FROM public.profiles
    WHERE id = target_user_id;
    RAISE NOTICE '2. Profiles: % found', profile_count;

    -- Check user_roles
    SELECT COUNT(*) INTO role_count
    FROM public.user_roles
    WHERE user_id = target_user_id;
    RAISE NOTICE '3. User Roles: % found', role_count;

    -- Check team_members
    SELECT COUNT(*) INTO team_member_count
    FROM public.team_members
    WHERE user_id = target_user_id;
    RAISE NOTICE '4. Team Members: % found', team_member_count;
  END IF;

  -- Check pending_invitations
  SELECT COUNT(*) INTO invitation_count
  FROM public.pending_invitations
  WHERE LOWER(email) = LOWER(target_email);
  RAISE NOTICE '5. Pending Invitations: % found', invitation_count;

  RAISE NOTICE '';
  RAISE NOTICE '=== STARTING DELETION ===';

  -- Delete from pending_invitations first
  DELETE FROM public.pending_invitations
  WHERE LOWER(email) = LOWER(target_email);
  GET DIAGNOSTICS invitation_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % pending invitation(s)', invitation_count;

  -- If user exists, delete all their data
  IF target_user_id IS NOT NULL THEN
    -- Delete from user_roles
    DELETE FROM public.user_roles
    WHERE user_id = target_user_id;
    GET DIAGNOSTICS role_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % user role(s)', role_count;

    -- Delete from team_members
    DELETE FROM public.team_members
    WHERE user_id = target_user_id;
    GET DIAGNOSTICS team_member_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % team member record(s)', team_member_count;

    -- Delete from profiles
    DELETE FROM public.profiles
    WHERE id = target_user_id;
    GET DIAGNOSTICS profile_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % profile(s)', profile_count;

    RAISE NOTICE '';
    RAISE NOTICE '=== IMPORTANT ===';
    RAISE NOTICE 'Now go to Authentication > Users and manually delete:';
    RAISE NOTICE 'Email: %', target_email;
    RAISE NOTICE 'User ID: %', target_user_id;
    RAISE NOTICE '';
    RAISE NOTICE 'Steps:';
    RAISE NOTICE '1. Go to Authentication > Users';
    RAISE NOTICE '2. Search for: josh.smith@raywhite.com';
    RAISE NOTICE '3. Click ... menu > Delete User';
    RAISE NOTICE '4. Confirm deletion';
    RAISE NOTICE '5. Then retry your invitation!';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '=== COMPLETE ===';
    RAISE NOTICE 'No auth user found - deletion complete!';
    RAISE NOTICE 'You can now send a fresh invitation to Josh Smith.';
  END IF;

END $$;
