# Beacon Integration Migration Strategy

## 📋 Current State Analysis

### Existing Integration (OLD)

#### **Hooks:**
1. **`src/hooks/useBeaconIntegration.ts`** (200+ lines)
   - `createBeaconReport()` - Creates reports via Supabase Edge Function
   - `connectToBeacon()` - Enables integration
   - `disconnectBeacon()` - Disables integration
   - `syncTeamToBeacon()` - Syncs team data
   - Uses `integration_settings` table

2. **`src/hooks/useBeaconReports.ts`** (138 lines)
   - Fetches reports from `beacon_reports` table
   - Supports both `appraisal_id` and `property_id` queries
   - Returns aggregate stats

3. **`src/hooks/useBeaconEngagementEvents.ts`**
   - Tracks engagement events

4. **`src/hooks/useBeaconSubscription.ts`**
   - Subscription/credit management

#### **Components:**
- `BeaconTab.tsx` - Main integration UI in appraisals
- `BeaconReportButton.tsx` - Create/view report button
- `BeaconEngagementPanel.tsx` - Engagement metrics
- `BeaconStatusIndicator.tsx` - Status badge
- `BeaconDevTools.tsx` - Developer tools
- `BeaconImportWizard.tsx` - Import wizard
- `LinkBeaconReportDialog.tsx` - Link existing reports
- `BeaconPropertyTab.tsx` - Property-level integration
- `BeaconDeveloperToolsCard.tsx` - Settings card

#### **Database:**
- `integration_settings` table (team_id, integration_name, enabled)
- `beacon_reports` table (has both appraisal_id AND property_id)
- `properties.beacon_property_slug` field

#### **API Integration:**
- Uses **Supabase Edge Functions**:
  - `sync-beacon-team` - Syncs team to Beacon
  - `create-report` - Creates Beacon reports
- Edge functions make actual Beacon API calls

---

### New Integration Module (NEW)

#### **Files Created:**
1. **`src/types/beacon.ts`** (857 lines) - Complete type system
2. **`src/lib/beacon/validation.ts`** (831 lines) - Validation layer
3. **`src/lib/beacon/client.ts`** (970 lines) - Direct API client
4. **`src/hooks/useBeacon.ts`** (746 lines) - React hooks
5. **`src/lib/beacon/index.ts`** (67 lines) - Barrel exports
6. **`supabase/migrations/20251213194248_*.sql`** (681 lines) - New schema

#### **Database:**
- `team_integrations` table (replaces integration_settings)
- `beacon_property_links` table (new - property mapping)
- `beacon_reports` table (new structure with agentbuddy_property_id)
- `beacon_webhook_events` table (new - event log)

#### **API Integration:**
- **Direct Beacon API calls** from client
- No Edge Functions needed for basic operations
- Client handles retry logic, auth, validation

---

## 🔄 Key Differences

| Feature | OLD (Current) | NEW (Module) |
|---------|---------------|--------------|
| **Database** | `integration_settings` | `team_integrations` |
| **Reports Table** | Uses both `appraisal_id` and `property_id` | Uses only `agentbuddy_property_id` |
| **API Calls** | Via Supabase Edge Functions | Direct to Beacon API |
| **Property ID** | Stored in `properties.beacon_property_slug` | Stored in `beacon_property_links` table |
| **Validation** | Minimal | Comprehensive validation layer |
| **Error Handling** | Basic toast messages | BeaconIntegrationError with suggestions |
| **Retry Logic** | None (relies on Edge Function) | Exponential backoff |
| **Webhooks** | No webhook handling | `beacon_webhook_events` table |
| **Type Safety** | Limited types | Complete TypeScript type system |

---

## 🎯 Migration Strategy

### Phase 1: Database Migration ✅ READY

**Goal:** Run new database migration alongside existing tables

