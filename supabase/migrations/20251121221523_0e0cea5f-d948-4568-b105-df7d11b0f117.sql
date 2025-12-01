-- Repair orphaned account for Vish Bhati
-- Creates a fresh pending invitation with secure token

DO $$
DECLARE
  v_user_id uuid := 'ed74c6d1-4fe5-40c8-bf45-3510eab8893e';
  v_email text := 'vish.bhati@raywhite.com';
  v_office_id uuid := '02148856-7fb7-4405-98c9-23d51bcde479';
  v_team_id uuid := 'bfed7d79-8035-48d5-bab2-4265395534e9';
  v_role app_role := 'team_leader';
  v_token text;
  v_token_hash text;
  v_inviter_id uuid;
BEGIN
  -- Verify the user exists in profiles
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'User profile not found for id: %', v_user_id;
  END IF;

  -- Verify office exists
  IF NOT EXISTS (SELECT 1 FROM public.agencies WHERE id = v_office_id) THEN
    RAISE EXCEPTION 'Office not found for id: %', v_office_id;
  END IF;

  -- Verify team exists and belongs to office
  IF NOT EXISTS (SELECT 1 FROM public.teams WHERE id = v_team_id AND agency_id = v_office_id) THEN
    RAISE EXCEPTION 'Team not found or does not belong to office';
  END IF;

  -- Get an office manager to act as inviter (preferably from this office)
  SELECT p.id INTO v_inviter_id
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE ur.role = 'office_manager'
    AND ur.revoked_at IS NULL
    AND p.office_id = v_office_id
    AND p.status = 'active'
  LIMIT 1;

  -- If no office manager in this office, get any active office manager
  IF v_inviter_id IS NULL THEN
    SELECT p.id INTO v_inviter_id
    FROM public.profiles p
    INNER JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE ur.role = 'office_manager'
      AND ur.revoked_at IS NULL
      AND p.status = 'active'
    LIMIT 1;
  END IF;

  IF v_inviter_id IS NULL THEN
    RAISE EXCEPTION 'No active office manager found to act as inviter';
  END IF;

  -- Generate secure token (32 bytes = 64 hex chars)
  v_token := encode(gen_random_bytes(32), 'hex');
  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');

  -- Delete any existing pending invitations for this email
  DELETE FROM public.pending_invitations
  WHERE email = v_email AND status = 'pending';

  -- Create new pending invitation
  INSERT INTO public.pending_invitations (
    email,
    role,
    invited_by,
    token,
    token_hash,
    expires_at,
    office_id,
    team_id,
    status,
    full_name
  )
  SELECT
    v_email,
    v_role,
    v_inviter_id,
    v_token,
    v_token_hash,
    NOW() + INTERVAL '7 days',
    v_office_id,
    v_team_id,
    'pending',
    p.full_name
  FROM public.profiles p
  WHERE p.id = v_user_id;

  -- Log the repair action with the secure token
  INSERT INTO public.audit_logs (action, user_id, details)
  VALUES (
    'orphan_account_repair',
    v_inviter_id,
    jsonb_build_object(
      'repaired_user_id', v_user_id,
      'email', v_email,
      'office_id', v_office_id,
      'team_id', v_team_id,
      'role', v_role::text,
      'token', v_token,
      'reason', 'Manual repair for orphaned account - missing auth.users record'
    )
  );

  RAISE NOTICE 'Invitation created successfully. Token stored in audit_logs for email sending';
END $$;