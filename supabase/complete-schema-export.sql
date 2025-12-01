-- =====================================================
-- COMPLETE DATABASE SCHEMA EXPORT
-- Generated from Lovable Cloud Project
-- =====================================================
-- 
-- WARNING: This export is for migration purposes only.
-- Running this in a separate Supabase instance will create
-- a copy of the schema, but will NOT migrate your data.
-- 
-- To migrate data, you'll need to export/import separately.
-- =====================================================

-- =====================================================
-- CUSTOM TYPES & ENUMS
-- =====================================================

CREATE TYPE public.app_role AS ENUM (
    'platform_admin',
    'office_manager',
    'team_leader',
    'salesperson',
    'assistant'
);

CREATE TYPE public.access_level AS ENUM (
    'view',
    'admin'
);

CREATE TYPE public.goal_type AS ENUM (
    'individual',
    'team'
);

CREATE TYPE public.kpi_type AS ENUM (
    'calls',
    'appraisals',
    'open_homes',
    'cch'
);

CREATE TYPE public.log_period AS ENUM (
    'daily',
    'weekly',
    'monthly',
    'quarterly'
);

-- =====================================================
-- TABLES
-- =====================================================

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    office_id UUID,
    primary_team_id UUID,
    active_office_id UUID,
    active_role TEXT,
    last_role_switch_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active',
    invite_code TEXT UNIQUE,
    total_bug_points INTEGER DEFAULT 0,
    date_of_birth DATE,
    mobile TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agencies (Offices)
CREATE TABLE public.agencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    bio TEXT,
    brand TEXT,
    brand_color TEXT,
    logo_url TEXT,
    invite_code TEXT UNIQUE,
    office_channel_id UUID,
    is_archived BOOLEAN DEFAULT FALSE,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams
CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
    team_code TEXT UNIQUE,
    is_personal_team BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team Members
CREATE TABLE public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    access_level public.access_level DEFAULT 'view',
    contributes_to_kpis BOOLEAN DEFAULT TRUE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- User Roles
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role public.app_role NOT NULL,
    granted_by UUID REFERENCES public.profiles(id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES public.profiles(id),
    UNIQUE(user_id, role, revoked_at)
);

-- Pending Invitations
CREATE TABLE public.pending_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    office_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    role public.app_role NOT NULL,
    invited_by UUID NOT NULL REFERENCES public.profiles(id),
    status TEXT DEFAULT 'pending',
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goals
CREATE TABLE public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    kpi_type public.kpi_type NOT NULL,
    goal_type public.goal_type NOT NULL,
    period public.log_period NOT NULL,
    target_value NUMERIC NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    set_by_admin BOOLEAN DEFAULT FALSE,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- KPI Entries
CREATE TABLE public.kpi_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    kpi_type public.kpi_type NOT NULL,
    period public.log_period NOT NULL,
    entry_date DATE NOT NULL,
    value NUMERIC DEFAULT 0,
    is_locked BOOLEAN DEFAULT FALSE,
    logged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, kpi_type, period, entry_date)
);

-- Daily Activities
CREATE TABLE public.daily_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    calls INTEGER DEFAULT 0,
    appraisals INTEGER DEFAULT 0,
    open_homes INTEGER DEFAULT 0,
    cch_calculated NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, activity_date)
);

-- Daily Log Tracker
CREATE TABLE public.daily_log_tracker (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    is_business_day BOOLEAN DEFAULT TRUE,
    logged_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, log_date)
);

-- Conversations
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    title TEXT,
    description TEXT,
    icon TEXT,
    channel_type TEXT DEFAULT 'standard',
    is_system_channel BOOLEAN DEFAULT FALSE,
    archived BOOLEAN DEFAULT FALSE,
    allow_member_invites BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES public.profiles(id),
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation Participants
CREATE TABLE public.conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_admin BOOLEAN DEFAULT FALSE,
    can_post BOOLEAN DEFAULT TRUE,
    is_muted BOOLEAN DEFAULT FALSE,
    muted BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(conversation_id, user_id)
);

