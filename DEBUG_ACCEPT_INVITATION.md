# Debugging Accept Invitation Error

When Loryn clicks "Accept" on the invitation, she's getting an error. Let's find out exactly what's failing.

---

## Step 1: Check Edge Function Logs (CRITICAL)

This will tell us the exact error:

1. Go to **Supabase Dashboard**
2. Navigate to **Edge Functions** → **accept-invitation**
3. Click **Logs** tab
4. Have Loryn click "Accept" again
5. Watch for new log entries (they appear in real-time)
6. Look for **RED error messages**

**Common errors you might see:**

### Error A: "Failed to create personal team"
```
Failed to create personal team: function ensure_personal_team does not exist
```
**Fix:** The RPC function is missing - see Fix A below

### Error B: "Team validation failed"
```
Team validation failed: agency_id does not match office_id
```
**Fix:** The team's agency_id doesn't match - see Fix B below

### Error C: "Failed to add you to [Team Name]"
```
CRITICAL: Team member creation failed: duplicate key value violates unique constraint
```
**Fix:** User is already a team member - see Fix C below

### Error D: "Profile verification failed"
```
CRITICAL: Profile verification failed after team assignment
```
**Fix:** Office ID or team ID didn't save properly - see Fix D below

---

## Fix A: Missing ensure_personal_team Function

If the error says "function ensure_personal_team does not exist", run this in SQL Editor:

```sql
-- Create the ensure_personal_team function
CREATE OR REPLACE FUNCTION ensure_personal_team(
  user_id_param UUID,
  user_full_name TEXT,
  office_id_param UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  team_id UUID;
  team_name TEXT;
BEGIN
  -- Generate team name
  team_name := user_full_name || ' (Personal)';

  -- Check if personal team already exists for this user
  SELECT id INTO team_id
  FROM teams
  WHERE agency_id = office_id_param
    AND is_personal_team = true
    AND created_by = user_id_param
  LIMIT 1;

  -- If exists, return it
  IF team_id IS NOT NULL THEN
    RETURN team_id;
  END IF;

  -- Create new personal team
  INSERT INTO teams (
    name,
    agency_id,
    is_personal_team,
    created_by,
    is_archived,
    is_orphan_team
  )
  VALUES (
    team_name,
    office_id_param,
    true,
    user_id_param,
    false,
    false
  )
  RETURNING id INTO team_id;

  RETURN team_id;
END;
$$;
```

---

## Fix B: Team Agency ID Mismatch

If team validation fails, check the team's agency_id:

```sql
-- Find Loryn's invitation
SELECT
  pi.email,
  pi.team_id,
  pi.office_id,
  t.name as team_name,
  t.agency_id as team_agency_id,
  CASE
    WHEN t.agency_id = pi.office_id THEN '✅ Match'
    ELSE '❌ Mismatch!'
  END as status
FROM pending_invitations pi
LEFT JOIN teams t ON t.id = pi.team_id
WHERE LOWER(pi.email) = 'loryn.darroch@example.com' -- ← Replace with actual email
ORDER BY pi.created_at DESC
LIMIT 1;
```

If it shows "❌ Mismatch!", fix it:

```sql
-- Update the team's agency_id to match office_id
UPDATE teams
SET agency_id = (
  SELECT office_id
  FROM pending_invitations
  WHERE team_id = teams.id
  LIMIT 1
)
WHERE id = 'TEAM_ID_FROM_ABOVE';
```

---

## Fix C: Duplicate Team Member

If she's already a team member:

```sql
-- Check if Loryn already has an account
SELECT
  p.id,
  p.email,
  p.full_name,
  p.office_id,
  (SELECT COUNT(*) FROM team_members WHERE user_id = p.id) as team_count
FROM profiles p
WHERE LOWER(p.email) = 'loryn.darroch@example.com'; -- ← Replace

-- If she exists, delete her and start fresh
DO $$
DECLARE
  user_id_to_delete UUID;
BEGIN
  SELECT id INTO user_id_to_delete
  FROM profiles
  WHERE LOWER(email) = 'loryn.darroch@example.com'; -- ← Replace

  IF user_id_to_delete IS NOT NULL THEN
    DELETE FROM team_members WHERE user_id = user_id_to_delete;
    DELETE FROM user_roles WHERE user_id = user_id_to_delete;
    DELETE FROM profiles WHERE id = user_id_to_delete;
    RAISE NOTICE 'Deleted user: %', user_id_to_delete;
  END IF;
END $$;
```

Then have her try accepting the invitation again.

---

## Fix D: Missing RLS Policies

If operations are being blocked, check RLS:

```sql
-- Check if RLS is blocking team_members insert
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'team_members';
```

If there are no INSERT policies for authenticated users, add one:

```sql
-- Allow authenticated users to insert themselves as team members
DROP POLICY IF EXISTS "Users can join teams via invitation" ON team_members;
CREATE POLICY "Users can join teams via invitation"
  ON team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
```

---

## Quick Debug: Browser Console

While we wait for Edge Function logs, have Loryn:

1. Press **F12** to open DevTools
2. Go to **Network** tab
3. Click "Accept" button
4. Find the `accept-invitation` request (will be red if failed)
5. Click on it → **Response** tab
6. **Copy the entire response** and send it to me!

It will look like:
```json
{
  "success": false,
  "code": "some_error_code",
  "message": "The actual error message here"
}
```

---

## What I Need From You

Please send me:
1. The **exact error message** from Edge Function logs, OR
2. The **Response** from browser DevTools, OR
3. A screenshot of the error she sees

Then I can give you the exact fix! 🎯
