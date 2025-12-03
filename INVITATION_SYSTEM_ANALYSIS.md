# Invitation System Investigation & Fix Plan

## 🔍 Josh Smith's Case

**Email**: josh.smith@raywhite.com
**Profile ID**: 47a79f65-b882-45ee-9a33-84d0a3d350c9
**Status**: Profile was orphaned and archived (migration 20251119221013)

### What Happened:
1. Josh was invited to join AgentBuddy
2. His invitation likely had NULL for `office_id` due to the schema inconsistency
3. When he clicked the link and submitted the form, the `accept-invitation` function failed
4. His profile was created but became orphaned (no proper office/team assignment)
5. A cleanup migration archived his profile to prevent duplicate account issues

### Root Cause:
The `pending_invitations` table has **BOTH** `agency_id` and `office_id` columns:
- **Original schema**: Uses `agency_id` to reference agencies table
- **Migration 20251118042232**: Added `office_id` column (likely for consistency)
- **Problem**: Functions still query `agency_id`, but newer invitations may have NULL `agency_id`

---

## 🔴 CRITICAL ISSUES IDENTIFIED

### 1. Schema Inconsistency (CRITICAL)
**Current state**:
```sql
CREATE TABLE pending_invitations (
  agency_id UUID REFERENCES agencies(id),  -- Original column
  office_id UUID REFERENCES agencies(id)   -- Added later
  -- Both exist, causing confusion
);
```

**Functions behavior**:
- `invite-user/index.ts:42` → Selects `agency_id`
- `get-invitation-details/index.ts:37` → Selects `agency_id`, maps to `office_id` on line 86
- `accept-invitation/index.ts:42` → Selects `agency_id`, maps to `office_id` on line 47

**Impact**: Invitations created after 20251118042232 may have NULL `agency_id` if code was updated to use `office_id`

### 2. Missing `status` Column
**Problem**: The schema export shows no `status` column, but functions expect it:
- `accept-invitation/index.ts:61` → Checks `invitation.status !== 'pending'`
- `get-invitation-details/index.ts:50` → Checks `invitation.status === 'accepted'`

**Impact**: This will cause runtime errors when checking invitation validity

---

## 💡 MAGIC LINK APPROACH (RECOMMENDED)

### Why Magic Links Are Better:

✅ **Security**:
- Time-limited, single-use tokens (already built into Supabase)
- No password storage = no password leaks
- Tokens expire automatically

✅ **User Experience**:
- One-click signup (no password to remember)
- Faster onboarding (fewer form fields)
- Mobile-friendly (no typing passwords on phones)

✅ **Simpler Code**:
- Leverages Supabase native auth (less custom code)
- Fewer failure points (no password validation, hashing)
- Built-in email delivery tracking

✅ **Better for Invitations**:
- Admin pre-assigns role → User just confirms identity
- Invitation = Authorization (already approved by admin)
- No need for separate "accept invitation" flow

### Implementation Flow:

```
Current (Password-Based):
1. Admin invites → Record in pending_invitations
2. Email sent → Custom template with UUID token
3. User clicks → Frontend form (name, mobile, DOB, PASSWORD)
4. Submit → Backend creates auth user + profile
5. Frontend → Manual sign-in with password

Proposed (Magic Link):
1. Admin invites → Record in pending_invitations
2. Email sent → Supabase magic link (pre-authenticated)
3. User clicks → Auto sign-in (no password needed)
4. First-time setup → Form (name, mobile, DOB only)
5. Submit → Profile completed, role assigned
6. Redirect → Dashboard (already authenticated)
```

### Hybrid Approach (Best of Both):

```
1. Admin creates invitation → Store role, office (no team yet)
2. Send Supabase magic link → Include metadata: invitation_id, role, office_id
3. User clicks magic link → Supabase handles auth
4. On first login → Check for pending invitation in metadata
5. Show profile form → Name, mobile, DOB
6. Submit → Create profile, assign role, mark invitation accepted
7. Redirect to onboarding → Admin assigns team separately
```

---

## 🛠️ IMPLEMENTATION PLAN

### Phase 1: Fix Schema (IMMEDIATE)

**Option A: Standardize on `agency_id`** (Less breaking)
```sql
-- Drop the office_id column (it's redundant)
ALTER TABLE pending_invitations DROP COLUMN IF EXISTS office_id;

-- Keep using agency_id everywhere
-- Update migration 20251118042232 to be no-op
```

**Option B: Standardize on `office_id`** (More consistent with frontend)
```sql
-- Backfill office_id from agency_id
UPDATE pending_invitations
SET office_id = agency_id
WHERE office_id IS NULL;

-- Drop agency_id column
ALTER TABLE pending_invitations DROP COLUMN agency_id;

-- Update all functions to use office_id
```

**Recommendation**: Option B (use `office_id`) because:
- Frontend already calls them "offices" not "agencies"
- More intuitive for developers
- Aligns with domain language

### Phase 2: Add Missing `status` Column