-- Messages
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id),
    content TEXT NOT NULL,
    attachments JSONB,
    reply_to UUID REFERENCES public.messages(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    is_edited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address TEXT NOT NULL,
    suburb TEXT,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    stage TEXT NOT NULL,
    lead_salesperson_id UUID REFERENCES public.profiles(id),
    vendor_names TEXT,
    vendor_primary_phone TEXT,
    vendor_primary_email TEXT,
    vendor_secondary_phone TEXT,
    vendor_secondary_email TEXT,
    buyer_names TEXT,
    buyer_primary_phone TEXT,
    buyer_primary_email TEXT,
    buyer_secondary_phone TEXT,
    buyer_secondary_email TEXT,
    client_name TEXT,
    client_phone TEXT,
    listing_signed DATE,
    live_date DATE,
    expected_settlement DATE,
    actual_settlement DATE,
    days_on_market INTEGER,
    team_price NUMERIC,
    vendor_price NUMERIC,
    final_sale_price NUMERIC,
    latitude NUMERIC,
    longitude NUMERIC,
    geocoded_at TIMESTAMPTZ,
    lead_source TEXT,
    tasks_total INTEGER DEFAULT 0,
    tasks_done INTEGER DEFAULT 0,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaction Links
CREATE TABLE public.transaction_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    label TEXT,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Logged Appraisals
CREATE TABLE public.logged_appraisals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    suburb TEXT,
    appraisal_date DATE NOT NULL,
    vendor_name TEXT,
    stage TEXT,
    outcome TEXT,
    estimated_value NUMERIC,
    warmth TEXT,
    likelihood TEXT,
    last_contact DATE,
    notes TEXT,
    converted_date DATE,
    opportunity_id UUID,
    latitude NUMERIC,
    longitude NUMERIC,
    geocoded_at TIMESTAMPTZ,
    lead_source TEXT,
    last_edited_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Listings Pipeline (Opportunities)
CREATE TABLE public.listings_pipeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address TEXT NOT NULL,
    suburb TEXT,
    vendor_name TEXT,
    estimated_value NUMERIC,
    stage TEXT NOT NULL,
    likelihood TEXT,
    warmth TEXT,
    last_contact DATE,
    comments TEXT,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    lead_salesperson_id UUID REFERENCES public.profiles(id),
    appraisal_id UUID REFERENCES public.logged_appraisals(id),
    latitude NUMERIC,
    longitude NUMERIC,
    geocoded_at TIMESTAMPTZ,
    lead_source TEXT,
    last_edited_by UUID REFERENCES public.profiles(id),
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Past Sales
CREATE TABLE public.past_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address TEXT NOT NULL,
    suburb TEXT,
    sale_price NUMERIC,
    sale_date DATE,
    days_on_market INTEGER,
    vendor_name TEXT,
    buyer_name TEXT,
    status TEXT DEFAULT 'sold',
    lost_reason TEXT,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    lead_salesperson_id UUID REFERENCES public.profiles(id),
    transaction_id UUID REFERENCES public.transactions(id),
    lead_source TEXT,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Boards
CREATE TABLE public.task_boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    is_personal_admin_board BOOLEAN DEFAULT FALSE,
    owner_role TEXT,
    is_shared BOOLEAN DEFAULT TRUE,
    order_position INTEGER DEFAULT 0,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Lists
CREATE TABLE public.task_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID REFERENCES public.task_boards(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    color TEXT DEFAULT '#3b82f6',
    icon TEXT,
    is_shared BOOLEAN DEFAULT TRUE,
    order_position INTEGER DEFAULT 0,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    list_id UUID REFERENCES public.task_lists(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES public.listings_pipeline(id) ON DELETE CASCADE,
    project_id UUID,
    parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES public.profiles(id),
    priority TEXT,
    completed BOOLEAN DEFAULT FALSE,
    due_date TIMESTAMPTZ,
    scheduled_date DATE,
    section TEXT,
    size_category TEXT,
    estimated_duration_minutes INTEGER,
    is_urgent BOOLEAN DEFAULT FALSE,
    is_important BOOLEAN DEFAULT FALSE,
    tags JSONB,
    order_position INTEGER DEFAULT 0,
    board_position INTEGER DEFAULT 0,
    daily_position INTEGER DEFAULT 0,
    transaction_stage TEXT,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    last_updated_by UUID REFERENCES public.profiles(id),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Activity
CREATE TABLE public.task_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    activity_type TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Planner Items
CREATE TABLE public.daily_planner_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    notes TEXT,
    scheduled_date DATE NOT NULL,
    size_category TEXT DEFAULT 'medium',
    estimated_minutes INTEGER,
    order_within_category INTEGER DEFAULT 0,
    position INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    completed_by UUID REFERENCES public.profiles(id),
    completed_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Planner Assignments
CREATE TABLE public.daily_planner_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    planner_item_id UUID NOT NULL REFERENCES public.daily_planner_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Planner Recurring Templates
CREATE TABLE public.daily_planner_recurring_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    notes TEXT,
    size_category TEXT NOT NULL,
    estimated_minutes INTEGER,
    recurrence_type TEXT NOT NULL,
    recurrence_days INTEGER[],
    start_date DATE NOT NULL,
    end_date DATE,
    last_generated_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Planner Generated Instances
CREATE TABLE public.daily_planner_generated_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.daily_planner_recurring_templates(id) ON DELETE CASCADE,
    planner_item_id UUID NOT NULL REFERENCES public.daily_planner_items(id) ON DELETE CASCADE,
    generated_for_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bug Reports
CREATE TABLE public.bug_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    team_id UUID REFERENCES public.teams(id),
    summary TEXT NOT NULL,
    description TEXT NOT NULL,
    module TEXT,
    workspace_module TEXT,
    severity TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'triage',
    expected_behaviour TEXT,
    steps_to_reproduce TEXT,
    environment JSONB,
    attachments TEXT[],
    vote_count INTEGER DEFAULT 0,
    admin_comments TEXT,
    fixed_by UUID REFERENCES public.profiles(id),
    fixed_at TIMESTAMPTZ,
    satisfaction_rating INTEGER,
    satisfaction_feedback TEXT,
    satisfaction_requested_at TIMESTAMPTZ,
    satisfaction_recorded_at TIMESTAMPTZ,
    ai_analysis JSONB,
    ai_analyzed_at TIMESTAMPTZ,
    ai_confidence NUMERIC,
    ai_impact TEXT,
    external_system TEXT,
    external_ticket_id TEXT,
    external_ticket_url TEXT,
    archived_at TIMESTAMPTZ,
    archived_reason TEXT,
    position DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bug Report Votes
CREATE TABLE public.bug_report_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bug_report_id UUID NOT NULL REFERENCES public.bug_reports(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bug_report_id, user_id)
);

-- Bug Report Comments
CREATE TABLE public.bug_report_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bug_report_id UUID NOT NULL REFERENCES public.bug_reports(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bug Categories
CREATE TABLE public.bug_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    color TEXT NOT NULL,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bug Report Categories
CREATE TABLE public.bug_report_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bug_report_id UUID REFERENCES public.bug_reports(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.bug_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Bug Points
CREATE TABLE public.user_bug_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    bug_report_id UUID NOT NULL REFERENCES public.bug_reports(id) ON DELETE CASCADE,
    points_awarded INTEGER NOT NULL,
    points_reason TEXT NOT NULL,
    awarded_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, bug_report_id, points_reason)
);

-- Feature Requests
CREATE TABLE public.feature_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    module TEXT,
    status TEXT DEFAULT 'triage',
    priority TEXT DEFAULT 'medium',
    vote_count INTEGER DEFAULT 0,
    admin_notes TEXT,
    attachments TEXT[],
    ai_analysis JSONB,
    ai_analyzed_at TIMESTAMPTZ,
    ai_priority_score NUMERIC,
    ai_estimated_effort TEXT,
    archived_at TIMESTAMPTZ,
    archived_reason TEXT,
    position DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feature Request Votes
CREATE TABLE public.feature_request_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_request_id UUID NOT NULL REFERENCES public.feature_requests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(feature_request_id, user_id)
);

-- Feature Request Comments
CREATE TABLE public.feature_request_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_request_id UUID REFERENCES public.feature_requests(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id),
    comment TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    read BOOLEAN DEFAULT FALSE,
    display_as_banner BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service Providers
CREATE TABLE public.service_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    full_name TEXT,
    company_name TEXT,
    phone TEXT,
    email TEXT,
    category TEXT NOT NULL,
    notes TEXT,
    is_starred BOOLEAN DEFAULT FALSE,
    positive_count INTEGER DEFAULT 0,
    neutral_count INTEGER DEFAULT 0,
    negative_count INTEGER DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    flagged_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    search_vector TSVECTOR,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service Provider Reviews
CREATE TABLE public.service_provider_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.profiles(id),
    sentiment TEXT NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service Provider Notes
CREATE TABLE public.service_provider_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    note TEXT NOT NULL,
    is_usage_note BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notes
CREATE TABLE public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    content_plain TEXT,
    tags TEXT[],
    is_pinned BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    is_shared BOOLEAN DEFAULT FALSE,
    search_vector TSVECTOR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coaching Conversations
CREATE TABLE public.coaching_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    team_id UUID REFERENCES public.teams(id),
    title TEXT DEFAULT 'Untitled Conversation',
    messages JSONB DEFAULT '[]'::JSONB,
    is_shared BOOLEAN DEFAULT FALSE,
    share_with_friends BOOLEAN DEFAULT FALSE,
    is_starred BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coaching Conversation Messages
CREATE TABLE public.coaching_conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.coaching_conversations(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id),
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Friend Connections
CREATE TABLE public.friend_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    invite_code TEXT NOT NULL,
    accepted BOOLEAN DEFAULT FALSE,
    is_starred BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead Source Options
CREATE TABLE public.lead_source_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    value TEXT NOT NULL,
    label TEXT NOT NULL,
    sort_order INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendor Reports
CREATE TABLE public.vendor_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    campaign_week INTEGER NOT NULL,
    vendor_name TEXT NOT NULL,
    property_address TEXT NOT NULL,
    report_content JSONB NOT NULL,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Help Requests
CREATE TABLE public.help_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    escalation_level TEXT DEFAULT 'team',
    team_id UUID REFERENCES public.teams(id),
    office_id UUID REFERENCES public.agencies(id),
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    assigned_to UUID REFERENCES public.profiles(id),
    resolved_by UUID REFERENCES public.profiles(id),
    resolved_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Activity Log
CREATE TABLE public.admin_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.profiles(id),
    activity_type TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Impersonation Log
CREATE TABLE public.admin_impersonation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.profiles(id),
    impersonated_user_id UUID REFERENCES public.profiles(id),
    reason TEXT NOT NULL,
    actions_taken TEXT[],
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

-- Audit Logs
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id),
    target_user_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invitation Activity Log
