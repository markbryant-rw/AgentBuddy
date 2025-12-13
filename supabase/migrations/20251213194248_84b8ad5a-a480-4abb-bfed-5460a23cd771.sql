-- ============================================================================
-- Beacon Integration System
-- ============================================================================
--
-- This migration creates the complete database schema for Beacon integration.
--
-- CRITICAL CONCEPT - Property Identification:
-- ===========================================
-- Beacon uses two IDs for properties:
-- 1. agentbuddy_property_id: STABLE ID from AgentBuddy properties table (NEVER changes)
-- 2. external_lead_id: UNSTABLE ID that changes when property moves between stages
--
-- ALWAYS use agentbuddy_property_id as the foreign key and primary identifier.
-- The external_lead_id is only for Beacon API communication and may change.
--
-- Tables:
-- 1. team_integrations - Team-level integration configurations
-- 2. beacon_property_links - Links AgentBuddy properties to Beacon properties
-- 3. beacon_reports - Local tracking of Beacon reports
-- 4. beacon_webhook_events - Webhook event log
--
-- ============================================================================

-- ============================================================================
-- TABLE 1: team_integrations
-- ============================================================================
-- Stores integration configurations for teams (Beacon, Stripe, etc.)
-- Each team can have multiple integrations enabled

CREATE TABLE IF NOT EXISTS public.team_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Team reference
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,

  -- Integration details
  integration_name TEXT NOT NULL,
  -- Supported integrations: 'beacon', 'stripe', 'mailchimp', etc.

  -- Beacon-specific fields
  api_key TEXT,
  -- Encrypted API key for Beacon integration

  beacon_team_id TEXT,
  -- Team ID in Beacon system

  workspace_id TEXT,
  -- Workspace/environment ID in Beacon

  -- Status
  enabled BOOLEAN DEFAULT false NOT NULL,
  -- Whether this integration is currently active

  last_sync_at TIMESTAMPTZ,
  -- Last successful sync with external system

  -- Configuration
  config JSONB DEFAULT '{}'::jsonb,
  -- Additional configuration options specific to integration

  -- Metadata
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Constraints
  CONSTRAINT team_integrations_integration_name_check
    CHECK (integration_name IN ('beacon', 'stripe', 'mailchimp', 'zapier', 'hubspot'))
);

-- Unique constraint: one integration per team per integration type
CREATE UNIQUE INDEX idx_team_integrations_team_integration
  ON public.team_integrations(team_id, integration_name);

-- Index for querying by integration type
CREATE INDEX idx_team_integrations_name
  ON public.team_integrations(integration_name)
  WHERE enabled = true;

-- Comment on table
COMMENT ON TABLE public.team_integrations IS
  'Stores third-party integration configurations for teams. Each team can enable multiple integrations with their own credentials and settings.';

COMMENT ON COLUMN public.team_integrations.api_key IS
  'Encrypted API key for the integration. Should be encrypted at rest.';

COMMENT ON COLUMN public.team_integrations.enabled IS
  'Whether the integration is currently active. Disabled integrations retain their configuration for re-enabling.';

-- ============================================================================
-- TABLE 2: beacon_property_links
-- ============================================================================
-- Links AgentBuddy properties to Beacon properties
-- CRITICAL: Uses agentbuddy_property_id as stable identifier

CREATE TABLE IF NOT EXISTS public.beacon_property_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- AgentBuddy property reference (STABLE - never changes)
  agentbuddy_property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  -- CRITICAL: This is the STABLE property ID from properties table
  -- Use this for all foreign keys and queries

  -- Beacon property reference (may change during property lifecycle)
  beacon_property_slug TEXT NOT NULL,
  -- Beacon's property identifier/slug
  -- This is used for Beacon API calls but should NOT be used as foreign key

  external_lead_id TEXT,
  -- Current external_lead_id from Beacon (UNSTABLE - changes on stage transitions)
  -- Store this for API calls but don't rely on it for data integrity

  -- Team reference
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,

  -- Tracking metrics
  total_reports INTEGER DEFAULT 0 NOT NULL,
  -- Total number of reports created for this property

  latest_report_id TEXT,
  -- Beacon report ID of most recent report

  latest_report_created_at TIMESTAMPTZ,
  -- When the latest report was created

  -- Sync metadata
  last_synced_at TIMESTAMPTZ,
  -- Last time we synced data with Beacon for this property

  sync_status TEXT DEFAULT 'active',
  -- Sync status: 'active', 'error', 'disabled'

  sync_error TEXT,
  -- Last sync error message if any

  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  -- Store any additional Beacon property data

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Constraints
  CONSTRAINT beacon_property_links_sync_status_check
    CHECK (sync_status IN ('active', 'error', 'disabled'))
);

