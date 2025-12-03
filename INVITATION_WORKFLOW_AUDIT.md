# User Invitation Workflow Audit - All Entry Points

## 🔍 Current State Analysis

### Invitation Entry Points

1. **Platform Admin** → `/platform-admin/users/invite` → `InviteUserPlatform.tsx` → **❌ PLACEHOLDER ONLY**
2. **Office Manager** → `/invite` → `InviteUser.tsx` → **✅ WORKING**
3. **Team Leader** → `/invite` → `InviteUser.tsx` → **✅ WORKING**

---

## 🚨 CRITICAL ISSUES IDENTIFIED

### Issue #1: Platform Admin Has No Invite UI
**Severity**: 🔴 **CRITICAL**
**Location**: `/src/pages/platform-admin/InviteUserPlatform.tsx`

**Problem**:
- File is just a placeholder with "under development" message
- Platform admins cannot invite users through the UI
- They would need to use the office manager page (wrong context)

**Impact**:
- Platform admins can't onboard new office managers
- New offices can't get their first admin user
- Inconsistent UX across roles

---

### Issue #2: Office/Team Validation Inconsistency
**Severity**: 🟠 **HIGH**
**Location**: Multiple files

**Problem**:
```typescript
// InviteUser.tsx (lines 42-54)
// Auto-assigns office/team BUT team leader can still select different teams!
if (isTeamLeader && team?.id && !selectedTeamId) {
  setSelectedTeamId(team.id);  // Auto-sets team
}
// But dropdown is only disabled IF selectedTeamId exists
disabled={isTeamLeader && !!selectedTeamId}  // Can be changed before auto-set
```

**Edge Case**:
1. Team leader opens invite page
2. Before auto-set completes, they select a different team
3. User gets invited to wrong team
4. `invite-user` function validates team belongs to office (line 88-111)
5. But doesn't validate team leader has permission for THAT team

**Impact**:
- Team leaders could invite users to other teams in their office
- Users end up on wrong teams
- Breaks team isolation

---

### Issue #3: Office Selection Disabled But Not Enforced
**Severity**: 🟠 **HIGH**
**Location**: `InviteUser.tsx` (lines 211-234)

**Problem**:
```typescript
// Office dropdown for Office Managers
<Select
  value={selectedOfficeId}
  onValueChange={setSelectedOfficeId}
  disabled={!isPlatformAdmin && !!selectedOfficeId}  // Only disabled if value set
>
```

**Edge Cases**:
1. If `profile.office_id` is NULL (orphaned profile), dropdown not disabled
2. Office manager could select ANY office
3. Backend validates team belongs to office, but not that inviter belongs to office
4. Malicious office manager could invite users to other offices

**Impact**:
- Cross-office invitation attacks
- Users trapped in wrong offices
- Data leakage between offices

---

### Issue #4: Team Can Be Left Empty (No Team Assignment)
**Severity**: 🟡 **MEDIUM**
**Location**: `InviteUser.tsx` + `accept-invitation/index.ts`

**Current Flow**:
```typescript
// Frontend allows "No team" selection
<SelectItem value="">No team</SelectItem>

// Backend (accept-invitation, line 252-270)
if (!assignedTeamId && invitation.office_id) {
  // Creates personal team via ensure_personal_team
  assignedTeamId = personalTeamId;
}
```

**Problem**:
- Personal teams created automatically (might not be desired)
- Inconsistent behavior: sometimes users get personal teams, sometimes not
- Personal teams clutter the teams list
- Users expect to be added to actual teams, not solo teams