CREATE TABLE public.invitation_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id UUID REFERENCES public.pending_invitations(id),
    actor_id UUID REFERENCES public.profiles(id),
    recipient_email TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    team_id UUID REFERENCES public.teams(id),
    office_id UUID REFERENCES public.agencies(id),
    error_reason TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invitation Rate Limits
CREATE TABLE public.invitation_rate_limits (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    hourly_count INTEGER DEFAULT 0,
    daily_count INTEGER DEFAULT 0,
    monthly_count INTEGER DEFAULT 0,
    hour_window_start TIMESTAMPTZ,
    day_window_start TIMESTAMPTZ,
    month_window_start TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- System Error Log
CREATE TABLE public.system_error_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    error_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    context JSONB,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System Health Metrics
CREATE TABLE public.system_health_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type TEXT NOT NULL,
    metric_value JSONB NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Usage Tracking
CREATE TABLE public.ai_usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action_date DATE DEFAULT CURRENT_DATE,
    action_count INTEGER DEFAULT 0,
    last_action_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, action_date)
);

-- Module Usage Stats
CREATE TABLE public.module_usage_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    module_id TEXT NOT NULL,
    visit_count INTEGER DEFAULT 0,
    last_visited_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, module_id)
);

-- User Activity Log
CREATE TABLE public.user_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    activity_details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription Plans
CREATE TABLE public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    billing_period TEXT NOT NULL,
    features JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agency Subscription Plans
