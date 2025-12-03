# Complete Deletion of Josh Smith

This guide provides multiple methods to completely delete Josh Smith (josh.smith@raywhite.com) from the platform.

## ⚠️ Warning

This is a **HARD DELETE** - all data will be permanently removed and cannot be recovered.

---

## Method 1: Via Supabase Dashboard (Recommended - Easiest)

### Step 1: Find Josh Smith's User ID

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/mxsefnpxrnamupatgrlb
2. Navigate to **Authentication** → **Users**
3. Search for `josh.smith@raywhite.com`
4. Copy his User ID (UUID)

### Step 2: Delete from Database Tables

1. Go to **Table Editor** → **SQL Editor**
2. Run this SQL (replace `USER_ID_HERE` with Josh's actual UUID):

```sql
-- Replace USER_ID_HERE with Josh's actual user ID
DO $$
DECLARE
  target_user_id UUID := 'USER_ID_HERE';
  target_email TEXT := 'josh.smith@raywhite.com';
BEGIN
  RAISE NOTICE 'Deleting user: % (%)', target_email, target_user_id;

  -- Delete from user_roles
  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  RAISE NOTICE 'Deleted from user_roles';

  -- Delete from team_members
  DELETE FROM public.team_members WHERE user_id = target_user_id;
  RAISE NOTICE 'Deleted from team_members';

  -- Delete from profiles
  DELETE FROM public.profiles WHERE id = target_user_id;
  RAISE NOTICE 'Deleted from profiles';

  -- Delete from pending_invitations
  DELETE FROM public.pending_invitations WHERE LOWER(email) = LOWER(target_email);
  RAISE NOTICE 'Deleted from pending_invitations';

  RAISE NOTICE 'Database cleanup complete';
END $$;
```

### Step 3: Delete from Auth

1. Go back to **Authentication** → **Users**
2. Find Josh Smith again
3. Click the **...** menu → **Delete User**
4. Confirm deletion

**Done!** Josh Smith has been completely removed.

---

## Method 2: Via SQL Only (Quick)

If you don't have the user ID, run this in **SQL Editor**:

```sql
DO $$
DECLARE
  target_email TEXT := 'josh.smith@raywhite.com';
  target_user_id UUID;
BEGIN
  RAISE NOTICE 'Starting deletion for: %', target_email;

  -- Find user ID from auth.users
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(target_email);

  IF target_user_id IS NOT NULL THEN
    RAISE NOTICE 'Found user ID: %', target_user_id;

    -- Delete from user_roles
    DELETE FROM public.user_roles WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted from user_roles';

    -- Delete from team_members
    DELETE FROM public.team_members WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted from team_members';

    -- Delete from profiles
    DELETE FROM public.profiles WHERE id = target_user_id;
    RAISE NOTICE 'Deleted from profiles';

    RAISE NOTICE 'Database cleanup complete. You must still delete from auth.users manually.';
    RAISE NOTICE 'User ID to delete: %', target_user_id;
  ELSE
    RAISE NOTICE 'No user found in auth.users';
  END IF;

  -- Delete from pending_invitations (by email)
  DELETE FROM public.pending_invitations WHERE LOWER(email) = LOWER(target_email);
  RAISE NOTICE 'Deleted from pending_invitations';

  RAISE NOTICE 'Complete! Remember to delete auth user via dashboard: %', target_user_id;
END $$;
```

After running this, manually delete from Authentication → Users (as shown in Method 1 Step 3).

---

## Method 3: Via Node.js Script (Most Automated)

If you want to automate everything:

### Prerequisites

1. Get your Service Role Key from Supabase Dashboard:
   - Settings → API → Service Role Key (secret)
2. Add it to `.env`:

```bash
echo 'SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"' >> .env
```

### Run the Script

```bash
npx ts-node scripts/delete-josh-smith.ts
```

This will:
- ✅ Find Josh Smith by email
- ✅ Delete from user_roles
- ✅ Delete from team_members
- ✅ Delete from profiles
- ✅ Delete from pending_invitations
- ✅ Delete from auth.users (complete removal)

---

## Verification

After deletion, verify Josh is gone:

```sql
-- Should return no results
SELECT * FROM auth.users WHERE email ILIKE '%josh.smith%';
SELECT * FROM public.profiles WHERE email ILIKE '%josh.smith%';
SELECT * FROM public.pending_invitations WHERE email ILIKE '%josh.smith%';
```

---

## Next Steps

After deletion, you can:

1. **Re-invite Josh Smith** with a fresh invitation
2. The invitation workflow is now fixed with proper validation
3. Josh's profile will be created cleanly without any legacy data

---

## What Gets Deleted

- ✅ **auth.users** - Complete auth removal
- ✅ **profiles** - User profile data
- ✅ **user_roles** - All role assignments
- ✅ **team_members** - Team memberships
- ✅ **pending_invitations** - Any pending invitations

## What Happens to Related Data

- **Teams**: If Josh owned a "personal team", it may remain orphaned (this is safe)
- **Audit logs**: Remain intact (for compliance)
- **Transactions/deals**: Remain intact (for business continuity)