-- Unique constraint: one Beacon property per AgentBuddy property per team
CREATE UNIQUE INDEX idx_beacon_property_links_unique
  ON public.beacon_property_links(agentbuddy_property_id, team_id);

-- Index on agentbuddy_property_id for fast lookups
CREATE INDEX idx_beacon_property_links_property
  ON public.beacon_property_links(agentbuddy_property_id);

-- Index on team_id for team-level queries
CREATE INDEX idx_beacon_property_links_team
  ON public.beacon_property_links(team_id);

-- Index on beacon_property_slug for reverse lookups from webhooks
CREATE INDEX idx_beacon_property_links_slug
  ON public.beacon_property_links(beacon_property_slug);

-- Index on external_lead_id for webhook matching (even though it's unstable)
CREATE INDEX idx_beacon_property_links_external_lead
  ON public.beacon_property_links(external_lead_id)
  WHERE external_lead_id IS NOT NULL;

-- Comment on table
COMMENT ON TABLE public.beacon_property_links IS
  'Links AgentBuddy properties to Beacon properties. CRITICAL: Always use agentbuddy_property_id as the stable identifier. The external_lead_id can change when properties move between pipeline stages.';

COMMENT ON COLUMN public.beacon_property_links.agentbuddy_property_id IS
  'STABLE property ID from AgentBuddy properties table. This NEVER changes and should be used for all foreign keys and data integrity.';

COMMENT ON COLUMN public.beacon_property_links.external_lead_id IS
  'UNSTABLE external lead ID from Beacon. This changes when property moves between stages (Lead → Listing → Transaction). Store for API calls but do not use as foreign key.';

COMMENT ON COLUMN public.beacon_property_links.total_reports IS
  'Cached count of total reports created. Updated via trigger on beacon_reports table.';

-- ============================================================================
-- TABLE 3: beacon_reports
-- ============================================================================
-- Local tracking of Beacon reports created from AgentBuddy
-- Stores metadata for analytics and quick lookups

CREATE TABLE IF NOT EXISTS public.beacon_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Beacon reference
  beacon_report_id TEXT NOT NULL,
  -- Report ID from Beacon system

  -- AgentBuddy property reference (STABLE)
  agentbuddy_property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  -- CRITICAL: Use stable property ID, not appraisal.id or listing.id

  -- Team reference
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,

  -- Report details
  type TEXT NOT NULL,
  -- Report type: 'cma', 'buyer_guide', 'seller_guide', 'market_snapshot', 'property_report', 'custom'

  status TEXT DEFAULT 'pending' NOT NULL,
  -- Status: 'draft', 'pending', 'processing', 'completed', 'failed', 'cancelled'

  -- URLs
  report_url TEXT,
  -- URL to view the report in Beacon

  pdf_url TEXT,
  -- URL to download PDF version

  -- Delivery
  delivery_method TEXT,
  -- How report was delivered: 'email', 'sms', 'link', 'webhook'

  recipient_email TEXT,
  -- Email recipient if delivered via email

  recipient_phone TEXT,
  -- Phone recipient if delivered via SMS

  -- Timing
  created_by UUID REFERENCES public.profiles(id),
  -- AgentBuddy user who created the report

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  -- When report was requested

  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  -- Last update timestamp

  completed_at TIMESTAMPTZ,
  -- When report generation completed

  -- Error handling
  error_message TEXT,
  -- Error message if report generation failed

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  -- Additional report options and data

  -- Soft delete
  deleted_at TIMESTAMPTZ,
  -- Soft delete timestamp

  -- Constraints
  CONSTRAINT beacon_reports_type_check
    CHECK (type IN ('cma', 'buyer_guide', 'seller_guide', 'market_snapshot', 'property_report', 'custom')),

  CONSTRAINT beacon_reports_status_check
    CHECK (status IN ('draft', 'pending', 'processing', 'completed', 'failed', 'cancelled')),

  CONSTRAINT beacon_reports_delivery_method_check
    CHECK (delivery_method IN ('email', 'sms', 'link', 'webhook'))
);

-- Unique constraint: one Beacon report ID per team
CREATE UNIQUE INDEX idx_beacon_reports_beacon_id
  ON public.beacon_reports(team_id, beacon_report_id);

-- Index on agentbuddy_property_id for property-level queries
CREATE INDEX idx_beacon_reports_property
  ON public.beacon_reports(agentbuddy_property_id)
  WHERE deleted_at IS NULL;

-- Index on team_id for team-level queries
CREATE INDEX idx_beacon_reports_team
  ON public.beacon_reports(team_id)
  WHERE deleted_at IS NULL;

-- Index on status for filtering active reports
CREATE INDEX idx_beacon_reports_status
  ON public.beacon_reports(status)
  WHERE deleted_at IS NULL;

-- Index on type for analytics
CREATE INDEX idx_beacon_reports_type
  ON public.beacon_reports(type)
  WHERE deleted_at IS NULL;

