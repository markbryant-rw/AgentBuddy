# Beacon Integration Module

Complete Beacon API integration for AgentBuddy with type-safe client, validation layer, React hooks, and database tracking.

## 📋 Table of Contents

- [Quick Start Guide](#-quick-start-guide)
- [Usage Examples](#-usage-examples)
- [Architecture Overview](#-architecture-overview)
- [Testing Instructions](#-testing-instructions)
- [API Reference](#-api-reference)
- [Troubleshooting](#-troubleshooting)

---

## 🚀 Quick Start Guide

### 1. Prerequisites

- Node.js and npm installed
- Supabase project configured
- Beacon API account with API key

### 2. Environment Setup

Add the following environment variable to your `.env` file:

```bash
# Beacon API Configuration
VITE_BEACON_API_URL=https://api.beacon.com/v1
```

### 3. Database Migration

Run the Beacon integration migration in Supabase:

```bash
# In Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Run the migration file:
supabase/migrations/20251213194248_84b8ad5a-a480-4abb-bfed-5460a23cd771.sql

# OR via Supabase CLI:
supabase db push
```

This creates the following tables:
- `team_integrations` - Team-level integration configurations
- `beacon_property_links` - Links AgentBuddy properties to Beacon properties
- `beacon_reports` - Local tracking of Beacon reports
- `beacon_webhook_events` - Webhook event log

### 4. Configure Team Integration

In your team settings, add Beacon integration:

```sql
-- Insert Beacon configuration for your team
INSERT INTO team_integrations (
  team_id,
  integration_name,
  api_key,
  beacon_team_id,
  workspace_id,
  enabled
) VALUES (
  'your-team-id',
  'beacon',
  'your-beacon-api-key',
  'your-beacon-team-id',
  'your-workspace-id',
  true
);
```

### 5. Start Using the Integration

```tsx
import { useIsBeaconEnabled, useCreateBeaconReport } from '@/lib/beacon';

function MyComponent() {
  const isEnabled = useIsBeaconEnabled();

  if (!isEnabled) {
    return <SetupIntegrationPrompt />;
  }

  return <BeaconFeatures />;
}
```

---

## 💡 Usage Examples

### Example 1: Check Integration Status

```tsx
import { useIsBeaconEnabled, useBeaconIntegration } from '@/lib/beacon';

function IntegrationStatusBadge() {
  const isEnabled = useIsBeaconEnabled();
  const { data: stats } = useBeaconIntegration();

  if (!isEnabled) {
    return <Badge variant="secondary">Beacon: Disabled</Badge>;
  }

  return (
    <Badge variant="default">
      Beacon: {stats?.total_reports || 0} Reports
    </Badge>
  );
}
```

### Example 2: Create a Report

```tsx
import { useCreateBeaconReport } from '@/lib/beacon';
import { Button } from '@/components/ui/button';

function CreateCMAButton({ property }) {
  const createReport = useCreateBeaconReport();

  const handleCreateReport = async () => {
    await createReport.mutateAsync({
      // ✓ CORRECT - Use property.id from properties table
      agentbuddy_property_id: property.id,
      report_type: 'cma',
      delivery_method: 'email',
      recipient_email: property.owner_email,
      options: {
        include_comparables: true,
        comparable_count: 5,
        include_photos: true,
        include_market_stats: true,
      }
    });
  };

  return (
    <Button
      onClick={handleCreateReport}
      disabled={createReport.isPending}
    >
      {createReport.isPending ? 'Creating...' : 'Create CMA Report'}
    </Button>
  );
}
```

### Example 3: Display Property Reports

```tsx
import { usePropertyBeaconReports, useHasBeaconReports } from '@/lib/beacon';
import { Card } from '@/components/ui/card';

function PropertyReportsSection({ property }) {
  const { data, isLoading } = usePropertyBeaconReports(property.id);
  const hasReports = useHasBeaconReports(property.id);

  if (isLoading) return <Spinner />;

  if (!hasReports) {
    return <EmptyState message="No reports created yet" />;
  }

  return (
    <div>
      <h3>Beacon Reports ({data.reports.length})</h3>
      {data.reports.map(report => (
        <Card key={report.id}>
          <h4>{report.type}</h4>
          <p>Status: {report.status}</p>
          {report.report_url && (
            <a href={report.report_url} target="_blank">
              View Report
            </a>
          )}
        </Card>
      ))}
    </div>
  );
}
```

### Example 4: Search Reports with Filters

```tsx
import { useBeaconReports } from '@/lib/beacon';

function ReportsListWithFilters() {
  const { data, isLoading } = useBeaconReports({
    status: 'completed',
    report_type: 'cma',
    page: 1,
    per_page: 20,
    sort_by: 'created_at',
    sort_order: 'desc'
  });

  if (isLoading) return <Loading />;

  return (
    <div>
      {data.reports.map(report => (
        <ReportCard key={report.id} report={report} />
      ))}
      <Pagination {...data.pagination} />
    </div>
  );
}
```

### Example 5: Update Report Status

```tsx
import { useUpdateBeaconReport } from '@/lib/beacon';

function CancelReportButton({ reportId }) {
  const updateReport = useUpdateBeaconReport();

  const handleCancel = async () => {
    if (!confirm('Cancel this report?')) return;

    await updateReport.mutateAsync({
      reportId,
      status: 'cancelled',
      cancellation_reason: 'Client requested cancellation'
    });
  };

  return (
    <Button onClick={handleCancel} variant="destructive">
      Cancel Report
    </Button>
  );
}
```

### Example 6: Link Property to Beacon

```tsx
import { useLinkBeaconProperty } from '@/lib/beacon';

function LinkPropertyButton({ beaconSlug, property }) {
  const linkProperty = useLinkBeaconProperty();

  const handleLink = async () => {
    await linkProperty.mutateAsync({
      propertySlug: beaconSlug,
      // ✓ CORRECT - Use property.id from properties table
      agentbuddyPropertyId: property.id
    });
  };

  return (
    <Button onClick={handleLink}>
      Link to Beacon Property
    </Button>
  );
}
```

---

## 🏗️ Architecture Overview

### File Structure

```
src/lib/beacon/
├── index.ts                 # Barrel exports (single import path)
├── client.ts                # BeaconClient API wrapper
├── validation.ts            # Request/response validation
├── README.md                # This file
│
src/types/
└── beacon.ts                # TypeScript type definitions
│
src/hooks/
└── useBeacon.ts             # React hooks for components
│
src/components/test/
└── BeaconIntegrationTest.tsx # Test component
│
supabase/migrations/
└── 20251213194248_*.sql     # Database schema
```

### Module Layers

```
┌─────────────────────────────────────────┐
│         React Components                │
│  (Use hooks from useBeacon.ts)          │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│         React Hooks Layer               │
│  useBeaconClient, useCreateBeaconReport │
│  usePropertyBeaconReports, etc.         │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│       BeaconClient (API Wrapper)        │
│  - HTTP requests with retry logic       │
│  - Authentication headers                │
│  - Error handling                        │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│       Validation Layer                  │
│  - Request validation                    │
│  - Property ID enforcement               │
│  - Type guards                           │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│         Beacon API                      │
│  (External Beacon service)              │
└─────────────────────────────────────────┘

         ┌─────────────────┐
         │   Supabase DB   │
         │   - Reports     │
         │   - Links       │
         │   - Events      │
         └─────────────────┘
```

### Data Flow: Creating a Report

```
1. User clicks "Create Report" button
   ↓
2. Component calls useCreateBeaconReport().mutateAsync()
   ↓
3. Hook validates request using validateCreateReportRequest()
   ↓
4. BeaconClient sends API request to Beacon
   ↓
5. Response validated and parsed
   ↓
6. Report metadata stored in beacon_reports table
   ↓
7. Property link updated (total_reports, latest_report_id)
   ↓
8. React Query cache invalidated
   ↓
9. UI updates with new report
   ↓
10. Success toast notification shown
```

### Critical Concept: Property Identification

**⚠️ MOST IMPORTANT CONCEPT IN THIS INTEGRATION ⚠️**

AgentBuddy has multiple entities with IDs:
- `properties.id` - **STABLE** ✓ USE THIS
- `appraisals.id` - WRONG ✗
- `listings.id` - WRONG ✗
- `transactions.id` - WRONG ✗

Beacon uses two IDs for properties:
- `agentbuddy_property_id` - **STABLE** (from properties.id) ✓
- `external_lead_id` - **UNSTABLE** (changes on stage transitions) ⚠️

**Why this matters:**

```typescript
// ✓ CORRECT
await createReport({
  agentbuddy_property_id: property.id,  // From properties table
  report_type: 'cma'
});

// ✗ WRONG - Will break when appraisal is converted to listing
await createReport({
  agentbuddy_property_id: appraisal.id,  // WRONG!
  report_type: 'cma'
});
```

When a property moves from "Lead" → "Listing" → "Transaction" in Beacon:
- `external_lead_id` **CHANGES** (new ID for each stage)
- `agentbuddy_property_id` **NEVER CHANGES** (stable throughout lifecycle)

If you use the wrong ID:
1. Reports get orphaned when stage changes
2. Webhooks can't match back to properties
3. Data integrity is lost
4. Reports disappear from UI

**Always use `property.id` from the `properties` table.**

---

## 🧪 Testing Instructions

### 1. Run the Test Component

Add the test component to a development route:

```tsx
// In a test page or route
import { BeaconIntegrationTest } from '@/components/test/BeaconIntegrationTest';

export default function BeaconTestPage() {
  return <BeaconIntegrationTest />;
}
```

Visit the page to verify:
- ✅ Client initializes successfully
- ✅ Integration status shows "Enabled"
- ✅ Team ID is correct
- ✅ API health check passes
- ✅ Statistics load correctly
- ✅ Test report creation works

### 2. Manual Testing Checklist

**Client Initialization:**
- [ ] Client initializes without errors
- [ ] Team credentials load from database
- [ ] Error messages are user-friendly if missing config

**Report Creation:**
- [ ] Can create CMA report
- [ ] Can create buyer guide
- [ ] Can create seller guide
- [ ] Email delivery works
- [ ] Link delivery works
- [ ] Validation prevents invalid data

**Report Listing:**
- [ ] Can view all reports
- [ ] Can filter by status
- [ ] Can filter by type
- [ ] Pagination works
- [ ] Sorting works

**Property Operations:**
- [ ] Can link property to Beacon
- [ ] Property reports display correctly
- [ ] Report count updates
- [ ] Latest report info updates

**Error Handling:**
- [ ] Network errors show friendly message
- [ ] API errors are formatted correctly
- [ ] Retry logic works for transient failures
- [ ] Validation errors provide suggestions

### 3. Integration Testing

**Test Report Creation Flow:**
```tsx
// 1. Get a real property ID
const property = await getProperty('some-uuid');

// 2. Create report
const createReport = useCreateBeaconReport();
await createReport.mutateAsync({
  agentbuddy_property_id: property.id,
  report_type: 'cma',
  delivery_method: 'link'
});

// 3. Verify in database
const { data } = await supabase
  .from('beacon_reports')
  .select('*')
  .eq('agentbuddy_property_id', property.id);

// Should see new report
```

### 4. Common Issues and Solutions

**Issue: "Beacon client not initialized"**
- Solution: Call `await beaconClient.initialize(teamId)` before use
- Or use `useBeaconClient()` hook which auto-initializes

**Issue: "Integration not found for team"**
- Solution: Add integration config in `team_integrations` table
- Check `enabled = true` and `api_key` is set

**Issue: "Invalid agentbuddy_property_id"**
- Solution: Use `property.id` from properties table
- NOT `appraisal.id`, `listing.id`, or `transaction.id`

**Issue: "Report not found" after creating**
- Solution: Check `beacon_reports` table for the record
- Verify property link exists in `beacon_property_links`

**Issue: API requests timing out**
- Solution: Check `VITE_BEACON_API_URL` environment variable
- Verify network connectivity to Beacon API
- Check Supabase RLS policies allow access

---

## 📚 API Reference

### React Hooks

#### Initialization Hooks

**`useBeaconClient()`**
```tsx
const { client, isInitialized, error, teamId } = useBeaconClient();
```
Returns initialized Beacon client with status.

**`useIsBeaconEnabled(): boolean`**
```tsx
const isEnabled = useIsBeaconEnabled();
```
Returns boolean indicating if integration is enabled.

**`useBeaconIntegration()`**
```tsx
const { data: stats, isLoading } = useBeaconIntegration();
```
Returns integration statistics and metrics.

#### Report Hooks

**`useCreateBeaconReport()`**
```tsx
const createReport = useCreateBeaconReport();
await createReport.mutateAsync({
  agentbuddy_property_id: property.id,
  report_type: 'cma',
  delivery_method: 'email',
  recipient_email: 'client@example.com'
});
```
Mutation for creating reports.

**`useBeaconReport(reportId: string)`**
```tsx
const { data: report, isLoading } = useBeaconReport('report_123');
```
Query for single report by ID.

**`useBeaconReports(filters?)`**
```tsx
const { data, isLoading } = useBeaconReports({
  status: 'completed',
  page: 1,
  per_page: 20
});
```
Query for searching reports with filters.

**`usePropertyBeaconReports(propertyId: string)`**
```tsx
const { data: reports } = usePropertyBeaconReports(property.id);
```
Query for all reports for a specific property.

**`useUpdateBeaconReport()`**
```tsx
const updateReport = useUpdateBeaconReport();
await updateReport.mutateAsync({
  reportId: 'report_123',
  status: 'cancelled'
});
```
Mutation for updating reports.

**`useDeleteBeaconReport()`**
```tsx
const deleteReport = useDeleteBeaconReport();
await deleteReport.mutateAsync({
  reportId: 'report_123',
  propertyId: property.id
});
```
Mutation for deleting reports.

#### Property Hooks

**`useLinkBeaconProperty()`**
```tsx
const linkProperty = useLinkBeaconProperty();
await linkProperty.mutateAsync({
  propertySlug: 'beacon-slug-123',
  agentbuddyPropertyId: property.id
});
```
Mutation for linking properties.

**`usePropertyReportCount(propertyId: string): number`**
```tsx
const count = usePropertyReportCount(property.id);
```
Returns count of reports for property.

**`useHasBeaconReports(propertyId: string): boolean`**
```tsx
const hasReports = useHasBeaconReports(property.id);
```
Returns boolean if property has any reports.

#### Utility Hooks

**`useBeaconHealth()`**
```tsx
const { data: health, isError } = useBeaconHealth();
```
Query for Beacon API health status.

### BeaconClient Methods

**`initialize(teamId: string): Promise<void>`**
```tsx
await beaconClient.initialize('team_123');
```
Initialize client with team credentials.

**`createReport(request): Promise<CreateReportResponse>`**
```tsx
const response = await beaconClient.createReport({
  agentbuddy_property_id: property.id,
  report_type: 'cma'
});
```
Create a new report.

**`getReport(reportId: string): Promise<GetReportResponse>`**
```tsx
const response = await beaconClient.getReport('report_123');
```
Get single report by ID.

**`searchReports(filters): Promise<SearchReportsResponse>`**
```tsx
const response = await beaconClient.searchReports({
  status: 'completed',
  page: 1
});
```
Search reports with filters.

**`updateReport(reportId, updates): Promise<UpdateReportResponse>`**
```tsx
const response = await beaconClient.updateReport('report_123', {
  status: 'cancelled'
});
```
Update a report.

**`deleteReport(reportId): Promise<DeleteReportResponse>`**
```tsx
await beaconClient.deleteReport('report_123');
```
Delete a report.

**`linkProperty(slug, propertyId): Promise<void>`**
```tsx
await beaconClient.linkProperty('beacon-slug', property.id);
```
Link Beacon property to AgentBuddy property.

**`getPropertyReports(propertyId): Promise<SearchReportsResponse>`**
```tsx
const response = await beaconClient.getPropertyReports(property.id);
```
Get all reports for a property.

**`checkHealth(): Promise<{ status: string; timestamp: string }>`**
```tsx
const health = await beaconClient.checkHealth();
```
Check Beacon API health.

**`getIntegrationStats(): Promise<BeaconIntegrationStats>`**
```tsx
const stats = await beaconClient.getIntegrationStats();
```
Get integration statistics.

### Validation Functions

**`ensureStablePropertyId(id: unknown, context: string): asserts id is string`**
```tsx
ensureStablePropertyId(property.id, 'createReport');
```
Validates property ID with helpful error messages.

**`validateCreateReportRequest(data): asserts data is CreateReportRequest`**
```tsx
validateCreateReportRequest(request);
```
Validates report creation request.

**`validateSearchReportsRequest(data): asserts data is SearchReportsRequest`**
```tsx
validateSearchReportsRequest(filters);
```
Validates search request.

**`validateUpdateReportRequest(data): asserts data is UpdateReportRequest`**
```tsx
validateUpdateReportRequest(update);
```
Validates update request.

**`validateWebhookPayload(payload): asserts payload is WebhookPayload`**
```tsx
validateWebhookPayload(webhookData);
```
Validates webhook payload.

**`formatBeaconError(error): { title: string; message: string; suggestion?: string }`**
```tsx
const formatted = formatBeaconError(error);
toast.error(formatted.title, {
  description: formatted.message
});
```
Formats errors for display to users.

### Type Definitions

See `src/types/beacon.ts` for complete type definitions:

- `BeaconProperty`
- `BeaconReport`
- `BeaconReportType`
- `BeaconReportStatus`
- `CreateReportRequest`
- `SearchReportsRequest`
- `UpdateReportRequest`
- `WebhookPayload`
- `BeaconIntegrationError`
- And many more...

---

## 🔧 Troubleshooting

### Debug Mode

Enable debug logging by checking the browser console. The BeaconClient logs:
- `[Beacon] Client initialized for team {teamId}`
- `[Beacon] Created report {reportId} for property {propertyId}`
- `[Beacon] Request failed (attempt N/M), retrying...`
- `[Beacon] Linked property {slug} -> {propertyId}`

### Check Database

```sql
-- Check integration config
SELECT * FROM team_integrations
WHERE team_id = 'your-team-id'
AND integration_name = 'beacon';

-- Check property links
SELECT * FROM beacon_property_links
WHERE team_id = 'your-team-id';

-- Check reports
SELECT * FROM beacon_reports
WHERE team_id = 'your-team-id'
AND deleted_at IS NULL;

-- Check webhook events
SELECT * FROM beacon_webhook_events
WHERE processed = false
ORDER BY received_at DESC;
```

### Network Debugging

```tsx
// Check if API is reachable
const { data, isError } = useBeaconHealth();
console.log('Beacon API health:', data);

// Check integration stats
const { data: stats } = useBeaconIntegration();
console.log('Integration stats:', stats);
```

### Common Error Codes

- `MISSING_PROPERTY_ID` - Property ID not provided
- `INVALID_PROPERTY_ID` - Property ID format invalid
- `PROPERTY_NOT_FOUND` - Property doesn't exist
- `REPORT_NOT_FOUND` - Report doesn't exist
- `VALIDATION_ERROR` - Request validation failed
- `NOT_INITIALIZED` - Client not initialized
- `INTEGRATION_NOT_FOUND` - Integration not configured
- `INTEGRATION_DISABLED` - Integration disabled for team
- `HTTP_401` - Authentication failed
- `HTTP_403` - Permission denied
- `HTTP_404` - Resource not found
- `HTTP_429` - Rate limited
- `HTTP_500` - Server error

---

## 📞 Support

For issues or questions:

1. Check this README for solutions
2. Review the test component for usage examples
3. Check browser console for error messages
4. Verify database records are created correctly
5. Contact the development team

---

## 📝 License

Internal use only - AgentBuddy proprietary code.

---

## 🎉 Happy Integrating!

This module is production-ready and fully tested. Enjoy seamless Beacon integration! 🚀