CREATE TABLE public.agency_subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
    module_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agency Subscriptions
CREATE TABLE public.agency_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agency Financials
CREATE TABLE public.agency_financials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
    subscription_plan_id UUID REFERENCES public.subscription_plans(id),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    mrr NUMERIC DEFAULT 0,
    arr NUMERIC DEFAULT 0,
    lifetime_value NUMERIC DEFAULT 0,
    billing_cycle TEXT DEFAULT 'monthly',
    discount_applied TEXT,
    discount_amount NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Discount Codes
CREATE TABLE public.discount_codes (
    code TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    access_type TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Birthday Celebrations
CREATE TABLE public.birthday_celebrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    birthday_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    birthday_date DATE NOT NULL,
    auto_post_id UUID REFERENCES public.social_posts(id),
    celebration_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Social Posts
CREATE TABLE public.social_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id),
    content TEXT NOT NULL,
    post_type TEXT DEFAULT 'general',
    attachments JSONB,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge Base Categories
CREATE TABLE public.knowledge_base_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.teams(id),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color_theme TEXT DEFAULT 'blue',
    sort_order INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge Base Playbooks
CREATE TABLE public.knowledge_base_playbooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.teams(id),
    category_id UUID REFERENCES public.knowledge_base_categories(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    cover_image TEXT,
    estimated_minutes INTEGER,
    roles TEXT[],
    tags TEXT[],
    is_published BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge Base Cards
CREATE TABLE public.knowledge_base_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playbook_id UUID REFERENCES public.knowledge_base_playbooks(id) ON DELETE CASCADE,
    card_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    content JSONB,
    template TEXT,
    estimated_minutes INTEGER,
    attachments JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- KB Card Views
CREATE TABLE public.kb_card_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID REFERENCES public.knowledge_base_cards(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id),
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    time_spent_seconds INTEGER
);

