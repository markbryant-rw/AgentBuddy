# AgentBuddy Platform Architecture

> Last Updated: December 2024

## Table of Contents
- [Platform Overview](#platform-overview)
- [Tech Stack](#tech-stack)
- [Directory Structure](#directory-structure)
- [Database Architecture](#database-architecture)
- [Authentication & Authorization](#authentication--authorization)
- [Edge Functions](#edge-functions)
- [Integrations](#integrations)
- [Design System](#design-system)
- [Key Patterns & Conventions](#key-patterns--conventions)
- [Security Model](#security-model)

---

## Platform Overview

AgentBuddy is an AI-powered productivity co-pilot for real estate agents in New Zealand and Australia. It serves as the **source of truth** for all property, owner, and deal data.

### Ecosystem

```
┌─────────────────────────────────────────────────────────────────┐
│                      AgentBuddy Ecosystem                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐     ┌──────────────────┐                  │
│  │   AgentBuddy     │────▶│     Beacon       │                  │
│  │  (Main Platform) │◀────│  (Engagement)    │                  │
│  │  agentbuddy.co   │     │ beacon.agentbuddy│                  │
│  └────────┬─────────┘     └──────────────────┘                  │
│           │                                                      │
│           ▼                                                      │
│  ┌──────────────────┐     ┌──────────────────┐                  │
│  │     Forge        │     │    Command       │                  │
│  │   (Planned)      │     │   (Planned)      │                  │
│  └──────────────────┘     └──────────────────┘                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Core Workspaces (6 Modules)

| Workspace | Purpose | Primary Features |
|-----------|---------|------------------|
| **Plan** | Goal setting & tracking | Quarterly targets, KPI dashboards |
| **Prospect** | Lead generation | Appraisals, pipeline management |
| **Transact** | Deal management | Transactions, settlements |
| **Operate** | Daily operations | Tasks, daily planner |
| **Grow** | Business development | Past sales, aftercare, referrals |
| **Engage** | Communication | Team messaging, notifications |

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.1 | UI framework |
| TypeScript | - | Type safety |
| Vite | - | Build tool |
| Tailwind CSS | - | Styling |
| shadcn/ui | - | Component library |
| TanStack Query | 5.x | Server state |
| React Router DOM | 6.x | Routing |
| Framer Motion | 12.x | Animations |
| TipTap | 2.x | Rich text editor |

### Backend (Supabase)
| Service | Purpose |
|---------|---------|
| PostgreSQL | Primary database (~90 tables) |
| Edge Functions | Serverless API (~85 functions) |
| Auth | Authentication & sessions |
| Storage | File uploads (avatars, attachments) |
| Realtime | Live subscriptions |

### External Services
| Service | Purpose |
|---------|---------|
| Stripe | Billing & subscriptions |
| Resend | Transactional emails |
| Google Maps API | Address autocomplete |
| OpenCage | Geocoding |
| WeatherAPI | Location weather |
| Giphy | GIF support in messaging |

---

## Directory Structure

```
src/
├── assets/              # Static assets (images, fonts)
├── components/          # React components
│   ├── ui/             # shadcn/ui base components
│   ├── dashboard/      # Dashboard widgets
│   ├── appraisals/     # Appraisal module components
│   ├── transactions/   # Transaction module components
│   ├── past-sales/     # Past sales & aftercare
│   ├── tasks/          # Task management
│   ├── messaging/      # Team messaging
│   ├── admin/          # Admin-only components
│   ├── settings/       # Settings components
│   └── ...
├── hooks/               # Custom React hooks
│   ├── useAuth.tsx     # Authentication hook
│   ├── useProfile.tsx  # User profile hook
│   ├── useTeam.tsx     # Team context hook
│   └── ...
├── integrations/
│   └── supabase/
│       ├── client.ts   # Supabase client instance
│       └── types.ts    # Auto-generated DB types (READ-ONLY)
├── lib/                 # Utility libraries
│   ├── rbac.ts         # Role-based access control
│   ├── stripe-plans.ts # Stripe plan definitions
│   └── utils.ts        # General utilities
├── pages/               # Route pages
│   ├── Home.tsx        # Dashboard
│   ├── Appraisals.tsx  # Appraisals module
│   ├── Transactions.tsx
│   └── ...
├── contexts/            # React contexts
└── App.tsx             # Root component & routes

supabase/
├── config.toml         # Supabase configuration
├── functions/          # Edge functions
│   ├── _shared/        # Shared utilities
│   │   └── cors.ts     # CORS headers helper
│   ├── invite-user/
│   ├── create-checkout/
│   ├── geocode-*/
│   └── ...
└── migrations/         # Database migrations (READ-ONLY)
```

---

## Database Architecture

### Core Tables

#### User & Organization
```sql
profiles              -- User profiles (extends auth.users)
agencies              -- Offices/agencies
teams                 -- Teams within agencies
team_members          -- Team membership junction
user_roles            -- Role assignments (RBAC)
office_manager_assignments -- Multi-office management
```

#### Primary Business Entities
```sql
logged_appraisals     -- Property appraisals (VAP/MAP/LAP)
listings_pipeline     -- Sales pipeline/opportunities
transactions          -- Active deals
past_sales            -- Completed sales + aftercare
properties            -- Unified property records
```

#### Task Management
```sql
tasks                 -- All tasks (transaction, project, appraisal)
task_lists            -- Kanban columns
task_assignees        -- Multi-assignee support
daily_planner_items   -- Daily planner entries
daily_planner_assignments -- Planner item assignments
```

#### Templates
```sql
appraisal_stage_templates    -- VAP/MAP/LAP task templates
transaction_stage_templates  -- Deal stage templates
aftercare_templates          -- 10-year aftercare plans
communication_templates      -- Email/SMS templates
```

### Key Relationships

```
profiles ──┬── team_members ──── teams ──── agencies
           │
           ├── user_roles (RBAC)
           │
           ├── logged_appraisals ──┬── listings_pipeline
           │                       │
           │                       └── transactions ──── past_sales
           │
           └── tasks ──── task_assignees
```

### Data Flow: Property Lifecycle

```
Appraisal (logged_appraisals)
    │
    ▼ "Convert to Opportunity"
Pipeline (listings_pipeline)
    │
    ▼ "Mark as Won"
Transaction (transactions)
    │
    ▼ Stage = "settled" (auto-trigger)
Past Sale (past_sales)
    │
    ▼ Auto-generated
Aftercare Plan (10 years)
```

---

## Authentication & Authorization

### Role Hierarchy (5 Tiers)

```
platform_admin (Level 1)
    │
    ├── Can: Manage all agencies, users, system templates
    ├── See: Everything
    │
    ▼
office_manager (Level 2)
    │
    ├── Can: Manage assigned offices, invite team leaders
    ├── See: Office-scoped data
    │
    ▼
team_leader (Level 3)
    │
    ├── Can: Manage team, invite salespeople/assistants
    ├── See: Team data only
    │
    ▼
salesperson (Level 4)
    │
    ├── Can: Manage own deals, create appraisals
    ├── See: Team data (based on team membership)
    │
    ▼
assistant (Level 5)
    │
    ├── Can: Support tasks, view assigned work
    └── See: Assigned items only
```

### RBAC Implementation

```typescript
// src/lib/rbac.ts
export type AppRole = 'platform_admin' | 'office_manager' | 'team_leader' | 'salesperson' | 'assistant';

// Invitation hierarchy (who can invite whom)
const INVITATION_HIERARCHY: Record<AppRole, AppRole[]> = {
  platform_admin: ['office_manager', 'team_leader', 'salesperson', 'assistant'],
  office_manager: ['team_leader', 'salesperson', 'assistant'],
  team_leader: ['salesperson', 'assistant'],
  salesperson: ['assistant'],
  assistant: [],
};
```

### Row Level Security (RLS)

All tables have RLS enabled. Key patterns:

```sql
-- Agency-scoped isolation
CREATE POLICY "Users see own agency data"
ON some_table FOR SELECT
USING (agency_id = get_user_agency_id(auth.uid()));

-- Team-scoped privacy (past_sales)
CREATE POLICY "Team members only"
ON past_sales FOR SELECT
USING (
  is_team_member(auth.uid(), team_id) 
  OR created_by = auth.uid()
);

-- Platform admin override
CREATE POLICY "Admins see all"
ON some_table FOR ALL
USING (has_role(auth.uid(), 'platform_admin'));
```

### Security Functions

```sql
has_role(user_id, role)           -- Check if user has role
is_team_member(user_id, team_id)  -- Check team membership
get_user_agency_id(user_id)       -- Get user's agency
get_user_team_ids(user_id)        -- Get all user's teams
```

---

## Edge Functions

### Organization

```
supabase/functions/
├── _shared/
│   └── cors.ts              # Shared CORS helper
│
├── Auth & Invitations
│   ├── invite-user/
│   ├── resend-invitation/
│   ├── accept-invitation/
│   └── repair-user/
│
├── Billing (Stripe)
│   ├── create-checkout/
│   ├── customer-portal/
│   ├── check-subscription/
│   └── stripe-webhook/
│
├── Geocoding
│   ├── geocode-appraisal/
│   ├── geocode-transaction/
│   ├── geocode-listing/
│   └── geocode-past-sale/
│
├── Beacon Integration
│   ├── sync-team-to-beacon/
│   ├── create-beacon-report/
│   ├── fetch-beacon-reports/
│   └── beacon-engagement-webhook/
│
├── Notifications
│   ├── send-notification-digest/
│   ├── notify-team-transaction/
│   └── weekly-reflection-scheduler/
│
├── Admin Operations
│   ├── start-impersonation/
│   ├── stop-impersonation/
│   ├── suspend-user/
│   ├── pause-agency/
│   └── delete-user-complete/
│
└── AI Features
    ├── generate-team-meeting/
    └── ai-coaching-chat/
```

### CORS Pattern

All edge functions use the shared CORS helper:

```typescript
import { getCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // ... function logic
  
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});
```

---

## Integrations

### Beacon (Vendor Engagement)

**Philosophy**: AgentBuddy = source of truth. Beacon = analytics layer.

```
AgentBuddy                          Beacon
──────────                          ──────
Property data    ───────────────▶   Engagement tracking
Owner contacts   ───────────────▶   Propensity scoring
                                    View analytics
                 ◀───────────────   Hot lead alerts
                 ◀───────────────   Engagement webhooks
```

**Key Points**:
- Team-centric authentication (team_id + apiKey)
- Property-level linking (not report-level)
- `beacon_property_slug` stored on properties table

### Stripe Billing

**Plans**:
| Plan | Monthly | Annual |
|------|---------|--------|
| Solo Agent | $49.99 NZD | $499.90 NZD |
| Small Team (≤3) | $99.99 NZD | $999.90 NZD |

**Flow**:
```
Landing Page → Auth (capture plan params) → /setup?auto_checkout=true → Stripe
```

### Google Calendar

- OAuth2 connection stored in `google_calendar_connections`
- Sync settings in `calendar_sync_settings`
- Syncs: Appraisals, Transactions, Daily Planner, Aftercare

---

## Design System

### Typography

| Use | Font |
|-----|------|
| Primary | Plus Jakarta Sans |
| Monospace/Numbers | JetBrains Mono |

### Color Palette (Workspace Gradients)

| Workspace | Gradient |
|-----------|----------|
| Plan | Blue → Indigo |
| Prospect | Teal → Cyan |
| Transact | Amber → Orange |
| Operate | Purple → Violet |
| Grow | Emerald → Green |
| Engage | Pink → Rose |

### Semantic Tokens

```css
/* index.css - Always use semantic tokens */
--background
--foreground
--primary / --primary-foreground
--secondary / --secondary-foreground
--muted / --muted-foreground
--accent / --accent-foreground
--destructive
--border
--ring
```

### Z-Index Scale

```css
z-[100]    /* Navigation */
z-[11000]  /* Dialog overlay */
z-[11001]  /* Dialog content */
z-[12000]  /* Portals (Select, Popover, Dropdown) */
```

### Component Patterns

```tsx
// Always use semantic colors, never direct colors
<Button className="bg-primary text-primary-foreground" />  // ✅
<Button className="bg-blue-500 text-white" />              // ❌

// Use workspace gradients from design system
<div className="bg-gradient-to-r from-teal-500 to-cyan-500" />
```

---

## Key Patterns & Conventions

### Hook Naming

```typescript
// Data fetching hooks
useAppraisals()           // List query
useAppraisal(id)          // Single item query
useCreateAppraisal()      // Mutation
useUpdateAppraisal()      // Mutation
useDeleteAppraisal()      // Mutation

// Context hooks
useAuth()                 // Auth context
useTeam()                 // Team context
useProfile()              // Profile data
```

### React Query Keys

```typescript
queryKey: ['appraisals', teamId]
queryKey: ['appraisal', id]
queryKey: ['transactions', { teamId, stage }]
```

### Component Organization

```
components/
└── appraisals/
    ├── AppraisalsList.tsx       # Main list component
    ├── AppraisalCard.tsx        # Card component
    ├── AppraisalDetailDialog.tsx # Detail modal
    ├── AppraisalForm.tsx        # Create/edit form
    ├── AppraisalTasksTab.tsx    # Tasks tab content
    └── hooks/
        └── useAppraisalTasks.ts # Domain-specific hook
```

### Template System (2-Tier)

```
System Templates (Platform Admin)
    │
    ├── Locked from deletion
    ├── Copyable for customization
    │
    ▼
User/Team Templates
    │
    ├── Team-scoped
    └── Fully editable
```

### Multi-Owner Pattern

All property records support multiple owners:

```typescript
interface Owner {
  id: string;
  name: string;
  email: string;
  phone: string;
  is_primary: boolean;
  beacon_owner_id?: string;
}

// Stored as JSON array
owners: Owner[]
```

---

## Security Model

### Data Isolation

```
Platform Admin ──▶ All agencies
Office Manager ──▶ Assigned offices only
Team Members   ──▶ Own team data only
Past Sales     ──▶ Team members + creator only (most restricted)
```

### Audit Logging

```sql
-- All sensitive actions logged
audit_logs (
  action,
  user_id,
  target_user_id,
  agency_id,
  details,
  ip_address,
  user_agent
)
```

### Critical Security Rules

1. **Roles in separate table** - Never store roles on profiles
2. **RLS on all tables** - No exceptions
3. **Service role for logging** - Audit writes bypass RLS
4. **Team privacy for past_sales** - Not visible to office managers
5. **CORS validation** - Dynamic origin checking

---

## Quick Reference

### URLs

| Environment | URL |
|-------------|-----|
| Production | https://www.agentbuddy.co |
| Beacon | https://beacon.agentbuddy.co |
| Supabase Dashboard | https://supabase.com/dashboard/project/mxsefnpxrnamupatgrlb |

### Supabase

```
Project ID: mxsefnpxrnamupatgrlb
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Key Secrets

```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
RESEND_API_KEY
BEACON_API_KEY
GOOGLE_MAPS_API_KEY
```

---

## Contributing

### Before Making Changes

1. Check existing patterns in similar features
2. Follow the component organization structure
3. Use semantic tokens from design system
4. Add RLS policies for new tables
5. Include audit logging for sensitive operations

### Code Style

- TypeScript strict mode
- Functional components with hooks
- TanStack Query for server state
- Tailwind for styling (semantic tokens only)
- Framer Motion for animations

---

*This document should be updated as the architecture evolves.*