-- Index on created_at for date-based queries
CREATE INDEX idx_beacon_reports_created_at
  ON public.beacon_reports(created_at DESC)
  WHERE deleted_at IS NULL;

-- Composite index for common query pattern: property + status
CREATE INDEX idx_beacon_reports_property_status
  ON public.beacon_reports(agentbuddy_property_id, status)
  WHERE deleted_at IS NULL;

-- Comment on table
COMMENT ON TABLE public.beacon_reports IS
  'Local tracking of Beacon reports created from AgentBuddy. Stores metadata for analytics and quick lookups without hitting Beacon API.';

COMMENT ON COLUMN public.beacon_reports.agentbuddy_property_id IS
  'STABLE property ID from properties table. Always use property.id, not appraisal.id or listing.id.';

COMMENT ON COLUMN public.beacon_reports.deleted_at IS
  'Soft delete timestamp. Reports are soft-deleted to maintain audit trail.';

-- ============================================================================
-- TABLE 4: beacon_webhook_events
-- ============================================================================
-- Stores webhook events received from Beacon
-- Used for debugging, auditing, and reprocessing failed events

CREATE TABLE IF NOT EXISTS public.beacon_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event details
  event_type TEXT NOT NULL,
  -- Type of event: 'report.created', 'report.completed', 'property.stage_changed', etc.

  event_id TEXT NOT NULL,
  -- Unique event ID from Beacon

  -- Payload
  payload JSONB NOT NULL,
  -- Full webhook payload from Beacon

  -- Property reference (extracted from payload)
  agentbuddy_property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  -- Extracted property ID for indexing (may be null for non-property events)

  -- Team reference (extracted from payload or matched)
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  -- Matched team ID (may be null if can't be determined)

  -- Processing status
  processed BOOLEAN DEFAULT false NOT NULL,
  -- Whether this event has been successfully processed

  processed_at TIMESTAMPTZ,
  -- When event was successfully processed

  processing_error TEXT,
  -- Error message if processing failed

  retry_count INTEGER DEFAULT 0 NOT NULL,
  -- Number of times we've tried to process this event

  -- Timing
  received_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  -- When webhook was received by our system

  -- Constraints
  CONSTRAINT beacon_webhook_events_retry_count_check
    CHECK (retry_count >= 0 AND retry_count <= 10)
);

-- Unique constraint: one event ID (prevent duplicate processing)
CREATE UNIQUE INDEX idx_beacon_webhook_events_event_id
  ON public.beacon_webhook_events(event_id);

-- Index on agentbuddy_property_id for property-level queries
CREATE INDEX idx_beacon_webhook_events_property
  ON public.beacon_webhook_events(agentbuddy_property_id)
  WHERE agentbuddy_property_id IS NOT NULL;

-- Index on processed status for finding unprocessed events
CREATE INDEX idx_beacon_webhook_events_unprocessed
  ON public.beacon_webhook_events(received_at DESC)
  WHERE processed = false;

-- Index on team_id for team-level queries
CREATE INDEX idx_beacon_webhook_events_team
  ON public.beacon_webhook_events(team_id)
  WHERE team_id IS NOT NULL;

-- Index on event_type for analytics
CREATE INDEX idx_beacon_webhook_events_type
  ON public.beacon_webhook_events(event_type, received_at DESC);

-- Comment on table
COMMENT ON TABLE public.beacon_webhook_events IS
  'Stores all webhook events received from Beacon. Used for debugging, auditing, and reprocessing failed events. Service role access only.';

COMMENT ON COLUMN public.beacon_webhook_events.processed IS
  'Whether this event has been successfully processed. Unprocessed events can be retried.';

COMMENT ON COLUMN public.beacon_webhook_events.retry_count IS
  'Number of processing attempts. Limited to 10 to prevent infinite retry loops.';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.team_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beacon_property_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beacon_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beacon_webhook_events ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- team_integrations RLS Policies
-- ----------------------------------------------------------------------------

-- Team members can view their team's integrations
CREATE POLICY "Team members can view team integrations"
  ON public.team_integrations FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid()
    )
  );

-- Team leaders and admins can manage integrations
CREATE POLICY "Team leaders can manage team integrations"
  ON public.team_integrations FOR ALL
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid()
      AND role IN ('leader', 'admin')
    )
  );

-- Platform admins can manage all integrations
CREATE POLICY "Platform admins can manage all integrations"
  ON public.team_integrations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'platform_admin'
    )
  );

-- ----------------------------------------------------------------------------
-- beacon_property_links RLS Policies
-- ----------------------------------------------------------------------------

-- Team members can view property links for their team's properties
CREATE POLICY "Team members can view property links"
  ON public.beacon_property_links FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid()
    )
  );