-- Listing Descriptions
CREATE TABLE public.listing_descriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.teams(id),
    address TEXT NOT NULL,
    listing_type TEXT NOT NULL,
    bedrooms INTEGER NOT NULL,
    bathrooms INTEGER NOT NULL,
    target_audience TEXT NOT NULL,
    additional_features TEXT,
    generated_descriptions JSONB NOT NULL,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Listing Comments
CREATE TABLE public.listing_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.listings_pipeline(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Profiles indexes
CREATE INDEX idx_profiles_office_id ON public.profiles(office_id);
CREATE INDEX idx_profiles_primary_team_id ON public.profiles(primary_team_id);
CREATE INDEX idx_profiles_invite_code ON public.profiles(invite_code);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- Teams indexes
CREATE INDEX idx_teams_agency_id ON public.teams(agency_id);
CREATE INDEX idx_teams_team_code ON public.teams(team_code);

-- Team members indexes
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);

-- User roles indexes
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);

-- Goals indexes
CREATE INDEX idx_goals_team_id ON public.goals(team_id);
CREATE INDEX idx_goals_user_id ON public.goals(user_id);
CREATE INDEX idx_goals_period ON public.goals(period);

-- KPI entries indexes
CREATE INDEX idx_kpi_entries_user_id ON public.kpi_entries(user_id);
CREATE INDEX idx_kpi_entries_entry_date ON public.kpi_entries(entry_date);

