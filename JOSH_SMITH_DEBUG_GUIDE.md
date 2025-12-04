# Josh Smith Invitation Error - Debug Guide

You're getting "Edge Function returned a non-2xx status code" when trying to invite Josh Smith. This guide will help you diagnose and fix the issue.

## Step 1: Run Diagnostic

First, let's see what data still exists for Josh Smith:

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run `diagnostic-josh-smith.sql`:

```sql
-- Copy and paste the contents of diagnostic-josh-smith.sql here
```

This will show you EXACTLY what exists for `josh.smith@raywhite.com` in:
- ✅ auth.users
- ✅ profiles
- ✅ pending_invitations
- ✅ user_roles
- ✅ team_members

## Step 2: Nuclear Delete (If Needed)

If the diagnostic shows ANY data still exists, run the nuclear delete:

1. In **SQL Editor**, run `nuclear-delete-josh.sql`
2. This will delete from ALL tables

**Important:** The SQL can't delete from `auth.users` - you must do that manually:

### Manual Auth Deletion:
1. Go to **Authentication** → **Users**
2. Search for: `josh.smith@raywhite.com`
3. Click **...** → **Delete User**
4. Confirm deletion

## Step 3: Verify Clean State

Run the diagnostic again - it should show:
```
✅✅✅ ALL CLEAR! Josh Smith is completely deleted.
```

## Step 4: Check Edge Function Logs

If deletion is complete but invitation still fails:

1. Go to **Edge Functions** → **invite-user** → **Logs**
2. Look for the error message
3. Common issues:

### Issue A: "Platform admins must specify an office"
**Fix:** Make sure you selected an office in the invite form (required field)

### Issue B: "Invalid team: team does not belong to the specified office"
**Fix:** The team you selected doesn't belong to the selected office. Either:
- Choose a different team that belongs to that office
- Leave team blank (personal team will be created)

### Issue C: "Rate limit exceeded"
**Fix:** Wait 1 hour and try again (rate limit: 10 invitations/hour)

### Issue D: Database constraint violation
**Fix:** Run diagnostic again - there's still conflicting data

## Step 5: Retry Invitation

After confirming Josh Smith is completely deleted:

1. Go to **Platform Admin** → **Invite User**
2. Fill in:
   - **Email:** josh.smith@raywhite.com
   - **Full Name:** Josh Smith
   - **Role:** Team Leader (or whatever role)
   - **Office:** Select "Todd & Josh" office (or appropriate office) ← **REQUIRED**
   - **Team Assignment:** Select "Todd & Josh" team OR leave empty for personal team
3. Click **Send Invitation**

Should work! ✅

---

## Debugging Tips

### Check Browser Console
1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Try sending invitation
4. Look for error messages

### Check Network Tab
1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Try sending invitation
4. Find the `invite-user` request
5. Click on it → **Response** tab
6. See the exact error message from server

### Common Error Messages:

| Error | Cause | Fix |
|-------|-------|-----|
| "Platform admins must specify an office" | Office not selected | Select office dropdown |
| "Invalid team: team does not exist" | Team ID invalid | Choose different team or leave empty |
| "Team does not belong to office" | Wrong team for office | Choose team from selected office |
| "User already exists" | Profile still exists | Run nuclear delete |
| "This user has already been invited" | Pending invitation exists | Run nuclear delete |
| "Rate limit exceeded" | Too many invitations | Wait 1 hour |

---

## Files in This Repo:

1. **diagnostic-josh-smith.sql** - Check what exists
2. **nuclear-delete-josh.sql** - Delete everything
3. **emergency-delete-josh.sql** - Alternative deletion script
4. **DELETE_JOSH_SMITH.md** - Original deletion guide
5. **scripts/delete-josh-smith.ts** - Automated Node.js deletion

---

## Still Not Working?

If you've done all the above and it still fails:

### Check RLS Policies

The `pending_invitations` table might have RLS policies blocking inserts:

```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'pending_invitations';
```

### Check Database Constraints

```sql
-- Check unique constraints
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'pending_invitations'::regclass;
```

### Get Service Role Key & Check Directly

Test the Edge Function directly with curl:

```bash
curl -X POST 'https://mxsefnpxrnamupatgrlb.supabase.co/functions/v1/invite-user' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "josh.smith@raywhite.com",
    "role": "team_leader",
    "fullName": "Josh Smith",
    "officeId": "OFFICE_UUID_HERE",
    "teamId": "TEAM_UUID_HERE"
  }'
```

This will show the exact server response.

---

## Need More Help?

Contact me with:
1. Output from diagnostic script
2. Edge Function logs (last 10 lines)
3. Browser console errors
4. Network tab response

Good luck! 🚀