```sql
-- Add status enum if not exists
DO $$ BEGIN
  CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'revoked', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add status column with default
ALTER TABLE pending_invitations
ADD COLUMN IF NOT EXISTS status invitation_status DEFAULT 'pending';

-- Backfill accepted invitations
UPDATE pending_invitations
SET status = 'accepted'
WHERE accepted_at IS NOT NULL;

-- Backfill expired invitations
UPDATE pending_invitations
SET status = 'expired'
WHERE expires_at < NOW() AND status = 'pending';
```

### Phase 3: Implement Magic Link Flow

**3.1 Update `invite-user` function**:
```typescript
// Instead of sending custom email with UUID token
// Use Supabase's inviteUserByEmail with metadata

const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
  email,
  {
    data: {
      invitation_id: invitationRecord.id,
      role: role,
      office_id: officeId,
      invited_by: inviterName
    },
    redirectTo: `${siteUrl}/onboarding/complete-profile`
  }
);
```

**3.2 Create `/onboarding/complete-profile` page**:
```typescript
// Check if user has pending invitation metadata
const user = await supabase.auth.getUser();
const invitationId = user.data.user?.user_metadata?.invitation_id;

if (invitationId) {
  // Fetch invitation details
  // Show profile completion form
  // On submit: create profile, assign role, mark invitation accepted
}
```

**3.3 Remove password requirement**:
- Delete password fields from AcceptInvitation form
- Remove password validation
- Simplify to: name, mobile, DOB only

### Phase 4: Decouple Team Assignment

**4.1 Make team_id optional in invitations**:
```sql
ALTER TABLE pending_invitations
ALTER COLUMN team_id DROP NOT NULL;
```

**4.2 Update `accept-invitation` logic**:
```typescript
// Don't create personal team automatically
// Just create profile with office_id and role
// primary_team_id can be NULL initially

if (!invitation.team_id) {
  // Create profile without team
  console.log('User will be assigned to team post-onboarding');
} else {
  // Assign to specified team
  await createTeamMembership(userId, invitation.team_id);
}
```

**4.3 Add post-onboarding team assignment**:
- Office managers can assign users to teams
- New UI: `/office-manager/assign-teams`
- RLS ensures users without teams have read-only access

### Phase 5: Invitation Management UI

**5.1 Create `/office-manager/invitations` page**:
- List all pending invitations
- Show status badges (pending, accepted, expired, revoked)
- Actions: Resend, Revoke, View Details

**5.2 Add resend functionality**:
```typescript
// Extend expiration + send new magic link
const { data, error } = await supabase.functions.invoke('resend-invitation', {
  body: { invitation_id }
});
```

**5.3 Add invitation activity log view**:
- Show all activity for an invitation
- Timestamps: created, sent, opened, accepted
- Error tracking: bounce, delivery failure

---

## 📋 MIGRATION SEQUENCE

```sql
-- Migration 1: Fix schema consistency
-- File: supabase/migrations/YYYYMMDDHHMMSS_fix_invitation_schema.sql

BEGIN;

-- Step 1: Backfill office_id from agency_id
UPDATE pending_invitations
SET office_id = agency_id
WHERE office_id IS NULL AND agency_id IS NOT NULL;

-- Step 2: For any invitations with office_id but not agency_id, backfill agency_id
UPDATE pending_invitations
SET agency_id = office_id
WHERE agency_id IS NULL AND office_id IS NOT NULL;

-- Step 3: Add status column if not exists
DO $$ BEGIN
  CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'revoked', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE pending_invitations
ADD COLUMN IF NOT EXISTS status invitation_status DEFAULT 'pending';

-- Step 4: Backfill status from accepted_at
UPDATE pending_invitations
SET status = 'accepted'
WHERE accepted_at IS NOT NULL AND status = 'pending';

UPDATE pending_invitations
SET status = 'expired'
WHERE expires_at < NOW() AND status = 'pending';

-- Step 5: Make team_id optional
ALTER TABLE pending_invitations
ALTER COLUMN team_id DROP NOT NULL;

COMMIT;
```

---

## ✅ NEXT STEPS

1. **Apply schema fix migration** (fixes Josh's issue retroactively)
2. **Update Edge Functions** to use consistent field names
3. **Implement magic link flow** (replaces password-based signup)
4. **Create invitation management UI** (for admins)
5. **Test end-to-end** with new invitation
6. **Re-invite Josh Smith** with working flow

---

## 🎯 RECOMMENDATION SUMMARY

**BEST APPROACH**: Magic Link + Simplified Flow

1. ✅ Use Supabase's native `inviteUserByEmail` (magic links)
2. ✅ Decouple team assignment from invitation (optional team)
3. ✅ Standardize on `office_id` (drop `agency_id`)
4. ✅ Add `status` column tracking
5. ✅ Build invitation management UI
6. ✅ Improve error handling with activity log

**Timeline**:
- Schema fixes: 30 minutes
- Magic link implementation: 2-3 hours
- UI for invitation management: 3-4 hours
- Testing + bug fixes: 2 hours
- **Total: ~1 day of work**

**Benefits**:
- ✅ Solves Josh's issue permanently
- ✅ Prevents future invitation failures
- ✅ Better security (no passwords)
- ✅ Simpler user experience
- ✅ Less code to maintain
- ✅ Leverages Supabase built-ins