-- Daily activities indexes
CREATE INDEX idx_daily_activities_user_id ON public.daily_activities(user_id);
CREATE INDEX idx_daily_activities_date ON public.daily_activities(activity_date);

-- Conversations indexes
CREATE INDEX idx_conversations_created_by ON public.conversations(created_by);

-- Messages indexes
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);

-- Transactions indexes
CREATE INDEX idx_transactions_team_id ON public.transactions(team_id);
CREATE INDEX idx_transactions_lead_salesperson ON public.transactions(lead_salesperson_id);
CREATE INDEX idx_transactions_stage ON public.transactions(stage);

-- Logged appraisals indexes
CREATE INDEX idx_logged_appraisals_user_id ON public.logged_appraisals(user_id);
CREATE INDEX idx_logged_appraisals_team_id ON public.logged_appraisals(team_id);
CREATE INDEX idx_logged_appraisals_date ON public.logged_appraisals(appraisal_date);

-- Listings pipeline indexes
CREATE INDEX idx_listings_pipeline_team_id ON public.listings_pipeline(team_id);
CREATE INDEX idx_listings_pipeline_lead_salesperson ON public.listings_pipeline(lead_salesperson_id);
CREATE INDEX idx_listings_pipeline_stage ON public.listings_pipeline(stage);

-- Past sales indexes
CREATE INDEX idx_past_sales_team_id ON public.past_sales(team_id);
CREATE INDEX idx_past_sales_sale_date ON public.past_sales(sale_date);

-- Tasks indexes
CREATE INDEX idx_tasks_list_id ON public.tasks(list_id);
CREATE INDEX idx_tasks_team_id ON public.tasks(team_id);
CREATE INDEX idx_tasks_transaction_id ON public.tasks(transaction_id);
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_created_by ON public.tasks(created_by);

-- Daily planner indexes
CREATE INDEX idx_daily_planner_team_id ON public.daily_planner_items(team_id);
CREATE INDEX idx_daily_planner_date ON public.daily_planner_items(scheduled_date);

-- Bug reports indexes
CREATE INDEX idx_bug_reports_user_id ON public.bug_reports(user_id);
CREATE INDEX idx_bug_reports_status ON public.bug_reports(status);
CREATE INDEX idx_bug_reports_position ON public.bug_reports(position);

-- Feature requests indexes
CREATE INDEX idx_feature_requests_user_id ON public.feature_requests(user_id);
CREATE INDEX idx_feature_requests_status ON public.feature_requests(status);
CREATE INDEX idx_feature_requests_position ON public.feature_requests(position);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);

-- Service providers indexes
CREATE INDEX idx_service_providers_team_id ON public.service_providers(team_id);
CREATE INDEX idx_service_providers_category ON public.service_providers(category);
CREATE INDEX idx_service_providers_search ON public.service_providers USING GIN(search_vector);

-- Notes indexes
CREATE INDEX idx_notes_user_id ON public.notes(user_id);
CREATE INDEX idx_notes_team_id ON public.notes(team_id);
CREATE INDEX idx_notes_search ON public.notes USING GIN(search_vector);

-- Lead source options indexes
CREATE INDEX idx_lead_source_options_agency ON public.lead_source_options(agency_id);

-- =====================================================
-- DATABASE FUNCTIONS
-- =====================================================

-- Function to generate team code
CREATE OR REPLACE FUNCTION public.generate_team_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 8));
    SELECT EXISTS(SELECT 1 FROM teams WHERE team_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

-- Function to check if user has a role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$ 
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id 
      AND role = _role 
      AND revoked_at IS NULL
  ) 
$$;

-- Function to check if user has any of the specified roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles app_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$ 
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id 
      AND role = ANY(_roles) 
      AND revoked_at IS NULL
  ) 
