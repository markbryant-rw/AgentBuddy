# AgentBuddy ↔ Beacon Integration Specification v3.0

> **Last Updated:** 2024-12-12  
> **Status:** Active Development  
> **Authors:** AgentBuddy Engineering Team

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Authentication](#authentication)
4. [Core Concepts](#core-concepts)
5. [API Endpoints](#api-endpoints)
6. [Webhook Payloads](#webhook-payloads)
7. [Orphan Matching Workflow](#orphan-matching-workflow)
8. [Team Member Management](#team-member-management)
9. [Data Flow Diagrams](#data-flow-diagrams)
10. [Error Handling](#error-handling)
11. [Migration Guide](#migration-guide)

---

## Overview

### What's New in V3

- **Property-Level Linking**: Stable `agentbuddyPropertyId` replaces per-appraisal linking
- **Bi-directional Search**: Both platforms can search each other's properties
- **Automatic Team Sync**: Team membership changes trigger automatic Beacon sync
- **Orphan Report Matching**: Workflow for linking existing Beacon reports to AgentBuddy properties

### Integration Philosophy

- **AgentBuddy = Source of Truth** for property, owner, and deal data
- **Beacon = Enhancement Layer** for engagement analytics and vendor communication
- **Team-Centric Auth**: All operations authenticated via `teamId` + `apiKey`

---

## Architecture

### Property Lifecycle in AgentBuddy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AGENTBUDDY PROPERTY TABLE                          │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  properties                                                          │   │
│  │  ├── id (UUID) ◄─────────────── STABLE ANCHOR                       │   │
│  │  ├── address                                                         │   │
│  │  ├── suburb                                                          │   │
│  │  ├── team_id                                                         │   │
│  │  ├── beacon_property_slug ◄──── CROSS-REFERENCE TO BEACON           │   │
│  │  └── created_at / updated_at                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                    ┌───────────────┼───────────────┐                       │
│                    ▼               ▼               ▼                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │ logged_appraisals│  │ listings_pipeline│  │   transactions   │         │
│  │ (property_id)    │  │ (property_id)    │  │ (property_id)    │         │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BEACON PLATFORM                                │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  beacon_properties                                                   │   │
│  │  ├── property_slug (unique) ◄─── BEACON'S IDENTIFIER                │   │
│  │  ├── agentbuddy_property_id ◄─── CROSS-REFERENCE TO AGENTBUDDY      │   │
│  │  ├── address / suburb                                                │   │
│  │  └── team_id (agentbuddy team reference)                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  beacon_reports                                                      │   │
│  │  ├── id / report_type / propensity_score                            │   │
│  │  ├── property_slug (FK)                                              │   │
│  │  └── engagement metrics (views, time, email_opens)                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Identifiers

| Platform | Identifier | Description | Stability |
|----------|-----------|-------------|-----------|
| AgentBuddy | `properties.id` | UUID primary key | **Permanent** |
| AgentBuddy | `logged_appraisals.id` | Per-appraisal UUID | Per-visit |
| Beacon | `property_slug` | Beacon's property identifier | **Permanent** |
| Cross-ref | `beacon_property_slug` | Stored on AgentBuddy properties | Bi-directional |
| Cross-ref | `agentbuddy_property_id` | Stored on Beacon properties | Bi-directional |

---

## Authentication

### Team-Centric Model

All API calls authenticated via:

```
Headers:
  x-api-key: {BEACON_API_KEY}  // Shared secret between platforms
  
Body:
  teamId: "{agentbuddy_team_uuid}"  // Team performing the action
```

### Why Team-Centric?

- ✅ Works for solo agents (team of one)
- ✅ Works for teams with multiple salespeople
- ✅ Works for teams with assistants/PAs
- ✅ No per-agent sync required
- ✅ Team membership changes don't break existing reports

---

## Core Concepts

### Property vs Appraisal

```
PROPERTY (stable)                    APPRAISAL (per-visit)
├── 42 Smith St, Ponsonby           ├── Visit #1 (VAP) - 2024-01-15
│   └── beacon_property_slug        ├── Visit #2 (MAP) - 2024-02-20
│                                   └── Visit #3 (LAP) - 2024-03-10
```

- **Property**: Unique address, survives entire lifecycle
- **Appraisal**: Single visit/interaction at a property
- **Beacon Reports**: Attached to PROPERTY, not individual appraisals

### Linking States

| State | AgentBuddy `beacon_property_slug` | Beacon `agentbuddy_property_id` |
|-------|-----------------------------------|----------------------------------|
| Unlinked | `null` | `null` |
| AgentBuddy-initiated | Set after Beacon returns slug | Set by Beacon on create |
| Beacon-initiated (orphan) | Set after manual link | Already set |
| Fully linked | ✅ Set | ✅ Set |

---

## API Endpoints

### AgentBuddy → Beacon

#### 1. Create Report

```http
POST {BEACON_API_URL}/create-report-from-agentbuddy

Headers:
  x-api-key: {API_KEY}
  Content-Type: application/json

Body:
{
  "teamId": "uuid",                    // Required: AgentBuddy team UUID
  "agentbuddyPropertyId": "uuid",      // Required: Stable property reference
  "externalLeadId": "uuid",            // Optional: Specific appraisal ID (backward compat)
  "address": "42 Smith Street",
  "suburb": "Ponsonby",
  "reportType": "property_report",     // property_report | campaign_proposal | campaign_update
  "vendorIds": ["uuid1", "uuid2"],     // Owner UUIDs for per-contact tracking
  "agentMetadata": {                   // Optional: For attribution
    "name": "John Smith",
    "email": "john@agency.com"
  }
}

Response:
{
  "success": true,
  "reportId": "beacon_report_uuid",
  "reportUrl": "https://beacon.app/reports/...",
  "personalizedUrl": "https://beacon.app/v/...",
  "propertySlug": "abc123"             // ◄ IMPORTANT: Store this!
}
```

#### 2. Link Existing Report

```http
POST {BEACON_API_URL}/link-report-to-agentbuddy

Body:
{
  "teamId": "uuid",
  "beaconReportId": "uuid",
  "agentbuddyPropertyId": "uuid",      // ◄ Now using property ID
  "externalLeadId": "uuid"             // Optional: Specific appraisal
}

Response:
{
  "success": true,
  "propertySlug": "abc123"             // ◄ Store this on properties table
}
```

#### 3. Search Beacon Reports

```http
POST {BEACON_API_URL}/search-reports

Body:
{
  "teamId": "uuid",
  "address": "42 Smith",               // Fuzzy match
  "suburb": "Ponsonby",                // Optional filter
  "includeOrphans": true               // Include unlinked reports
}

Response:
{
  "reports": [
    {
      "reportId": "uuid",
      "propertySlug": "abc123",
      "address": "42 Smith Street, Ponsonby",
      "reportType": "property_report",
      "agentbuddyPropertyId": null,    // null = orphan
      "propensityScore": 75,
      "isHotLead": true,
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

#### 4. Sync Team Members

```http
POST {BEACON_API_URL}/sync-team-from-agentbuddy

Body:
{
  "teamId": "uuid",
  "teamName": "Mark & Co.",
  "members": [
    {
      "id": "uuid",
      "email": "mark@agency.com",
      "name": "Mark Bryant",
      "role": "team_leader"
    },
    {
      "id": "uuid",
      "email": "sarah@agency.com", 
      "name": "Sarah Mitchell",
      "role": "salesperson"
    }
  ]
}
```

### Beacon → AgentBuddy

#### 5. Search AgentBuddy Properties

```http
POST {AGENTBUDDY_URL}/functions/v1/search-agentbuddy-properties

Headers:
  x-api-key: {BEACON_FEEDBACK_API_KEY}
  Content-Type: application/json

Body:
{
  "teamId": "uuid",                    // Required
  "address": "42 Smith",               // Optional: Fuzzy search
  "suburb": "Ponsonby",                // Optional: Filter
  "beaconPropertySlug": "abc123"       // Optional: Find by existing link
}

Response:
{
  "success": true,
  "properties": [
    {
      "id": "uuid",                    // ◄ agentbuddyPropertyId
      "address": "42 Smith Street, Ponsonby",
      "suburb": "Ponsonby",
      "beaconPropertySlug": "abc123",  // null if unlinked
      "isLinkedToBeacon": true,
      "lifecycleStage": "appraisal",   // appraisal | opportunity | transaction
      "beaconReportCount": 3,
      "latestOwner": {
        "name": "John Wilson",
        "email": "john@example.com"
      },
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "totalCount": 1
}
```

---

## Webhook Payloads

### Engagement Update Webhook

Sent from Beacon → AgentBuddy when engagement metrics change.

```http
POST {AGENTBUDDY_URL}/functions/v1/beacon-webhook

Headers:
  x-api-key: {WEBHOOK_SECRET}
  Content-Type: application/json

Body:
{
  "event": "engagement_update",
  "timestamp": "2024-12-12T10:30:00Z",
  
  // BOTH identifiers for flexibility
  "agentbuddyPropertyId": "uuid",      // ◄ NEW: Stable property reference
  "externalLeadId": "uuid",            // ◄ KEPT: Per-appraisal (backward compat)
  
  "beaconReportId": "uuid",
  "propertySlug": "abc123",
  
  "metrics": {
    "propensityScore": 75,
    "totalViews": 12,
    "totalTimeSeconds": 340,
    "emailOpens": 3,
    "isHotLead": true,
    "lastActivityAt": "2024-12-12T10:25:00Z"
  },
  
  "reportDetails": {
    "reportType": "property_report",
    "createdAt": "2024-01-15T10:00:00Z",
    "personalizedUrl": "https://beacon.app/v/..."
  }
}
```

### Webhook Processing Logic (AgentBuddy)

```typescript
// 1. Try property-level lookup first (preferred)
if (payload.agentbuddyPropertyId) {
  const property = await findPropertyById(payload.agentbuddyPropertyId);
  if (property) {
    await updatePropertyEngagement(property.id, payload.metrics);
    await updateAllAppraisalsForProperty(property.id, payload.metrics);
    return;
  }
}

// 2. Fall back to appraisal-level lookup (legacy)
if (payload.externalLeadId) {
  const appraisal = await findAppraisalById(payload.externalLeadId);
  if (appraisal) {
    await updateAppraisalEngagement(appraisal.id, payload.metrics);
    return;
  }
}

// 3. No match - log orphan for later linking
await logOrphanWebhook(payload);
```

---

## Orphan Matching Workflow

### What is an Orphan Report?

A Beacon report created before the property was in AgentBuddy, or created without linking.

### Matching Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     ORPHAN MATCHING WORKFLOW                     │
└─────────────────────────────────────────────────────────────────┘

1. USER ACTION: Opens BeaconTab for an appraisal
                         │
                         ▼
2. SEARCH: AgentBuddy calls Beacon search-reports API
           with address + teamId + includeOrphans=true
                         │
                         ▼
3. RESULTS: Beacon returns all matching reports
           ┌────────────────────────────────────┐
           │ Report 1: propertySlug=abc123      │
           │           agentbuddyPropertyId=null│ ◄─ ORPHAN
           │           matchScore=95%           │
           │                                    │
           │ Report 2: propertySlug=def456      │
           │           agentbuddyPropertyId=xyz │ ◄─ Already linked
           └────────────────────────────────────┘
                         │
                         ▼
4. UI: Shows orphan with "Link to this property" button
       ┌─────────────────────────────────────────┐
       │ 📄 Found existing Beacon report         │
       │                                         │
       │ "42 Smith St, Ponsonby"                │
       │ Propensity: 75 | Views: 12 | Hot: 🔥   │
       │                                         │
       │ [Link to this property]                 │
       └─────────────────────────────────────────┘
                         │
                         ▼
5. LINK: User clicks → AgentBuddy calls link-report-to-agentbuddy
         passing agentbuddyPropertyId
                         │
                         ▼
6. STORE: Beacon returns propertySlug
          AgentBuddy stores in properties.beacon_property_slug
                         │
                         ▼
7. COMPLETE: Property now fully linked
             All future webhooks use agentbuddyPropertyId
```

### Matching Algorithm Recommendations

| Priority | Method | Confidence |
|----------|--------|------------|
| 1 | Exact address match | 100% |
| 2 | Normalized address match | 95% |
| 3 | Street number + name + suburb | 85% |
| 4 | Fuzzy match (Levenshtein) | 70-80% |

---

## Team Member Management

### Automatic Sync Triggers

AgentBuddy automatically syncs team to Beacon when:

1. ✅ Team member added via invitation
2. ✅ Team member removed
3. ✅ Solo agent adds first teammate
4. ✅ User role changes within team

### Sync Implementation

```typescript
// Called automatically when team membership changes
async function triggerBeaconTeamSync(teamId: string) {
  // Check if Beacon integration is enabled
  const integration = await getIntegrationSettings(teamId, 'beacon');
  if (!integration?.enabled) return;
  
  // Invoke sync edge function
  await supabase.functions.invoke('sync-beacon-team', {
    body: { teamId }
  });
}
```

### Member Removal Handling

**Question for Beacon Team:** How should removed members be handled?

Options:
1. **Deactivate**: Member can't create new reports but existing reports preserved
2. **Reassign**: Reports transferred to team leader
3. **Archive**: Reports marked as archived but accessible

---

## Data Flow Diagrams

### Create Report Flow

```
AgentBuddy                           Beacon
    │                                   │
    │  POST /create-report-from-agentbuddy
    │  { teamId, agentbuddyPropertyId,  │
    │    address, suburb, vendorIds }   │
    │ ─────────────────────────────────►│
    │                                   │
    │                          Create property if new
    │                          Store agentbuddyPropertyId
    │                          Create report
    │                                   │
    │  { reportId, propertySlug }       │
    │ ◄─────────────────────────────────│
    │                                   │
Store propertySlug                      │
on properties table                     │
    │                                   │
```

### Engagement Webhook Flow

```
Beacon                              AgentBuddy
    │                                   │
    │  POST /beacon-webhook             │
    │  { agentbuddyPropertyId,          │
    │    externalLeadId, metrics }      │
    │ ─────────────────────────────────►│
    │                                   │
    │                          1. Find by propertyId
    │                          2. Update beacon_reports
    │                          3. Update logged_appraisals
    │                          4. Update properties
    │                                   │
    │  { success: true }                │
    │ ◄─────────────────────────────────│
    │                                   │
```

---

## Error Handling

### Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `TEAM_NOT_SYNCED` | Team doesn't exist in Beacon | Call sync-team-from-agentbuddy first |
| `PROPERTY_NOT_FOUND` | agentbuddyPropertyId invalid | Verify property exists |
| `REPORT_NOT_FOUND` | beaconReportId invalid | Verify report ID |
| `ALREADY_LINKED` | Report already linked to different property | Unlink first or skip |
| `RATE_LIMITED` | Too many requests | Back off and retry |

### Retry Strategy

```typescript
const retryConfig = {
  maxRetries: 3,
  initialDelay: 1000,  // 1 second
  backoffMultiplier: 2,
  maxDelay: 10000      // 10 seconds
};
```

---

## Migration Guide

### From V2 to V3

#### 1. Database Migration (AgentBuddy)

```sql
-- Already applied
ALTER TABLE properties 
ADD COLUMN beacon_property_slug TEXT;

CREATE INDEX idx_properties_beacon_slug 
ON properties(beacon_property_slug);
```

#### 2. Update API Calls

**Before (V2):**
```javascript
// Per-appraisal linking
await createBeaconReport({
  externalLeadId: appraisal.id,  // Appraisal UUID
  address: appraisal.address
});
```

**After (V3):**
```javascript
// Property-level linking
await createBeaconReport({
  agentbuddyPropertyId: property.id,  // Property UUID (stable)
  externalLeadId: appraisal.id,       // Optional: still useful for tracking
  address: property.address
});
```

#### 3. Webhook Handler Update

Update webhook handler to check `agentbuddyPropertyId` first:

```javascript
// V3 handler
if (payload.agentbuddyPropertyId) {
  // Property-level update (preferred)
  await updateByPropertyId(payload.agentbuddyPropertyId, payload.metrics);
} else if (payload.externalLeadId) {
  // Legacy appraisal-level update
  await updateByAppraisalId(payload.externalLeadId, payload.metrics);
}
```

---

## Summary Checklist for Beacon Team

### Required Changes

- [ ] Accept `agentbuddyPropertyId` in create-report endpoint
- [ ] Return `propertySlug` in all report creation responses
- [ ] Store `agentbuddyPropertyId` on Beacon properties
- [ ] Include both `agentbuddyPropertyId` AND `externalLeadId` in webhooks
- [ ] Implement `search-reports` with `includeOrphans` parameter
- [ ] Return orphan status (`agentbuddyPropertyId: null`) in search results

### Optional Enhancements

- [ ] Property-grouped search response (all reports for a property)
- [ ] Confidence scoring for address matching
- [ ] Member removal handling strategy

---

## Questions & Contact

For integration questions:
- Create issue in shared integration repo
- Tag `#beacon-integration` in team channel

**Document Version:** 3.0.0  
**Compatibility:** AgentBuddy 2024.12+, Beacon TBD