**Tasks:**
1. ✅ Migration file created: `20251213194248_84b8ad5a-a480-4abb-bfed-5460a23cd771.sql`
2. Run migration in Supabase (creates new tables, doesn't touch old ones)
3. Migrate data from `integration_settings` → `team_integrations`
4. Keep old tables for backward compatibility during transition

**SQL to migrate integration settings:**
```sql
-- Migrate existing integration settings to new team_integrations table
INSERT INTO team_integrations (
  team_id,
  integration_name,
  enabled,
  created_at,
  updated_at
)
SELECT
  team_id,
  integration_name,
  enabled,
  connected_at as created_at,
  updated_at
FROM integration_settings
WHERE integration_name = 'beacon'
ON CONFLICT (team_id, integration_name) DO UPDATE
SET enabled = EXCLUDED.enabled;
```

---

### Phase 2: Gradual Hook Migration

**Strategy:** Create wrapper hooks that use new module but maintain old API

#### **Step 1: Create Compatibility Layer**

Create `src/hooks/useBeaconIntegration.compat.ts`:

```typescript
/**
 * Compatibility wrapper for legacy useBeaconIntegration
 * Uses new Beacon module internally but maintains old API
 */
import {
  useBeaconClient,
  useIsBeaconEnabled,
  useCreateBeaconReport as useNewCreateReport,
} from '@/lib/beacon';

export const useBeaconIntegration = () => {
  const { isInitialized } = useBeaconClient();
  const isBeaconEnabled = useIsBeaconEnabled();
  const newCreateReport = useNewCreateReport();

  // Map old createBeaconReport API to new one
  const createBeaconReport = {
    mutate: ({ appraisalId, reportType }: any) => {
      // Convert appraisal to property
      // This requires fetching appraisal to get property_id
      // TODO: Implement conversion
    },
    mutateAsync: async ({ appraisalId, reportType }: any) => {
      // Same conversion logic
    },
    isPending: newCreateReport.isPending,
  };

  return {
    isBeaconEnabled,
    isLoadingSettings: !isInitialized,
    createBeaconReport,
    // Other methods...
  };
};
```

#### **Step 2: Update Components Gradually**

**Option A: Keep using old hooks** (easiest)
- Old components continue working
- New components use new hooks
- No breaking changes

**Option B: Migrate component by component** (recommended)
- Update one component at a time
- Test thoroughly
- Lower risk

**Option C: Big bang migration** (risky)
- Replace all at once
- Highest risk but fastest

---

### Phase 3: Component Migration Priority

**Priority 1 (High Impact):**
1. `BeaconReportButton.tsx` - Most used component
2. `BeaconTab.tsx` - Main integration UI
3. `IntegrationsTab.tsx` - Settings

**Priority 2 (Medium Impact):**
4. `BeaconPropertyTab.tsx` - Property-level UI
5. `BeaconEngagementPanel.tsx` - Metrics display

**Priority 3 (Low Impact):**
6. `BeaconDevTools.tsx` - Developer tools
7. `BeaconImportWizard.tsx` - Occasional use
8. Other Beacon components

---

### Phase 4: Edge Function Deprecation

**Current Edge Functions:**
- `sync-beacon-team` - Team sync
- `create-report` - Report creation

**Migration Plan:**
1. Keep Edge Functions for backward compatibility
2. Update Edge Functions to call new BeaconClient internally
3. Gradually move components to direct client usage
4. Deprecate Edge Functions after full migration
5. Remove Edge Functions after 30-day grace period

**Updated Edge Function (example):**
```typescript
// supabase/functions/create-report/index.ts
import { beaconClient } from '@/lib/beacon/client';

Deno.serve(async (req) => {
  const { appraisalId, reportType } = await req.json();

  // Convert appraisal to property (temporary compatibility)
  const property = await getPropertyFromAppraisal(appraisalId);

  // Use new client
  await beaconClient.initialize(property.team_id);
  const result = await beaconClient.createReport({
    agentbuddy_property_id: property.id,
    report_type: reportType,
  });

  return new Response(JSON.stringify(result));
});
```

---

## 📝 Detailed Migration Checklist

### Database Migration
- [ ] Run new migration in Supabase
- [ ] Verify all tables created successfully
- [ ] Migrate `integration_settings` → `team_integrations`
- [ ] Verify RLS policies work
- [ ] Test helper functions

### Hook Migration
- [ ] Create compatibility wrapper for `useBeaconIntegration`
- [ ] Create compatibility wrapper for `useBeaconReports`
- [ ] Update `useBeacon.ts` to export compatibility wrappers
- [ ] Test old components still work

### Component Migration (by priority)
- [ ] Update `BeaconReportButton.tsx`
- [ ] Update `BeaconTab.tsx`
- [ ] Update `IntegrationsTab.tsx`
- [ ] Update `BeaconPropertyTab.tsx`
- [ ] Update `BeaconEngagementPanel.tsx`
- [ ] Update remaining components

### Edge Function Updates
- [ ] Update `sync-beacon-team` to use BeaconClient
- [ ] Update `create-report` to use BeaconClient
- [ ] Add deprecation warnings to Edge Functions
- [ ] Document migration timeline

### Testing
- [ ] Test integration enable/disable
- [ ] Test report creation
- [ ] Test report viewing
- [ ] Test property linking
- [ ] Test webhook processing
- [ ] Test error handling
- [ ] Load test with real data

### Documentation
- [ ] Update component documentation
- [ ] Update integration docs
- [ ] Create migration guide for team
- [ ] Update API reference

### Deployment
- [ ] Deploy to staging
- [ ] Test in staging
- [ ] Deploy to production
- [ ] Monitor error logs
- [ ] Gather feedback

---

## 🚨 Critical Considerations

### 1. Property ID Strategy

**CRITICAL:** The existing code uses BOTH `appraisal_id` AND `property_id`:

```typescript
// OLD CODE - beacon_reports table
{
  appraisal_id: string;  // ❌ Transient - changes when converted to listing
  property_id: string;   // ✓ Stable - but optional
}

// NEW CODE - beacon_reports table
{
  agentbuddy_property_id: string;  // ✓ Stable - REQUIRED
}
```

**Migration Strategy:**
1. Add `agentbuddy_property_id` column to existing `beacon_reports` table
2. Backfill from `property_id` where available
3. For records with only `appraisal_id`, look up corresponding property
4. Make `agentbuddy_property_id` required after backfill

**Backfill SQL:**
```sql
-- Backfill agentbuddy_property_id from property_id
UPDATE beacon_reports
SET agentbuddy_property_id = property_id
WHERE property_id IS NOT NULL;

-- Backfill from appraisal_id lookup
UPDATE beacon_reports br
SET agentbuddy_property_id = la.property_id
FROM logged_appraisals la
WHERE br.appraisal_id = la.id
AND br.agentbuddy_property_id IS NULL;
```

### 2. Beacon Property Slug

**OLD:** Stored in `properties.beacon_property_slug`
**NEW:** Stored in `beacon_property_links.beacon_property_slug`

**Migration:**
```sql
-- Migrate beacon_property_slug to beacon_property_links
INSERT INTO beacon_property_links (
  agentbuddy_property_id,
  beacon_property_slug,
  team_id,
  created_at
)
SELECT
  p.id as agentbuddy_property_id,
  p.beacon_property_slug,
  p.team_id,
  NOW() as created_at
FROM properties p
WHERE p.beacon_property_slug IS NOT NULL
ON CONFLICT (agentbuddy_property_id, team_id) DO NOTHING;
```

### 3. Webhook Handling

**NEW FEATURE:** The new module supports webhooks via `beacon_webhook_events` table.

**Setup Required:**
1. Configure webhook URL in Beacon dashboard
2. Create webhook handler endpoint
3. Validate webhook signatures
4. Process events and update local data

**Webhook Handler (example):**
```typescript
// src/pages/api/webhooks/beacon.ts
import { validateWebhookPayload } from '@/lib/beacon';
import { supabase } from '@/integrations/supabase/client';

export async function POST(req: Request) {
  const payload = await req.json();

  // Validate payload structure
  validateWebhookPayload(payload);

  // Store in webhook events table
  await supabase.from('beacon_webhook_events').insert({
    event_type: payload.event,
    event_id: payload.event_id,
    payload: payload,
    processed: false,
  });

  // Process event asynchronously
  // (trigger background job)

  return new Response('OK', { status: 200 });
}
```

---

## 📊 Migration Timeline Recommendation

### Week 1: Database Migration
- Run migration in staging
- Test new tables
- Migrate data
- Verify RLS policies

### Week 2: Hook Compatibility
- Create compatibility wrappers
- Test old components still work
- Update documentation

### Week 3: Component Migration (Priority 1)
- Migrate BeaconReportButton
- Migrate BeaconTab
- Migrate IntegrationsTab
- Test thoroughly

### Week 4: Component Migration (Priority 2 & 3)
- Migrate remaining components
- Update Edge Functions
- Add deprecation warnings

### Week 5: Testing & Deployment
- Comprehensive testing
- Deploy to staging
- Monitor for issues
- Deploy to production

### Week 6: Cleanup
- Remove compatibility wrappers
- Deprecate Edge Functions
- Update documentation
- Celebrate! 🎉

---

## 🔧 Recommended Approach

### Option 1: Gradual Migration (RECOMMENDED)

**Pros:**
- Low risk
- Can test incrementally
- Easy rollback
- No breaking changes

**Cons:**
- Takes longer
- Maintains duplicate code temporarily

**Steps:**
1. Run database migration
2. Create compatibility wrappers
3. Migrate components one by one
4. Remove old code after full migration

### Option 2: Parallel Systems

**Pros:**
- Old system keeps working
- New system available for new features
- Lower risk

**Cons:**
- Duplicate code
- Two systems to maintain
- Confusing for developers

**Steps:**
1. Keep old integration as-is
2. Use new module for new features only
3. Gradually migrate old features
4. Remove old system after migration

### Option 3: Big Bang Migration

**Pros:**
- Fast completion
- Clean codebase immediately
- No duplicate code

**Cons:**
- High risk
- Requires extensive testing
- Potential for bugs

**Steps:**
1. Run database migration
2. Update all components at once
3. Deploy and hope for the best
4. Fix issues as they arise

---

## 🎯 Next Steps

1. **Review this migration strategy** with the team
2. **Choose migration approach** (recommend Option 1)
3. **Run database migration** in staging
4. **Create compatibility wrappers** for gradual migration
5. **Test thoroughly** before production deployment
6. **Document everything** for future reference

---

## 📞 Need Help?

Refer to:
- `src/lib/beacon/README.md` - Complete documentation
- This migration strategy
- Test component at `src/components/test/BeaconIntegrationTest.tsx`