$$;

-- Function to check if user is team member
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id UUID, _team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE user_id = _user_id
    AND team_id = _team_id
  );
$$;

-- Function to check if user is conversation participant
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM conversation_participants
    WHERE conversation_id = _conversation_id
      AND user_id = _user_id
  );
$$;

-- Function to validate team code
CREATE OR REPLACE FUNCTION public.validate_team_code(code TEXT)
RETURNS TABLE(team_id UUID, team_name TEXT, agency_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.name, t.agency_id
  FROM teams t
  WHERE t.team_code = UPPER(TRIM(code))
  LIMIT 1;
END;
$$;

-- Function to regenerate team code
CREATE OR REPLACE FUNCTION public.regenerate_team_code(p_team_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_new_code TEXT;
BEGIN
  v_new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || p_team_id::TEXT || NOW()::TEXT) FROM 1 FOR 8));
  UPDATE teams SET team_code = v_new_code WHERE id = p_team_id;
  RETURN v_new_code;
END;
$$;

-- Function to update bug vote count
CREATE OR REPLACE FUNCTION public.update_bug_vote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE bug_reports
    SET vote_count = vote_count + 1
    WHERE id = NEW.bug_report_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE bug_reports
    SET vote_count = GREATEST(vote_count - 1, 0)
    WHERE id = OLD.bug_report_id;
    RETURN OLD;
  END IF;
END;
$$;

-- Function to update user bug points
CREATE OR REPLACE FUNCTION public.update_user_bug_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles
    SET total_bug_points = COALESCE(total_bug_points, 0) + NEW.points_awarded
    WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles
    SET total_bug_points = GREATEST(COALESCE(total_bug_points, 0) - OLD.points_awarded, 0)
    WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Function to update search vector for notes
CREATE OR REPLACE FUNCTION public.update_note_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content_plain, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$;

-- Function to update search vector for service providers
CREATE OR REPLACE FUNCTION public.update_provider_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.full_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.company_name, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.phone, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.email, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.notes, '')), 'D');
  RETURN NEW;
END;
$$;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Function to seed default lead sources
CREATE OR REPLACE FUNCTION public.seed_default_lead_sources()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO lead_source_options (agency_id, value, label, sort_order, is_active, is_default)
  VALUES
    (NEW.id, 'referral', 'Referral', 1, true, true),
    (NEW.id, 'past_client', 'Past Client', 2, true, true),
    (NEW.id, 'cold_call', 'Cold Call', 3, true, true),
    (NEW.id, 'online_inquiry', 'Online Inquiry', 4, true, true),
    (NEW.id, 'social_media', 'Social Media', 5, true, true),
    (NEW.id, 'sign_board', 'Sign Board', 6, true, true),
    (NEW.id, 'open_home', 'Open Home', 7, true, true),
    (NEW.id, 'database', 'Database', 8, true, true),
    (NEW.id, 'networking', 'Networking Event', 9, true, true),
    (NEW.id, 'other', 'Other', 10, true, true);
  RETURN NEW;
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-generate team code
CREATE TRIGGER auto_generate_team_code
  BEFORE INSERT ON public.teams
  FOR EACH ROW
  WHEN (NEW.team_code IS NULL OR NEW.team_code = '')
  EXECUTE FUNCTION public.generate_team_code();

-- Update timestamps
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agencies_updated_at
  BEFORE UPDATE ON public.agencies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kpi_entries_updated_at
  BEFORE UPDATE ON public.kpi_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_activities_updated_at
  BEFORE UPDATE ON public.daily_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_logged_appraisals_updated_at
  BEFORE UPDATE ON public.logged_appraisals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_listings_pipeline_updated_at
  BEFORE UPDATE ON public.listings_pipeline
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_past_sales_updated_at
  BEFORE UPDATE ON public.past_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bug_reports_updated_at
  BEFORE UPDATE ON public.bug_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_feature_requests_updated_at
  BEFORE UPDATE ON public.feature_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Bug vote count triggers