-- Team members can manage property links for their team's properties
CREATE POLICY "Team members can manage property links"
  ON public.beacon_property_links FOR ALL
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- beacon_reports RLS Policies
-- ----------------------------------------------------------------------------

-- Team members can view reports for their team
CREATE POLICY "Team members can view team reports"
  ON public.beacon_reports FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

-- Team members can create reports for their team
CREATE POLICY "Team members can create reports"
  ON public.beacon_reports FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid()
    )
  );

-- Users can update reports they created
CREATE POLICY "Users can update their own reports"
  ON public.beacon_reports FOR UPDATE
  USING (
    created_by = auth.uid()
    OR team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid()
      AND role IN ('leader', 'admin')
    )
  );

-- Users can soft-delete reports they created
CREATE POLICY "Users can delete their own reports"
  ON public.beacon_reports FOR DELETE
  USING (
    created_by = auth.uid()
    OR team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid()
      AND role IN ('leader', 'admin')
    )
  );

-- ----------------------------------------------------------------------------
-- beacon_webhook_events RLS Policies
-- ----------------------------------------------------------------------------

-- Service role only (no user access)
-- Webhooks are processed by backend services, not users
-- Users can view webhook logs through dedicated functions if needed

CREATE POLICY "Service role only for webhook events"
  ON public.beacon_webhook_events FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- get_beacon_integration_stats
-- ----------------------------------------------------------------------------
-- Returns aggregated statistics for Beacon integration by team

CREATE OR REPLACE FUNCTION public.get_beacon_integration_stats(p_team_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats JSONB;
BEGIN
  -- Check if user has access to this team
  IF NOT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team_id
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied to team %', p_team_id;
  END IF;

  -- Build statistics
  SELECT jsonb_build_object(
    'total_reports', COUNT(*),
    'reports_by_status', (
      SELECT jsonb_object_agg(status, count)
      FROM (
        SELECT status, COUNT(*) as count
        FROM public.beacon_reports
        WHERE team_id = p_team_id
        AND deleted_at IS NULL
        GROUP BY status
      ) status_counts
    ),
    'reports_by_type', (
      SELECT jsonb_object_agg(type, count)
      FROM (
        SELECT type, COUNT(*) as count
        FROM public.beacon_reports
        WHERE team_id = p_team_id
        AND deleted_at IS NULL
        GROUP BY type
      ) type_counts
    ),
    'total_properties_linked', (
      SELECT COUNT(*)
      FROM public.beacon_property_links
      WHERE team_id = p_team_id
    ),
    'last_report_created_at', (
      SELECT MAX(created_at)
      FROM public.beacon_reports
      WHERE team_id = p_team_id
      AND deleted_at IS NULL
    ),
    'last_sync_at', (
      SELECT last_sync_at
      FROM public.team_integrations
      WHERE team_id = p_team_id
      AND integration_name = 'beacon'
    ),
    'integration_enabled', (
      SELECT enabled
      FROM public.team_integrations
      WHERE team_id = p_team_id
      AND integration_name = 'beacon'
    )
  ) INTO v_stats
  FROM public.beacon_reports
  WHERE team_id = p_team_id
  AND deleted_at IS NULL;

  RETURN v_stats;
END;
$$;

COMMENT ON FUNCTION public.get_beacon_integration_stats(UUID) IS
  'Returns aggregated Beacon integration statistics for a team. Includes report counts by status and type, linked properties, and sync status.';

-- ----------------------------------------------------------------------------
-- increment_beacon_report_count
-- ----------------------------------------------------------------------------
-- Increments the total_reports counter on beacon_property_links

CREATE OR REPLACE FUNCTION public.increment_beacon_report_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only increment on INSERT of new report
  IF TG_OP = 'INSERT' THEN
    UPDATE public.beacon_property_links
    SET
      total_reports = total_reports + 1,
      latest_report_id = NEW.beacon_report_id,
      latest_report_created_at = NEW.created_at,
      updated_at = now()
    WHERE
      agentbuddy_property_id = NEW.agentbuddy_property_id
      AND team_id = NEW.team_id;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.increment_beacon_report_count() IS
  'Trigger function that increments total_reports counter and updates latest report info on beacon_property_links when a new report is created.';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamps
CREATE TRIGGER update_team_integrations_updated_at
  BEFORE UPDATE ON public.team_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_beacon_property_links_updated_at
  BEFORE UPDATE ON public.beacon_property_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_beacon_reports_updated_at
  BEFORE UPDATE ON public.beacon_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Increment report count when new report is created
CREATE TRIGGER increment_property_report_count
  AFTER INSERT ON public.beacon_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_beacon_report_count();

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_integrations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.beacon_property_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.beacon_reports TO authenticated;

-- Webhook events are service role only
GRANT ALL ON public.beacon_webhook_events TO service_role;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.get_beacon_integration_stats(UUID) TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