**Impact**:
- Confusing UX (user thinks they're team-less but they have a "personal team")
- Data scoping issues (personal team = solo agent, but they might need team data)
- Hard to manage teams when half are "personal" and half are real

---

### Issue #5: No Validation of Inviter's Context
**Severity**: 🔴 **CRITICAL**
**Location**: `invite-user/index.ts`

**Missing Validation**:
```typescript
// Current code validates:
✅ Team exists (line 89-100)
✅ Team belongs to office (line 103-110)
✅ Inviter has role permission (line 218-227)

// But DOES NOT validate:
❌ Team leader actually belongs to the team they're inviting to
❌ Office manager actually belongs to the office they're inviting to
❌ Inviter's office matches the invitation's office
```

**Attack Scenario**:
1. Malicious team leader at Office A
2. Discovers team ID from Office B (e.g., via API)
3. Sends invite with `officeId: B, teamId: X`
4. Backend validates team X belongs to office B ✅
5. But doesn't check team leader is in office B ❌
6. User gets added to Office B's team

**Impact**:
- SECURITY VULNERABILITY
- Cross-office contamination
- Users trapped in offices they shouldn't access
- Data breach potential

---

### Issue #6: Incomplete Profile Validation
**Severity**: 🟡 **MEDIUM**
**Location**: `accept-invitation/index.ts` (lines 388-415)

**Current Validation**:
```typescript
// Validates AFTER team assignment
if (!finalProfile.office_id || !finalProfile.primary_team_id) {
  return error('Profile incomplete');
}
```

**Problems**:
- Validation happens late (after many operations)
- If validation fails, user has partial profile
- No rollback of previous operations
- User stuck in limbo state

**Impact**:
- Orphaned profiles
- Incomplete user records
- Manual cleanup required

---

### Issue #7: Race Condition in Auto-Assignment
**Severity**: 🟡 **MEDIUM**
**Location**: `InviteUser.tsx` (useEffect, lines 42-54)

**Problem**:
```typescript
useEffect(() => {
  if (!isPlatformAdmin) {
    if (profile?.office_id && !selectedOfficeId) {
      setSelectedOfficeId(profile.office_id);  // Async state update
    }
    if (isTeamLeader && team?.id && !selectedTeamId) {
      setSelectedTeamId(team.id);  // Async state update
    }
  }
}, [profile?.office_id, team?.id, ...]);
```

**Race Condition**:
1. Component mounts
2. User immediately selects team (before useEffect runs)
3. useEffect runs, overwrites user's selection
4. User confused, invitation goes to wrong team

**Impact**:
- User frustration
- Wrong team assignments
- Hard to reproduce bug

---

## 🎯 ROOT CAUSE ANALYSIS

All issues stem from **3 architectural problems**:

### 1. **Frontend-Driven Context Assignment**
- Frontend decides office/team based on user's profile
- No server-side validation of inviter's context
- Trusts client to send correct values

### 2. **Missing Authorization Layer**
- Backend validates data exists (team, office)
- But doesn't validate inviter's **permission** for that context
- No "can this user invite to THIS specific team/office?" check

### 3. **Inconsistent Personal Team Logic**
- Sometimes creates personal teams, sometimes doesn't
- No clear rules for when personal teams are appropriate
- Mixed with real team logic

---

## 💡 PROPOSED SOLUTION: Uniform Invitation Workflow

### Principle: **Server-Side Context Derivation**

Instead of frontend sending `officeId` and `teamId`, server should derive them from:
1. Inviter's profile and roles
2. The invitation hierarchy
3. Explicit overrides (platform admins only)

### New Workflow Design

#### Step 1: Frontend Simplification

**Platform Admin**:
```typescript
// Can select ANY office, ANY team
<Select office /> // Full list
<Select team />   // Filtered by selected office
```

**Office Manager**:
```typescript
// Office auto-derived from their profile (server-side)
// Can select teams in their office
<Select team />  // Only teams in their office
// Office field is READ-ONLY display
```

**Team Leader**:
```typescript
// Both office and team auto-derived (server-side)
// NO selection dropdowns
<Alert>New member will be added to: {team.name} ({office.name})</Alert>
```

#### Step 2: Backend Validation

```typescript
// invite-user/index.ts
async function determineInvitationContext(inviter, explicitOfficeId?, explicitTeamId?) {
  const inviterRoles = await getInviterRoles(inviter.id);
  const inviterProfile = await getInviterProfile(inviter.id);

  let officeId, teamId;

  if (inviterRoles.includes('platform_admin')) {
    // Platform admins can specify any office/team
    if (!explicitOfficeId) {
      throw new Error('Platform admins must specify an office');
    }
    officeId = explicitOfficeId;
    teamId = explicitTeamId; // Optional

  } else if (inviterRoles.includes('office_manager')) {
    // Office managers inherit their office, can specify team
    officeId = inviterProfile.office_id;
    if (!officeId) {
      throw new Error('Office manager profile missing office');
    }

    // Validate explicit team belongs to their office
    if (explicitTeamId) {
      const team = await getTeam(explicitTeamId);
      if (team.agency_id !== officeId) {
        throw new Error('Cannot invite to team outside your office');
      }
      teamId = explicitTeamId;
    }

  } else if (inviterRoles.includes('team_leader')) {
    // Team leaders inherit both office and team
    officeId = inviterProfile.office_id;
    teamId = inviterProfile.primary_team_id;

    if (!officeId || !teamId) {
      throw new Error('Team leader profile incomplete');
    }

    // Ignore any explicit values (security)
    if (explicitTeamId && explicitTeamId !== teamId) {
      console.warn('Team leader attempted to invite to different team');
    }
  }

  return { officeId, teamId };
}
```

#### Step 3: Remove Personal Team Auto-Creation

**New Rule**: Teams must be explicit

```typescript
// accept-invitation/index.ts
// REMOVE automatic personal team creation
if (!invitation.team_id) {
  // Don't create personal team
  // User profile created with office_id but NO primary_team_id
  // Office manager must assign them to a team post-onboarding
  console.log('User invited without team - pending team assignment');
}
```

**Benefits**:
- Cleaner team structure
- No cluttered team lists
- Office managers explicitly decide team assignment
- Matches the migration we already created (team_id optional)

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 1: Fix Platform Admin UI (CRITICAL)
- [ ] Create proper `InviteUserPlatform.tsx` component
- [ ] Allow office and team selection
- [ ] Use same `useInvitations` hook
- [ ] Match styling of `InviteUser.tsx`

### Phase 2: Add Server-Side Context Validation
- [ ] Create `determineInvitationContext()` function
- [ ] Add to `invite-user/index.ts`
- [ ] Add to `invite-user-magic/index.ts`
- [ ] Validate inviter belongs to office/team they're inviting to

### Phase 3: Simplify Frontend Context
- [ ] Office Manager: Remove office dropdown (display only)
- [ ] Team Leader: Remove all dropdowns (display only)
- [ ] Platform Admin: Keep full control
- [ ] Add clear context indicators

### Phase 4: Remove Personal Team Auto-Creation
- [ ] Update `accept-invitation/index.ts`
- [ ] Update `complete-profile-magic/index.ts`
- [ ] Don't call `ensure_personal_team` automatically
- [ ] Create separate "assign to team" flow for office managers

### Phase 5: Add Post-Onboarding Team Assignment
- [ ] Create UI for office managers to assign users to teams
- [ ] Show users pending team assignment
- [ ] Send notification when assigned

---

## 🎯 EXPECTED OUTCOMES

After implementation:

✅ **Uniform Workflow**: All invitation paths consistent
✅ **No Cross-Office Contamination**: Server validates inviter's context
✅ **No Wrong Team Assignments**: Team leaders can only invite to their team
✅ **Platform Admins Have UI**: Proper invitation page exists
✅ **Clear Team Structure**: No automatic personal teams
✅ **Better Security**: Server-side authorization

---

## 🚨 TEMPORARY MITIGATIONS (Do Now)

While implementing the full solution:

1. **Disable Platform Admin Invite Link** until UI is built
2. **Add Warning** to team leader invite page: "Users will be added to YOUR team"
3. **Add Server-Side Check** in invite-user:
   ```typescript
   // Quick fix: Validate inviter's office matches invitation office
   if (!isPlatformAdmin && inviter.office_id !== invitationOfficeId) {
     throw new Error('Cannot invite to different office');
   }
   ```

---

Would you like me to implement this uniform workflow?