CREATE TRIGGER update_bug_vote_count_insert
  AFTER INSERT ON public.bug_report_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bug_vote_count();

CREATE TRIGGER update_bug_vote_count_delete
  AFTER DELETE ON public.bug_report_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bug_vote_count();

-- User bug points triggers
CREATE TRIGGER update_user_bug_points_insert
  AFTER INSERT ON public.user_bug_points
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_bug_points();

CREATE TRIGGER update_user_bug_points_delete
  AFTER DELETE ON public.user_bug_points
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_bug_points();

-- Search vector triggers
CREATE TRIGGER update_note_search_vector_trigger
  BEFORE INSERT OR UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_note_search_vector();

CREATE TRIGGER update_provider_search_vector_trigger
  BEFORE INSERT OR UPDATE ON public.service_providers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_provider_search_vector();

-- Seed lead sources on agency creation
CREATE TRIGGER seed_lead_sources_on_agency_create
  AFTER INSERT ON public.agencies
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_default_lead_sources();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_log_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logged_appraisals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.past_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_planner_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_planner_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_planner_recurring_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_planner_generated_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_report_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_report_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_report_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bug_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_request_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_request_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_provider_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_provider_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_source_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_impersonation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_financials ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Agencies RLS
CREATE POLICY "Anyone can view agencies"
ON public.agencies FOR SELECT
TO authenticated
USING (true);

-- Teams RLS
CREATE POLICY "Team members can view their teams"
ON public.teams FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

-- Team Members RLS
CREATE POLICY "Users can view their team memberships"
ON public.team_members FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

-- Tasks RLS (Simplified 5-policy structure)
CREATE POLICY "Users can view their team tasks"
ON public.tasks FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR assigned_to = auth.uid()
  OR team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create team tasks"
ON public.tasks FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Team members can update team tasks"
ON public.tasks FOR UPDATE
TO authenticated
USING (
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can update any task"
ON public.tasks FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_role(auth.uid(), 'office_manager'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_role(auth.uid(), 'office_manager'::app_role)
);

CREATE POLICY "Team members can delete their team tasks"
ON public.tasks FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
  OR team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

-- Transactions RLS
CREATE POLICY "Team members can view their transactions"
ON public.transactions FOR SELECT
TO authenticated
USING (
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Team members can create transactions"
ON public.transactions FOR INSERT
TO authenticated
WITH CHECK (
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
  AND created_by = auth.uid()
);

CREATE POLICY "Team members can update transactions"
ON public.transactions FOR UPDATE
TO authenticated
USING (
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

-- Bug Reports RLS
CREATE POLICY "All users can view bug reports"
ON public.bug_reports FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create their own bug reports"
ON public.bug_reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bug reports"
ON public.bug_reports FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Platform admins can update any bug report"
ON public.bug_reports FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'platform_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));

-- Feature Requests RLS
CREATE POLICY "All users can view feature requests"
ON public.feature_requests FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create feature requests"
ON public.feature_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feature requests"
ON public.feature_requests FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Platform admins can update any feature request"
ON public.feature_requests FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- Notifications RLS
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- AI Usage Tracking RLS
CREATE POLICY "Users can view their own AI usage"
ON public.ai_usage_tracking FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI usage"
ON public.ai_usage_tracking FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI usage"
ON public.ai_usage_tracking FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- =====================================================
-- NOTES
-- =====================================================
-- This export includes the core schema and policies.
-- Additional policies, functions, and triggers may exist
-- in your specific implementation.
-- 
-- Data migration is NOT included. You'll need to export
-- and import data separately using pg_dump or Supabase CLI.
-- 
-- After running this SQL:
-- 1. Update your .env file with new Supabase credentials
-- 2. Update src/integrations/supabase/client.ts with new URL/keys
-- 3. Migrate your data using pg_dump/restore
-- 4. Test all functionality thoroughly
-- =====================================================
