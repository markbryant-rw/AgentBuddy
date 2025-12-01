# Data Export Guide for Supabase Migration

## Overview
This guide explains how to export your actual database data for migration to a new Supabase instance.

## Method 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **Database → Backups**
3. Click **Download** on your most recent backup
4. This will give you a complete `.sql` file with all data

## Method 2: Command Line with pg_dump
```bash
# Export data only (with INSERT statements)
pg_dump -h db.lndyurrvcblxnkjprdwr.supabase.co \
  -U postgres \
  -d postgres \
  --data-only \
  --inserts \
  > data-only.sql
```

## Method 3: Manual Export via SQL Editor
Run these queries in your Supabase SQL Editor to generate INSERT statements for specific tables:

### Example: Export agencies table
```sql
SELECT 
  'INSERT INTO public.agencies (id, name, slug, bio, brand, brand_color, logo_url, invite_code, office_channel_id, is_archived, created_by, created_at, updated_at) VALUES ' ||
  string_agg(
    '(' || 
    quote_literal(id::text) || ', ' ||
    quote_literal(name) || ', ' ||
    quote_literal(slug) || ', ' ||
    COALESCE(quote_literal(bio), 'NULL') || ', ' ||
    COALESCE(quote_literal(brand), 'NULL') || ', ' ||
    COALESCE(quote_literal(brand_color), 'NULL') || ', ' ||
    COALESCE(quote_literal(logo_url), 'NULL') || ', ' ||
    COALESCE(quote_literal(invite_code), 'NULL') || ', ' ||
    COALESCE(quote_literal(office_channel_id::text), 'NULL') || ', ' ||
    is_archived || ', ' ||
    quote_literal(created_by::text) || ', ' ||
    quote_literal(created_at::text) || ', ' ||
    quote_literal(updated_at::text) ||
    ')',
    ', ' || E'\n'
  ) || ';'
FROM public.agencies;
```

## Export Order (Respects Foreign Keys)
Tables should be exported/imported in this order to maintain referential integrity:

1. **Foundation** (no dependencies)
   - agencies
   - subscription_plans
   - modules
   - bug_categories
   - provider_categories
   - discount_codes
   - platform_settings

2. **Users & Roles**
   - profiles
   - user_roles
   - office_manager_assignments

3. **Teams**
   - teams
   - team_members

4. **Subscriptions**
   - agency_financials
   - agency_subscriptions
   - agency_subscription_plans

5. **Module Policies**
   - module_policies
   - module_audit_events
   - module_usage_stats

6. **Messaging**
   - conversations
   - conversation_participants
   - messages

7. **Lead Sources**
   - lead_source_options

8. **Property Pipeline**
   - logged_appraisals
   - listings_pipeline
   - listing_comments
   - listing_descriptions
   - listing_pipeline_stats

9. **Transactions**
   - transactions
   - transaction_milestones
   - transaction_links

10. **Past Sales**
    - past_sales

11. **Vendor Reports**
    - vendor_reports
    - vendor_report_opens
    - vendor_report_link_clicks

12. **Tasks**
    - task_boards
    - task_lists
    - task_projects
    - task_tags
    - tasks
    - task_activity
    - task_assignment_notifications
    - task_attachments
    - task_comments
    - task_followers
    - task_reminders
    - task_time_logs

13. **Daily Planner**
    - daily_planner_items
    - daily_planner_assignments
    - daily_planner_recurring_templates
    - daily_planner_generated_instances

14. **KPIs & Goals**
    - kpi_entries
    - kpi_targets
    - goals
    - daily_activities
    - daily_log_tracker
    - quarterly_reviews

15. **Service Providers**
    - service_providers
    - service_provider_notes
    - service_provider_reviews

16. **Notes**
    - notes

17. **Knowledge Base**
    - knowledge_base_categories
    - knowledge_base_playbooks
    - knowledge_base_cards
    - kb_card_views

18. **Coaching**
    - coaching_conversations
    - coaching_conversation_messages

19. **Social**
    - friend_connections
    - birthday_celebrations
    - social_posts
    - social_post_comments
    - social_post_reactions

20. **Feedback**
    - bug_reports
    - bug_report_categories
    - bug_report_comments
    - bug_report_votes
    - user_bug_points
    - feature_requests
    - feature_request_comments
    - feature_request_votes

21. **Help Requests**
    - help_requests

22. **Invitations**
    - pending_invitations
    - invitation_activity_log
    - invitation_rate_limits

23. **Notifications**
    - notifications

24. **Admin Logs**
    - admin_activity_log
    - admin_impersonation_log
    - audit_logs

25. **Miscellaneous**
    - ai_usage_tracking
    - stat_snapshots
    - system_health_metrics

## Migration Steps

1. **Export Schema**
   ```bash
   psql -h db.lndyurrvcblxnkjprdwr.supabase.co \
     -U postgres \
     -d postgres \
     -f supabase/schema-only.sql
   ```

2. **Export Data**
   - Use Method 1, 2, or 3 above to get your data

3. **Import to New Instance**
   ```bash
   # First import schema
   psql -h <new-host> -U postgres -d postgres -f schema-only.sql
   
   # Then import data
   psql -h <new-host> -U postgres -d postgres -f data-only.sql
   ```

4. **Verify**
   - Check row counts match: `SELECT COUNT(*) FROM <table_name>;`
   - Test critical queries
   - Verify RLS policies work
