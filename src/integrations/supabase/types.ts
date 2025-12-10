export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_activity_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_impersonation_log: {
        Row: {
          admin_id: string
          created_at: string | null
          ended_at: string | null
          id: string
          impersonated_user_id: string
          reason: string | null
          started_at: string
        }
        Insert: {
          admin_id: string
          created_at?: string | null
          ended_at?: string | null
          id?: string
          impersonated_user_id: string
          reason?: string | null
          started_at?: string
        }
        Update: {
          admin_id?: string
          created_at?: string | null
          ended_at?: string | null
          id?: string
          impersonated_user_id?: string
          reason?: string | null
          started_at?: string
        }
        Relationships: []
      }
      admin_voucher_codes: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          current_redemptions: number | null
          description: string | null
          expires_at: string | null
          grace_period_days: number | null
          id: string
          is_active: boolean | null
          license_duration_days: number | null
          license_type: string
          max_redemptions: number | null
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          current_redemptions?: number | null
          description?: string | null
          expires_at?: string | null
          grace_period_days?: number | null
          id?: string
          is_active?: boolean | null
          license_duration_days?: number | null
          license_type: string
          max_redemptions?: number | null
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          current_redemptions?: number | null
          description?: string | null
          expires_at?: string | null
          grace_period_days?: number | null
          id?: string
          is_active?: boolean | null
          license_duration_days?: number | null
          license_type?: string
          max_redemptions?: number | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_voucher_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agencies: {
        Row: {
          account_status:
            | Database["public"]["Enums"]["agency_account_status"]
            | null
          billing_type: string | null
          bio: string | null
          brand: string | null
          brand_color: string | null
          created_at: string
          created_by: string
          deletion_requested_by: string | null
          id: string
          invite_code: string | null
          is_archived: boolean
          is_demo: boolean | null
          logo_url: string | null
          name: string
          office_channel_id: string | null
          pause_date: string | null
          scheduled_deletion_date: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          account_status?:
            | Database["public"]["Enums"]["agency_account_status"]
            | null
          billing_type?: string | null
          bio?: string | null
          brand?: string | null
          brand_color?: string | null
          created_at?: string
          created_by: string
          deletion_requested_by?: string | null
          id?: string
          invite_code?: string | null
          is_archived?: boolean
          is_demo?: boolean | null
          logo_url?: string | null
          name: string
          office_channel_id?: string | null
          pause_date?: string | null
          scheduled_deletion_date?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          account_status?:
            | Database["public"]["Enums"]["agency_account_status"]
            | null
          billing_type?: string | null
          bio?: string | null
          brand?: string | null
          brand_color?: string | null
          created_at?: string
          created_by?: string
          deletion_requested_by?: string | null
          id?: string
          invite_code?: string | null
          is_archived?: boolean
          is_demo?: boolean | null
          logo_url?: string | null
          name?: string
          office_channel_id?: string | null
          pause_date?: string | null
          scheduled_deletion_date?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_usage_tracking: {
        Row: {
          action_count: number | null
          action_type: string
          created_at: string | null
          id: string
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          action_count?: number | null
          action_type: string
          created_at?: string | null
          id?: string
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          action_count?: number | null
          action_type?: string
          created_at?: string | null
          id?: string
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      appraisal_notes: {
        Row: {
          appraisal_id: string
          author_id: string | null
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          source: string
        }
        Insert: {
          appraisal_id: string
          author_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          source?: string
        }
        Update: {
          appraisal_id?: string
          author_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "appraisal_notes_appraisal_id_fkey"
            columns: ["appraisal_id"]
            isOneToOne: false
            referencedRelation: "logged_appraisals"
            referencedColumns: ["id"]
          },
        ]
      }
      appraisal_stage_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          stage: string
          tasks: Json | null
          team_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          stage: string
          tasks?: Json | null
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          stage?: string
          tasks?: Json | null
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appraisal_stage_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appraisal_stage_templates_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          agency_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown
          record_id: string | null
          table_name: string | null
          target_user_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          agency_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          record_id?: string | null
          table_name?: string | null
          target_user_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          agency_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          record_id?: string | null
          table_name?: string | null
          target_user_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      beacon_engagement_events: {
        Row: {
          appraisal_id: string
          created_at: string | null
          duration_seconds: number | null
          event_type: string
          id: string
          metadata: Json | null
          occurred_at: string
        }
        Insert: {
          appraisal_id: string
          created_at?: string | null
          duration_seconds?: number | null
          event_type: string
          id?: string
          metadata?: Json | null
          occurred_at: string
        }
        Update: {
          appraisal_id?: string
          created_at?: string | null
          duration_seconds?: number | null
          event_type?: string
          id?: string
          metadata?: Json | null
          occurred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beacon_engagement_events_appraisal_id_fkey"
            columns: ["appraisal_id"]
            isOneToOne: false
            referencedRelation: "logged_appraisals"
            referencedColumns: ["id"]
          },
        ]
      }
      beacon_reports: {
        Row: {
          appraisal_id: string
          beacon_report_id: string
          campaign_started_at: string | null
          created_at: string
          days_on_market: number | null
          email_opens: number | null
          first_viewed_at: string | null
          id: string
          is_hot_lead: boolean | null
          last_activity: string | null
          personalized_url: string | null
          propensity_score: number | null
          proposal_accepted_at: string | null
          proposal_decline_reason: string | null
          proposal_declined_at: string | null
          report_type: string
          report_url: string | null
          sent_at: string | null
          total_time_seconds: number | null
          total_views: number | null
        }
        Insert: {
          appraisal_id: string
          beacon_report_id: string
          campaign_started_at?: string | null
          created_at?: string
          days_on_market?: number | null
          email_opens?: number | null
          first_viewed_at?: string | null
          id?: string
          is_hot_lead?: boolean | null
          last_activity?: string | null
          personalized_url?: string | null
          propensity_score?: number | null
          proposal_accepted_at?: string | null
          proposal_decline_reason?: string | null
          proposal_declined_at?: string | null
          report_type?: string
          report_url?: string | null
          sent_at?: string | null
          total_time_seconds?: number | null
          total_views?: number | null
        }
        Update: {
          appraisal_id?: string
          beacon_report_id?: string
          campaign_started_at?: string | null
          created_at?: string
          days_on_market?: number | null
          email_opens?: number | null
          first_viewed_at?: string | null
          id?: string
          is_hot_lead?: boolean | null
          last_activity?: string | null
          personalized_url?: string | null
          propensity_score?: number | null
          proposal_accepted_at?: string | null
          proposal_decline_reason?: string | null
          proposal_declined_at?: string | null
          report_type?: string
          report_url?: string | null
          sent_at?: string | null
          total_time_seconds?: number | null
          total_views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "beacon_reports_appraisal_id_fkey"
            columns: ["appraisal_id"]
            isOneToOne: false
            referencedRelation: "logged_appraisals"
            referencedColumns: ["id"]
          },
        ]
      }
      bug_report_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      bug_report_comments: {
        Row: {
          bug_report_id: string
          comment: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          bug_report_id: string
          comment: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          bug_report_id?: string
          comment?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bug_report_comments_bug_report_id_fkey"
            columns: ["bug_report_id"]
            isOneToOne: false
            referencedRelation: "bug_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bug_report_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bug_report_votes: {
        Row: {
          bug_report_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          bug_report_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          bug_report_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bug_report_votes_bug_report_id_fkey"
            columns: ["bug_report_id"]
            isOneToOne: false
            referencedRelation: "bug_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bug_report_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bug_reports: {
        Row: {
          admin_comments: string | null
          ai_analysis: string | null
          ai_analyzed_at: string | null
          ai_confidence: number | null
          ai_impact: string | null
          archived_at: string | null
          archived_reason: string | null
          attachments: string[] | null
          category_id: string | null
          created_at: string | null
          description: string
          environment: string | null
          expected_behaviour: string | null
          external_system: string | null
          external_ticket_id: string | null
          external_ticket_url: string | null
          fixed_at: string | null
          fixed_by: string | null
          id: string
          module: string | null
          position: number | null
          satisfaction_feedback: string | null
          satisfaction_rating: number | null
          satisfaction_recorded_at: string | null
          satisfaction_requested_at: string | null
          severity: string | null
          source: string
          status: string | null
          steps_to_reproduce: string | null
          summary: string | null
          team_id: string | null
          title: string
          updated_at: string | null
          user_id: string | null
          vote_count: number | null
          workspace_module: string | null
        }
        Insert: {
          admin_comments?: string | null
          ai_analysis?: string | null
          ai_analyzed_at?: string | null
          ai_confidence?: number | null
          ai_impact?: string | null
          archived_at?: string | null
          archived_reason?: string | null
          attachments?: string[] | null
          category_id?: string | null
          created_at?: string | null
          description: string
          environment?: string | null
          expected_behaviour?: string | null
          external_system?: string | null
          external_ticket_id?: string | null
          external_ticket_url?: string | null
          fixed_at?: string | null
          fixed_by?: string | null
          id?: string
          module?: string | null
          position?: number | null
          satisfaction_feedback?: string | null
          satisfaction_rating?: number | null
          satisfaction_recorded_at?: string | null
          satisfaction_requested_at?: string | null
          severity?: string | null
          source?: string
          status?: string | null
          steps_to_reproduce?: string | null
          summary?: string | null
          team_id?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
          vote_count?: number | null
          workspace_module?: string | null
        }
        Update: {
          admin_comments?: string | null
          ai_analysis?: string | null
          ai_analyzed_at?: string | null
          ai_confidence?: number | null
          ai_impact?: string | null
          archived_at?: string | null
          archived_reason?: string | null
          attachments?: string[] | null
          category_id?: string | null
          created_at?: string | null
          description?: string
          environment?: string | null
          expected_behaviour?: string | null
          external_system?: string | null
          external_ticket_id?: string | null
          external_ticket_url?: string | null
          fixed_at?: string | null
          fixed_by?: string | null
          id?: string
          module?: string | null
          position?: number | null
          satisfaction_feedback?: string | null
          satisfaction_rating?: number | null
          satisfaction_recorded_at?: string | null
          satisfaction_requested_at?: string | null
          severity?: string | null
          source?: string
          status?: string | null
          steps_to_reproduce?: string | null
          summary?: string | null
          team_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
          vote_count?: number | null
          workspace_module?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bug_reports_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "bug_report_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bug_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_sync_settings: {
        Row: {
          created_at: string
          id: string
          sync_appraisals: boolean
          sync_daily_planner: boolean
          sync_transactions: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sync_appraisals?: boolean
          sync_daily_planner?: boolean
          sync_transactions?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sync_appraisals?: boolean
          sync_daily_planner?: boolean
          sync_transactions?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_sync_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      changelog_entries: {
        Row: {
          ai_summary: string | null
          bug_count: number | null
          created_at: string | null
          email_sent_at: string | null
          entry_date: string
          feature_count: number | null
          id: string
          raw_changes: Json
        }
        Insert: {
          ai_summary?: string | null
          bug_count?: number | null
          created_at?: string | null
          email_sent_at?: string | null
          entry_date: string
          feature_count?: number | null
          id?: string
          raw_changes?: Json
        }
        Update: {
          ai_summary?: string | null
          bug_count?: number | null
          created_at?: string | null
          email_sent_at?: string | null
          entry_date?: string
          feature_count?: number | null
          id?: string
          raw_changes?: Json
        }
        Relationships: []
      }
      coaching_conversation_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "coaching_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_conversations: {
        Row: {
          context: string | null
          created_at: string | null
          id: string
          is_starred: boolean | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          context?: string | null
          created_at?: string | null
          id?: string
          is_starred?: boolean | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          context?: string | null
          created_at?: string | null
          id?: string
          is_starred?: boolean | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          can_post: boolean | null
          conversation_id: string
          id: string
          is_admin: boolean | null
          joined_at: string | null
          muted: boolean | null
          user_id: string
        }
        Insert: {
          can_post?: boolean | null
          conversation_id: string
          id?: string
          is_admin?: boolean | null
          joined_at?: string | null
          muted?: boolean | null
          user_id: string
        }
        Update: {
          can_post?: boolean | null
          conversation_id?: string
          id?: string
          is_admin?: boolean | null
          joined_at?: string | null
          muted?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          agency_id: string | null
          allow_member_invites: boolean | null
          conversation_type: string | null
          created_at: string | null
          created_by: string
          description: string | null
          icon: string | null
          id: string
          title: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          allow_member_invites?: boolean | null
          conversation_type?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          icon?: string | null
          id?: string
          title?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          allow_member_invites?: boolean | null
          conversation_type?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          icon?: string | null
          id?: string
          title?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_activities: {
        Row: {
          activity_date: string
          appraisals: number | null
          calls: number | null
          cch_calculated: number | null
          created_at: string | null
          id: string
          open_homes: number | null
          team_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activity_date: string
          appraisals?: number | null
          calls?: number | null
          cch_calculated?: number | null
          created_at?: string | null
          id?: string
          open_homes?: number | null
          team_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activity_date?: string
          appraisals?: number | null
          calls?: number | null
          cch_calculated?: number | null
          created_at?: string | null
          id?: string
          open_homes?: number | null
          team_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_activities_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_planner_assignments: {
        Row: {
          created_at: string | null
          id: string
          planner_item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          planner_item_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          planner_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_planner_assignments_planner_item_id_fkey"
            columns: ["planner_item_id"]
            isOneToOne: false
            referencedRelation: "daily_planner_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_planner_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_planner_items: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          created_by: string | null
          date: string
          description: string | null
          duration_minutes: number | null
          estimated_minutes: number | null
          id: string
          notes: string | null
          position: number | null
          scheduled_date: string | null
          size_category: string | null
          task_id: string | null
          team_id: string | null
          time: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          date: string
          description?: string | null
          duration_minutes?: number | null
          estimated_minutes?: number | null
          id?: string
          notes?: string | null
          position?: number | null
          scheduled_date?: string | null
          size_category?: string | null
          task_id?: string | null
          team_id?: string | null
          time?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string | null
          duration_minutes?: number | null
          estimated_minutes?: number | null
          id?: string
          notes?: string | null
          position?: number | null
          scheduled_date?: string | null
          size_category?: string | null
          task_id?: string | null
          team_id?: string | null
          time?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_planner_items_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_planner_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_planner_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_planner_items_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_planner_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_reset_logs: {
        Row: {
          duration_ms: number | null
          id: string
          records_created: number | null
          records_deleted: number | null
          reset_at: string | null
        }
        Insert: {
          duration_ms?: number | null
          id?: string
          records_created?: number | null
          records_deleted?: number | null
          reset_at?: string | null
        }
        Update: {
          duration_ms?: number | null
          id?: string
          records_created?: number | null
          records_deleted?: number | null
          reset_at?: string | null
        }
        Relationships: []
      }
      feature_request_comments: {
        Row: {
          comment: string
          created_at: string | null
          feature_request_id: string
          id: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string | null
          feature_request_id: string
          id?: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string | null
          feature_request_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_request_comments_feature_request_id_fkey"
            columns: ["feature_request_id"]
            isOneToOne: false
            referencedRelation: "feature_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_request_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_request_votes: {
        Row: {
          created_at: string | null
          feature_request_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          feature_request_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          feature_request_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_request_votes_feature_request_id_fkey"
            columns: ["feature_request_id"]
            isOneToOne: false
            referencedRelation: "feature_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_request_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_requests: {
        Row: {
          admin_notes: string | null
          ai_analysis: Json | null
          ai_analyzed_at: string | null
          ai_estimated_effort: string | null
          ai_priority_score: number | null
          archived_at: string | null
          archived_reason: string | null
          attachments: string[] | null
          created_at: string | null
          description: string
          id: string
          module: string | null
          position: number | null
          priority: string | null
          source: string
          status: string | null
          team_id: string | null
          title: string
          updated_at: string | null
          user_id: string | null
          vote_count: number | null
        }
        Insert: {
          admin_notes?: string | null
          ai_analysis?: Json | null
          ai_analyzed_at?: string | null
          ai_estimated_effort?: string | null
          ai_priority_score?: number | null
          archived_at?: string | null
          archived_reason?: string | null
          attachments?: string[] | null
          created_at?: string | null
          description: string
          id?: string
          module?: string | null
          position?: number | null
          priority?: string | null
          source?: string
          status?: string | null
          team_id?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
          vote_count?: number | null
        }
        Update: {
          admin_notes?: string | null
          ai_analysis?: Json | null
          ai_analyzed_at?: string | null
          ai_estimated_effort?: string | null
          ai_priority_score?: number | null
          archived_at?: string | null
          archived_reason?: string | null
          attachments?: string[] | null
          created_at?: string | null
          description?: string
          id?: string
          module?: string | null
          position?: number | null
          priority?: string | null
          source?: string
          status?: string | null
          team_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
          vote_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_connections: {
        Row: {
          accepted: boolean | null
          created_at: string | null
          friend_id: string
          id: string
          is_starred: boolean | null
          status: string | null
          user_id: string
        }
        Insert: {
          accepted?: boolean | null
          created_at?: string | null
          friend_id: string
          id?: string
          is_starred?: boolean | null
          status?: string | null
          user_id: string
        }
        Update: {
          accepted?: boolean | null
          created_at?: string | null
          friend_id?: string
          id?: string
          is_starred?: boolean | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_connections_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          created_by: string | null
          current_value: number | null
          description: string | null
          end_date: string
          goal_type: Database["public"]["Enums"]["goal_type"]
          id: string
          is_achieved: boolean | null
          kpi_type: string | null
          period: string | null
          set_by_admin: boolean | null
          start_date: string
          target_value: number
          team_id: string | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          current_value?: number | null
          description?: string | null
          end_date: string
          goal_type: Database["public"]["Enums"]["goal_type"]
          id?: string
          is_achieved?: boolean | null
          kpi_type?: string | null
          period?: string | null
          set_by_admin?: boolean | null
          start_date: string
          target_value: number
          team_id?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          current_value?: number | null
          description?: string | null
          end_date?: string
          goal_type?: Database["public"]["Enums"]["goal_type"]
          id?: string
          is_achieved?: boolean | null
          kpi_type?: string | null
          period?: string | null
          set_by_admin?: boolean | null
          start_date?: string
          target_value?: number
          team_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_connections: {
        Row: {
          access_token: string
          calendar_id: string | null
          created_at: string
          id: string
          refresh_token: string
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          calendar_id?: string | null
          created_at?: string
          id?: string
          refresh_token: string
          token_expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          calendar_id?: string | null
          created_at?: string
          id?: string
          refresh_token?: string
          token_expires_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_settings: {
        Row: {
          config: Json | null
          connected_at: string | null
          connected_by: string | null
          created_at: string | null
          enabled: boolean | null
          id: string
          integration_name: string
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          integration_name: string
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          integration_name?: string
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_settings_connected_by_fkey"
            columns: ["connected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_settings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_card_views: {
        Row: {
          card_id: string
          completed: boolean | null
          id: string
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          card_id: string
          completed?: boolean | null
          id?: string
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          card_id?: string
          completed?: boolean | null
          id?: string
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_card_views_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_card_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_cards: {
        Row: {
          agency_id: string | null
          category_id: string | null
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          category_id?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          category_id?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_cards_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_cards_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_cards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_categories: {
        Row: {
          agency_id: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          parent_id: string | null
        }
        Insert: {
          agency_id?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          parent_id?: string | null
        }
        Update: {
          agency_id?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_categories_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_playbooks: {
        Row: {
          agency_id: string | null
          category_id: string | null
          content: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          category_id?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          category_id?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_playbooks_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_playbooks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_playbooks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_entries: {
        Row: {
          created_at: string | null
          date: string
          id: string
          kpi_type: Database["public"]["Enums"]["kpi_type"]
          notes: string | null
          updated_at: string | null
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          kpi_type: Database["public"]["Enums"]["kpi_type"]
          notes?: string | null
          updated_at?: string | null
          user_id: string
          value: number
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          kpi_type?: Database["public"]["Enums"]["kpi_type"]
          notes?: string | null
          updated_at?: string | null
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "kpi_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_sources: {
        Row: {
          agency_id: string | null
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          label: string
          sort_order: number
          updated_at: string
          value: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          label: string
          sort_order?: number
          updated_at?: string
          value: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_sources_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_comments: {
        Row: {
          comment: string
          created_at: string | null
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string | null
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string | null
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_comments_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listings_pipeline: {
        Row: {
          address: string
          appraisal_date: string | null
          appraisal_id: string | null
          archived_at: string | null
          assigned_to: string | null
          attachments: Json | null
          beacon_is_hot_lead: boolean | null
          beacon_last_activity: string | null
          beacon_propensity_score: number | null
          beacon_report_id: string | null
          campaign_start_date: string | null
          contract_signed_date: string | null
          created_at: string | null
          created_by: string
          estimated_value: number | null
          expected_month: string | null
          geocode_error: string | null
          geocoded_at: string | null
          id: string
          last_contact: string | null
          last_edited_by: string | null
          latitude: number | null
          lead_source: string | null
          likelihood: number | null
          listing_appointment_date: string | null
          longitude: number | null
          loss_reason: string | null
          lost_date: string | null
          next_action: string | null
          next_action_date: string | null
          notes: string | null
          open_home_dates: string[] | null
          outcome: string | null
          owners: Json | null
          region: string | null
          stage: string | null
          suburb: string | null
          team_id: string
          updated_at: string | null
          vendor_name: string | null
          warmth: Database["public"]["Enums"]["listing_warmth"] | null
        }
        Insert: {
          address: string
          appraisal_date?: string | null
          appraisal_id?: string | null
          archived_at?: string | null
          assigned_to?: string | null
          attachments?: Json | null
          beacon_is_hot_lead?: boolean | null
          beacon_last_activity?: string | null
          beacon_propensity_score?: number | null
          beacon_report_id?: string | null
          campaign_start_date?: string | null
          contract_signed_date?: string | null
          created_at?: string | null
          created_by: string
          estimated_value?: number | null
          expected_month?: string | null
          geocode_error?: string | null
          geocoded_at?: string | null
          id?: string
          last_contact?: string | null
          last_edited_by?: string | null
          latitude?: number | null
          lead_source?: string | null
          likelihood?: number | null
          listing_appointment_date?: string | null
          longitude?: number | null
          loss_reason?: string | null
          lost_date?: string | null
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          open_home_dates?: string[] | null
          outcome?: string | null
          owners?: Json | null
          region?: string | null
          stage?: string | null
          suburb?: string | null
          team_id: string
          updated_at?: string | null
          vendor_name?: string | null
          warmth?: Database["public"]["Enums"]["listing_warmth"] | null
        }
        Update: {
          address?: string
          appraisal_date?: string | null
          appraisal_id?: string | null
          archived_at?: string | null
          assigned_to?: string | null
          attachments?: Json | null
          beacon_is_hot_lead?: boolean | null
          beacon_last_activity?: string | null
          beacon_propensity_score?: number | null
          beacon_report_id?: string | null
          campaign_start_date?: string | null
          contract_signed_date?: string | null
          created_at?: string | null
          created_by?: string
          estimated_value?: number | null
          expected_month?: string | null
          geocode_error?: string | null
          geocoded_at?: string | null
          id?: string
          last_contact?: string | null
          last_edited_by?: string | null
          latitude?: number | null
          lead_source?: string | null
          likelihood?: number | null
          listing_appointment_date?: string | null
          longitude?: number | null
          loss_reason?: string | null
          lost_date?: string | null
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          open_home_dates?: string[] | null
          outcome?: string | null
          owners?: Json | null
          region?: string | null
          stage?: string | null
          suburb?: string | null
          team_id?: string
          updated_at?: string | null
          vendor_name?: string | null
          warmth?: Database["public"]["Enums"]["listing_warmth"] | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_pipeline_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_pipeline_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_pipeline_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      logged_appraisals: {
        Row: {
          address: string
          agent_id: string | null
          appraisal_date: string
          appraisal_method: string | null
          appraisal_range_high: number | null
          appraisal_range_low: number | null
          beacon_email_opens: number | null
          beacon_first_viewed_at: string | null
          beacon_is_hot_lead: boolean | null
          beacon_last_activity: string | null
          beacon_personalized_url: string | null
          beacon_propensity_score: number | null
          beacon_report_created_at: string | null
          beacon_report_id: string | null
          beacon_report_sent_at: string | null
          beacon_report_url: string | null
          beacon_synced_at: string | null
          beacon_total_time_seconds: number | null
          beacon_total_views: number | null
          converted_date: string | null
          created_at: string | null
          created_by: string | null
          estimated_value: number | null
          geocode_error: string | null
          geocoded_at: string | null
          id: string
          intent: string | null
          last_contact: string | null
          latitude: number | null
          lead_source: string | null
          longitude: number | null
          next_follow_up: string | null
          notes: string | null
          outcome: string | null
          owners: Json | null
          stage: string | null
          status: string | null
          suburb: string | null
          team_id: string | null
          updated_at: string | null
          user_id: string
          vendor_email: string | null
          vendor_mobile: string | null
          vendor_name: string | null
        }
        Insert: {
          address: string
          agent_id?: string | null
          appraisal_date: string
          appraisal_method?: string | null
          appraisal_range_high?: number | null
          appraisal_range_low?: number | null
          beacon_email_opens?: number | null
          beacon_first_viewed_at?: string | null
          beacon_is_hot_lead?: boolean | null
          beacon_last_activity?: string | null
          beacon_personalized_url?: string | null
          beacon_propensity_score?: number | null
          beacon_report_created_at?: string | null
          beacon_report_id?: string | null
          beacon_report_sent_at?: string | null
          beacon_report_url?: string | null
          beacon_synced_at?: string | null
          beacon_total_time_seconds?: number | null
          beacon_total_views?: number | null
          converted_date?: string | null
          created_at?: string | null
          created_by?: string | null
          estimated_value?: number | null
          geocode_error?: string | null
          geocoded_at?: string | null
          id?: string
          intent?: string | null
          last_contact?: string | null
          latitude?: number | null
          lead_source?: string | null
          longitude?: number | null
          next_follow_up?: string | null
          notes?: string | null
          outcome?: string | null
          owners?: Json | null
          stage?: string | null
          status?: string | null
          suburb?: string | null
          team_id?: string | null
          updated_at?: string | null
          user_id: string
          vendor_email?: string | null
          vendor_mobile?: string | null
          vendor_name?: string | null
        }
        Update: {
          address?: string
          agent_id?: string | null
          appraisal_date?: string
          appraisal_method?: string | null
          appraisal_range_high?: number | null
          appraisal_range_low?: number | null
          beacon_email_opens?: number | null
          beacon_first_viewed_at?: string | null
          beacon_is_hot_lead?: boolean | null
          beacon_last_activity?: string | null
          beacon_personalized_url?: string | null
          beacon_propensity_score?: number | null
          beacon_report_created_at?: string | null
          beacon_report_id?: string | null
          beacon_report_sent_at?: string | null
          beacon_report_url?: string | null
          beacon_synced_at?: string | null
          beacon_total_time_seconds?: number | null
          beacon_total_views?: number | null
          converted_date?: string | null
          created_at?: string | null
          created_by?: string | null
          estimated_value?: number | null
          geocode_error?: string | null
          geocoded_at?: string | null
          id?: string
          intent?: string | null
          last_contact?: string | null
          latitude?: number | null
          lead_source?: string | null
          longitude?: number | null
          next_follow_up?: string | null
          notes?: string | null
          outcome?: string | null
          owners?: Json | null
          stage?: string | null
          status?: string | null
          suburb?: string | null
          team_id?: string | null
          updated_at?: string | null
          user_id?: string
          vendor_email?: string | null
          vendor_mobile?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logged_appraisals_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logged_appraisals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logged_appraisals_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logged_appraisals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          reactions: Json | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          reactions?: Json | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          reactions?: Json | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      module_audit_events: {
        Row: {
          action: string
          allowed: boolean
          created_at: string | null
          id: string
          module_id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          action: string
          allowed: boolean
          created_at?: string | null
          id?: string
          module_id: string
          reason?: string | null
          user_id: string
        }
        Update: {
          action?: string
          allowed?: boolean
          created_at?: string | null
          id?: string
          module_id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_audit_events_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_audit_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      module_policies: {
        Row: {
          agency_id: string | null
          created_at: string | null
          has_access: boolean
          id: string
          module_id: string
          policy_source: string | null
          role: Database["public"]["Enums"]["app_role"] | null
        }
        Insert: {
          agency_id?: string | null
          created_at?: string | null
          has_access?: boolean
          id?: string
          module_id: string
          policy_source?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
        }
        Update: {
          agency_id?: string | null
          created_at?: string | null
          has_access?: boolean
          id?: string
          module_id?: string
          policy_source?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
        }
        Relationships: [
          {
            foreignKeyName: "module_policies_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_policies_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      note_shares: {
        Row: {
          can_edit: boolean | null
          created_at: string | null
          id: string
          invited_by: string
          note_id: string
          permission: string | null
          user_id: string
        }
        Insert: {
          can_edit?: boolean | null
          created_at?: string | null
          id?: string
          invited_by: string
          note_id: string
          permission?: string | null
          user_id: string
        }
        Update: {
          can_edit?: boolean | null
          created_at?: string | null
          id?: string
          invited_by?: string
          note_id?: string
          permission?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_shares_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_shares_shared_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string
          content_plain: string | null
          content_rich: string | null
          created_at: string | null
          id: string
          is_private: boolean | null
          owner_id: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          content_plain?: string | null
          content_rich?: string | null
          created_at?: string | null
          id?: string
          is_private?: boolean | null
          owner_id?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          content_plain?: string | null
          content_rich?: string | null
          created_at?: string | null
          id?: string
          is_private?: boolean | null
          owner_id?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          email_digest_enabled: boolean | null
          email_digest_frequency: string | null
          email_digest_hour: number | null
          id: string
          notify_listing_stage_contract: boolean | null
          notify_listing_stage_live: boolean | null
          notify_listing_stage_settled: boolean | null
          notify_listing_stage_signed: boolean | null
          notify_listing_stage_unconditional: boolean | null
          notify_task_assigned: boolean | null
          notify_task_due_soon: boolean | null
          notify_team_member_joined: boolean | null
          push_enabled: boolean | null
          receive_product_updates: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_digest_enabled?: boolean | null
          email_digest_frequency?: string | null
          email_digest_hour?: number | null
          id?: string
          notify_listing_stage_contract?: boolean | null
          notify_listing_stage_live?: boolean | null
          notify_listing_stage_settled?: boolean | null
          notify_listing_stage_signed?: boolean | null
          notify_listing_stage_unconditional?: boolean | null
          notify_task_assigned?: boolean | null
          notify_task_due_soon?: boolean | null
          notify_team_member_joined?: boolean | null
          push_enabled?: boolean | null
          receive_product_updates?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_digest_enabled?: boolean | null
          email_digest_frequency?: string | null
          email_digest_hour?: number | null
          id?: string
          notify_listing_stage_contract?: boolean | null
          notify_listing_stage_live?: boolean | null
          notify_listing_stage_settled?: boolean | null
          notify_listing_stage_signed?: boolean | null
          notify_listing_stage_unconditional?: boolean | null
          notify_task_assigned?: boolean | null
          notify_task_due_soon?: boolean | null
          notify_team_member_joined?: boolean | null
          push_enabled?: boolean | null
          receive_product_updates?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          digest_sent_at: string | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          digest_sent_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          digest_sent_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      office_manager_assignments: {
        Row: {
          agency_id: string
          assigned_at: string | null
          assigned_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          agency_id: string
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          agency_id?: string
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "office_manager_assignments_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_manager_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_manager_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      past_sales: {
        Row: {
          address: string
          agent_id: string | null
          appraisal_date: string | null
          appraisal_high: number | null
          appraisal_low: number | null
          bathrooms: number | null
          bedrooms: number | null
          buyer_details: Json | null
          commission: number | null
          commission_rate: number | null
          created_at: string | null
          created_by: string | null
          days_on_market: number | null
          first_contact_date: string | null
          geocode_error: string | null
          geocoded_at: string | null
          id: string
          latitude: number | null
          lead_source: string | null
          lead_source_detail: string | null
          listing_live_date: string | null
          listing_price: number | null
          listing_signed_date: string | null
          longitude: number | null
          lost_date: string | null
          lost_reason: string | null
          notes: string | null
          property_type: string | null
          region: string | null
          sale_date: string | null
          sale_price: number | null
          settlement_date: string | null
          status: string | null
          suburb: string | null
          team_id: string
          unconditional_date: string | null
          updated_at: string | null
          vendor_details: Json | null
        }
        Insert: {
          address: string
          agent_id?: string | null
          appraisal_date?: string | null
          appraisal_high?: number | null
          appraisal_low?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          buyer_details?: Json | null
          commission?: number | null
          commission_rate?: number | null
          created_at?: string | null
          created_by?: string | null
          days_on_market?: number | null
          first_contact_date?: string | null
          geocode_error?: string | null
          geocoded_at?: string | null
          id?: string
          latitude?: number | null
          lead_source?: string | null
          lead_source_detail?: string | null
          listing_live_date?: string | null
          listing_price?: number | null
          listing_signed_date?: string | null
          longitude?: number | null
          lost_date?: string | null
          lost_reason?: string | null
          notes?: string | null
          property_type?: string | null
          region?: string | null
          sale_date?: string | null
          sale_price?: number | null
          settlement_date?: string | null
          status?: string | null
          suburb?: string | null
          team_id: string
          unconditional_date?: string | null
          updated_at?: string | null
          vendor_details?: Json | null
        }
        Update: {
          address?: string
          agent_id?: string | null
          appraisal_date?: string | null
          appraisal_high?: number | null
          appraisal_low?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          buyer_details?: Json | null
          commission?: number | null
          commission_rate?: number | null
          created_at?: string | null
          created_by?: string | null
          days_on_market?: number | null
          first_contact_date?: string | null
          geocode_error?: string | null
          geocoded_at?: string | null
          id?: string
          latitude?: number | null
          lead_source?: string | null
          lead_source_detail?: string | null
          listing_live_date?: string | null
          listing_price?: number | null
          listing_signed_date?: string | null
          longitude?: number | null
          lost_date?: string | null
          lost_reason?: string | null
          notes?: string | null
          property_type?: string | null
          region?: string | null
          sale_date?: string | null
          sale_price?: number | null
          settlement_date?: string | null
          status?: string | null
          suburb?: string | null
          team_id?: string
          unconditional_date?: string | null
          updated_at?: string | null
          vendor_details?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "past_sales_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "past_sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "past_sales_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_invitations: {
        Row: {
          accepted_at: string | null
          agency_id: string | null
          created_at: string | null
          email: string
          expires_at: string
          full_name: string | null
          id: string
          invite_code: string
          invited_by: string
          office_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string | null
          team_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          agency_id?: string | null
          created_at?: string | null
          email: string
          expires_at: string
          full_name?: string | null
          id?: string
          invite_code: string
          invited_by: string
          office_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          status?: string | null
          team_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          agency_id?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          full_name?: string | null
          id?: string
          invite_code?: string
          invited_by?: string
          office_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_invitations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_invitations_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_office_id: string | null
          active_role: string | null
          avatar_url: string | null
          birthday: string | null
          birthday_visibility: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          invite_code: string | null
          last_active_at: string | null
          last_role_switch_at: string | null
          mobile: string | null
          office_id: string | null
          onboarding_completed: boolean | null
          password_set: boolean | null
          presence_status: string | null
          primary_team_id: string | null
          share_with_office: boolean
          status: string | null
          timezone: string | null
          total_bug_points: number | null
          updated_at: string | null
        }
        Insert: {
          active_office_id?: string | null
          active_role?: string | null
          avatar_url?: string | null
          birthday?: string | null
          birthday_visibility?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          invite_code?: string | null
          last_active_at?: string | null
          last_role_switch_at?: string | null
          mobile?: string | null
          office_id?: string | null
          onboarding_completed?: boolean | null
          password_set?: boolean | null
          presence_status?: string | null
          primary_team_id?: string | null
          share_with_office?: boolean
          status?: string | null
          timezone?: string | null
          total_bug_points?: number | null
          updated_at?: string | null
        }
        Update: {
          active_office_id?: string | null
          active_role?: string | null
          avatar_url?: string | null
          birthday?: string | null
          birthday_visibility?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          invite_code?: string | null
          last_active_at?: string | null
          last_role_switch_at?: string | null
          mobile?: string | null
          office_id?: string | null
          onboarding_completed?: boolean | null
          password_set?: boolean | null
          presence_status?: string | null
          primary_team_id?: string | null
          share_with_office?: boolean
          status?: string | null
          timezone?: string | null
          total_bug_points?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_office_id_fkey"
            columns: ["active_office_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          agency_id: string | null
          background: string | null
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_shared: boolean | null
          status: string | null
          team_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          background?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_shared?: boolean | null
          status?: string | null
          team_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          background?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_shared?: boolean | null
          status?: string | null
          team_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_categories: {
        Row: {
          agency_id: string | null
          created_at: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_categories_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quarterly_goals: {
        Row: {
          created_at: string | null
          created_by: string | null
          current_value: number | null
          goal_type: string
          id: string
          kpi_type: string | null
          quarter: string
          target_value: number
          team_id: string
          updated_at: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          current_value?: number | null
          goal_type: string
          id?: string
          kpi_type?: string | null
          quarter: string
          target_value: number
          team_id: string
          updated_at?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          current_value?: number | null
          goal_type?: string
          id?: string
          kpi_type?: string | null
          quarter?: string
          target_value?: number
          team_id?: string
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "quarterly_goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarterly_goals_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      quarterly_reviews: {
        Row: {
          achievements: string | null
          action_items: string | null
          areas_for_improvement: string | null
          challenges: string | null
          completed: boolean | null
          created_at: string | null
          created_by: string | null
          goals_for_next_quarter: string | null
          id: string
          lessons_learned: string | null
          performance_notes: string | null
          quarter: string
          review_type: string | null
          reviewed_by: string | null
          team_id: string
          updated_at: string | null
          user_id: string | null
          wins: string | null
          year: number
        }
        Insert: {
          achievements?: string | null
          action_items?: string | null
          areas_for_improvement?: string | null
          challenges?: string | null
          completed?: boolean | null
          created_at?: string | null
          created_by?: string | null
          goals_for_next_quarter?: string | null
          id?: string
          lessons_learned?: string | null
          performance_notes?: string | null
          quarter: string
          review_type?: string | null
          reviewed_by?: string | null
          team_id: string
          updated_at?: string | null
          user_id?: string | null
          wins?: string | null
          year: number
        }
        Update: {
          achievements?: string | null
          action_items?: string | null
          areas_for_improvement?: string | null
          challenges?: string | null
          completed?: boolean | null
          created_at?: string | null
          created_by?: string | null
          goals_for_next_quarter?: string | null
          id?: string
          lessons_learned?: string | null
          performance_notes?: string | null
          quarter?: string
          review_type?: string | null
          reviewed_by?: string | null
          team_id?: string
          updated_at?: string | null
          user_id?: string | null
          wins?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "quarterly_reviews_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarterly_reviews_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarterly_reviews_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarterly_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roleplay_scenarios: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          difficulty: string | null
          id: string
          objectives: Json | null
          prompt: string
          rating: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          objectives?: Json | null
          prompt: string
          rating?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          objectives?: Json | null
          prompt?: string
          rating?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roleplay_scenarios_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roleplay_sessions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          feedback: string | null
          id: string
          rating: number | null
          scenario_id: string | null
          transcript: Json | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          feedback?: string | null
          id?: string
          rating?: number | null
          scenario_id?: string | null
          transcript?: Json | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          feedback?: string | null
          id?: string
          rating?: number | null
          scenario_id?: string | null
          transcript?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roleplay_sessions_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "roleplay_scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roleplay_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_provider_notes: {
        Row: {
          created_at: string | null
          id: string
          note: string
          provider_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          note: string
          provider_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          note?: string
          provider_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_provider_notes_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_provider_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_provider_reviews: {
        Row: {
          created_at: string | null
          id: string
          provider_id: string
          rating: number
          review: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          provider_id: string
          rating: number
          review?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          provider_id?: string
          rating?: number
          review?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_provider_reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_provider_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_providers: {
        Row: {
          agency_id: string | null
          avatar_url: string | null
          category_id: string | null
          company: string | null
          company_name: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          full_name: string | null
          id: string
          last_used_at: string | null
          logo_url: string | null
          name: string
          negative_count: number
          neutral_count: number
          notes: string | null
          phone: string | null
          positive_count: number
          rating: number | null
          search_vector: unknown
          team_category_id: string | null
          team_id: string | null
          total_reviews: number
          updated_at: string | null
          visibility_level: string | null
          website: string | null
        }
        Insert: {
          agency_id?: string | null
          avatar_url?: string | null
          category_id?: string | null
          company?: string | null
          company_name?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          last_used_at?: string | null
          logo_url?: string | null
          name: string
          negative_count?: number
          neutral_count?: number
          notes?: string | null
          phone?: string | null
          positive_count?: number
          rating?: number | null
          search_vector?: unknown
          team_category_id?: string | null
          team_id?: string | null
          total_reviews?: number
          updated_at?: string | null
          visibility_level?: string | null
          website?: string | null
        }
        Update: {
          agency_id?: string | null
          avatar_url?: string | null
          category_id?: string | null
          company?: string | null
          company_name?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          last_used_at?: string | null
          logo_url?: string | null
          name?: string
          negative_count?: number
          neutral_count?: number
          notes?: string | null
          phone?: string | null
          positive_count?: number
          rating?: number | null
          search_vector?: unknown
          team_category_id?: string | null
          team_id?: string | null
          total_reviews?: number
          updated_at?: string | null
          visibility_level?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_providers_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_providers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "provider_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_providers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_providers_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post_reactions: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          reaction: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          reaction: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_post_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          attachments: Json | null
          content: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
          visibility: string | null
        }
        Insert: {
          attachments?: Json | null
          content: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
          visibility?: string | null
        }
        Update: {
          attachments?: Json | null
          content?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_activity_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          task_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          task_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          task_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_activity_log_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignees: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignees_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          task_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          task_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          task_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_attachments_user_id_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_lists: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_archived: boolean | null
          name: string
          position: number
          project_id: string | null
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean | null
          name: string
          position?: number
          project_id?: string | null
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean | null
          name?: string
          position?: number
          project_id?: string | null
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_lists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_lists_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      task_projects: {
        Row: {
          agency_id: string | null
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_archived: boolean | null
          name: string
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean | null
          name: string
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean | null
          name?: string
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_projects_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_projects_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      task_tags: {
        Row: {
          agency_id: string | null
          color: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          agency_id?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          agency_id?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_tags_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          appraisal_id: string | null
          appraisal_stage: string | null
          assigned_to: string | null
          board_position: number | null
          color: string | null
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          created_by: string
          daily_position: number | null
          description: string | null
          due_date: string | null
          generated_for_week: string | null
          id: string
          is_daily_task: boolean | null
          is_important: boolean | null
          is_urgent: boolean | null
          is_weekly_recurring: boolean
          last_updated_by: string | null
          list_id: string | null
          listing_id: string | null
          order_position: number | null
          parent_task_id: string | null
          position: number
          priority: string | null
          project_id: string | null
          project_related_id: string | null
          section: string | null
          status: string | null
          team_id: string | null
          title: string
          transaction_id: string | null
          transaction_stage: string | null
          updated_at: string | null
          weekly_template_id: string | null
        }
        Insert: {
          appraisal_id?: string | null
          appraisal_stage?: string | null
          assigned_to?: string | null
          board_position?: number | null
          color?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          created_by: string
          daily_position?: number | null
          description?: string | null
          due_date?: string | null
          generated_for_week?: string | null
          id?: string
          is_daily_task?: boolean | null
          is_important?: boolean | null
          is_urgent?: boolean | null
          is_weekly_recurring?: boolean
          last_updated_by?: string | null
          list_id?: string | null
          listing_id?: string | null
          order_position?: number | null
          parent_task_id?: string | null
          position?: number
          priority?: string | null
          project_id?: string | null
          project_related_id?: string | null
          section?: string | null
          status?: string | null
          team_id?: string | null
          title: string
          transaction_id?: string | null
          transaction_stage?: string | null
          updated_at?: string | null
          weekly_template_id?: string | null
        }
        Update: {
          appraisal_id?: string | null
          appraisal_stage?: string | null
          assigned_to?: string | null
          board_position?: number | null
          color?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string
          daily_position?: number | null
          description?: string | null
          due_date?: string | null
          generated_for_week?: string | null
          id?: string
          is_daily_task?: boolean | null
          is_important?: boolean | null
          is_urgent?: boolean | null
          is_weekly_recurring?: boolean
          last_updated_by?: string | null
          list_id?: string | null
          listing_id?: string | null
          order_position?: number | null
          parent_task_id?: string | null
          position?: number
          priority?: string | null
          project_id?: string | null
          project_related_id?: string | null
          section?: string | null
          status?: string | null
          team_id?: string | null
          title?: string
          transaction_id?: string | null
          transaction_stage?: string | null
          updated_at?: string | null
          weekly_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_appraisal_id_fkey"
            columns: ["appraisal_id"]
            isOneToOne: false
            referencedRelation: "logged_appraisals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_last_updated_by_fkey"
            columns: ["last_updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "task_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_related_id_fkey"
            columns: ["project_related_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_weekly_template_id_fkey"
            columns: ["weekly_template_id"]
            isOneToOne: false
            referencedRelation: "weekly_task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          access_level: Database["public"]["Enums"]["access_level"]
          contributes_to_kpis: boolean | null
          id: string
          joined_at: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          access_level?: Database["public"]["Enums"]["access_level"]
          contributes_to_kpis?: boolean | null
          id?: string
          joined_at?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          access_level?: Database["public"]["Enums"]["access_level"]
          contributes_to_kpis?: boolean | null
          id?: string
          joined_at?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          agency_id: string
          bio: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          extra_seats_purchased: number | null
          financial_year_start_month: number | null
          id: string
          is_archived: boolean | null
          is_orphan_team: boolean | null
          is_personal_team: boolean | null
          license_type: string | null
          logo_url: string | null
          name: string
          subscription_owner_id: string | null
          team_code: string | null
          team_type: string | null
          updated_at: string | null
          uses_financial_year: boolean | null
        }
        Insert: {
          agency_id: string
          bio?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          extra_seats_purchased?: number | null
          financial_year_start_month?: number | null
          id?: string
          is_archived?: boolean | null
          is_orphan_team?: boolean | null
          is_personal_team?: boolean | null
          license_type?: string | null
          logo_url?: string | null
          name: string
          subscription_owner_id?: string | null
          team_code?: string | null
          team_type?: string | null
          updated_at?: string | null
          uses_financial_year?: boolean | null
        }
        Update: {
          agency_id?: string
          bio?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          extra_seats_purchased?: number | null
          financial_year_start_month?: number | null
          id?: string
          is_archived?: boolean | null
          is_orphan_team?: boolean | null
          is_personal_team?: boolean | null
          license_type?: string | null
          logo_url?: string | null
          name?: string
          subscription_owner_id?: string | null
          team_code?: string | null
          team_type?: string | null
          updated_at?: string | null
          uses_financial_year?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_subscription_owner_id_fkey"
            columns: ["subscription_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_documents: {
        Row: {
          assignees: string[] | null
          attachments: Json | null
          created_at: string | null
          created_by: string | null
          due_date: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          notes: string | null
          order_index: number | null
          required: boolean | null
          section: string | null
          stage: string
          status: string | null
          title: string
          transaction_id: string
          updated_at: string | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          assignees?: string[] | null
          attachments?: Json | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          notes?: string | null
          order_index?: number | null
          required?: boolean | null
          section?: string | null
          stage: string
          status?: string | null
          title: string
          transaction_id: string
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          assignees?: string[] | null
          attachments?: Json | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          notes?: string | null
          order_index?: number | null
          required?: boolean | null
          section?: string | null
          stage?: string
          status?: string | null
          title?: string
          transaction_id?: string
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_documents_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_links: {
        Row: {
          id: string
          linked_at: string | null
          listing_id: string | null
          transaction_id: string
        }
        Insert: {
          id?: string
          linked_at?: string | null
          listing_id?: string | null
          transaction_id: string
        }
        Update: {
          id?: string
          linked_at?: string | null
          listing_id?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_links_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_links_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_milestones: {
        Row: {
          completed_at: string | null
          created_at: string | null
          due_date: string | null
          id: string
          milestone_name: string
          notes: string | null
          transaction_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          milestone_name: string
          notes?: string | null
          transaction_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          milestone_name?: string
          notes?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_milestones_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_stage_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          documents: Json | null
          id: string
          is_default: boolean | null
          is_system_template: boolean | null
          name: string
          stage: string
          tasks: Json | null
          team_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          documents?: Json | null
          id?: string
          is_default?: boolean | null
          is_system_template?: boolean | null
          name: string
          stage: string
          tasks?: Json | null
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          documents?: Json | null
          id?: string
          is_default?: boolean | null
          is_system_template?: boolean | null
          name?: string
          stage?: string
          tasks?: Json | null
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_stage_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_stage_templates_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          address: string
          agent_id: string | null
          archived: boolean | null
          assignees: Json | null
          attachments: Json | null
          auction_deadline_date: string | null
          building_report_date: string | null
          buyer_names: Json | null
          campaign_type: string | null
          client_email: string | null
          client_name: string | null
          client_phone: string | null
          commission: number | null
          conditional_date: string | null
          contract_date: string | null
          created_at: string | null
          created_by: string | null
          deal_history: Json | null
          docs_done: number | null
          docs_total: number | null
          expected_settlement: string | null
          geocode_error: string | null
          geocoded_at: string | null
          id: string
          include_weekly_tasks: boolean
          last_edited_by: string | null
          latitude: number | null
          lead_source: string | null
          links: Json | null
          listing_expires_date: string | null
          listing_id: string | null
          listing_signed_date: string | null
          live_date: string | null
          longitude: number | null
          notes: string | null
          on_hold: boolean | null
          owners: Json | null
          photoshoot_date: string | null
          pre_settlement_inspection_date: string | null
          price_alignment_status: string | null
          sale_price: number | null
          settlement_date: string | null
          stage: string | null
          status: string | null
          suburb: string | null
          tasks_done: number | null
          tasks_total: number | null
          team_id: string
          team_price: number | null
          transaction_type: string
          unconditional_date: string | null
          updated_at: string | null
          vendor_email: string | null
          vendor_names: Json | null
          vendor_phone: string | null
          vendor_price: number | null
          warmth: string | null
        }
        Insert: {
          address: string
          agent_id?: string | null
          archived?: boolean | null
          assignees?: Json | null
          attachments?: Json | null
          auction_deadline_date?: string | null
          building_report_date?: string | null
          buyer_names?: Json | null
          campaign_type?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          commission?: number | null
          conditional_date?: string | null
          contract_date?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_history?: Json | null
          docs_done?: number | null
          docs_total?: number | null
          expected_settlement?: string | null
          geocode_error?: string | null
          geocoded_at?: string | null
          id?: string
          include_weekly_tasks?: boolean
          last_edited_by?: string | null
          latitude?: number | null
          lead_source?: string | null
          links?: Json | null
          listing_expires_date?: string | null
          listing_id?: string | null
          listing_signed_date?: string | null
          live_date?: string | null
          longitude?: number | null
          notes?: string | null
          on_hold?: boolean | null
          owners?: Json | null
          photoshoot_date?: string | null
          pre_settlement_inspection_date?: string | null
          price_alignment_status?: string | null
          sale_price?: number | null
          settlement_date?: string | null
          stage?: string | null
          status?: string | null
          suburb?: string | null
          tasks_done?: number | null
          tasks_total?: number | null
          team_id: string
          team_price?: number | null
          transaction_type: string
          unconditional_date?: string | null
          updated_at?: string | null
          vendor_email?: string | null
          vendor_names?: Json | null
          vendor_phone?: string | null
          vendor_price?: number | null
          warmth?: string | null
        }
        Update: {
          address?: string
          agent_id?: string | null
          archived?: boolean | null
          assignees?: Json | null
          attachments?: Json | null
          auction_deadline_date?: string | null
          building_report_date?: string | null
          buyer_names?: Json | null
          campaign_type?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          commission?: number | null
          conditional_date?: string | null
          contract_date?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_history?: Json | null
          docs_done?: number | null
          docs_total?: number | null
          expected_settlement?: string | null
          geocode_error?: string | null
          geocoded_at?: string | null
          id?: string
          include_weekly_tasks?: boolean
          last_edited_by?: string | null
          latitude?: number | null
          lead_source?: string | null
          links?: Json | null
          listing_expires_date?: string | null
          listing_id?: string | null
          listing_signed_date?: string | null
          live_date?: string | null
          longitude?: number | null
          notes?: string | null
          on_hold?: boolean | null
          owners?: Json | null
          photoshoot_date?: string | null
          pre_settlement_inspection_date?: string | null
          price_alignment_status?: string | null
          sale_price?: number | null
          settlement_date?: string | null
          stage?: string | null
          status?: string | null
          suburb?: string | null
          tasks_done?: number | null
          tasks_total?: number | null
          team_id?: string
          team_price?: number | null
          transaction_type?: string
          unconditional_date?: string | null
          updated_at?: string | null
          vendor_email?: string | null
          vendor_names?: Json | null
          vendor_phone?: string | null
          vendor_price?: number | null
          warmth?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_bug_points: {
        Row: {
          awarded_at: string | null
          bug_report_id: string | null
          id: string
          points: number
          reason: string | null
          user_id: string
        }
        Insert: {
          awarded_at?: string | null
          bug_report_id?: string | null
          id?: string
          points?: number
          reason?: string | null
          user_id: string
        }
        Update: {
          awarded_at?: string | null
          bug_report_id?: string | null
          id?: string
          points?: number
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_bug_points_bug_report_id_fkey"
            columns: ["bug_report_id"]
            isOneToOne: false
            referencedRelation: "bug_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_bug_points_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_by: string | null
          created_at: string | null
          granted_at: string
          granted_by: string | null
          id: string
          revoked_at: string | null
          revoked_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_reports: {
        Row: {
          created_at: string | null
          generated_by: string
          id: string
          listing_id: string | null
          report_data: Json
        }
        Insert: {
          created_at?: string | null
          generated_by: string
          id?: string
          listing_id?: string | null
          report_data: Json
        }
        Update: {
          created_at?: string | null
          generated_by?: string
          id?: string
          listing_id?: string | null
          report_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "vendor_reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_pipeline"
            referencedColumns: ["id"]
          },
        ]
      }
      voucher_redemptions: {
        Row: {
          id: string
          redeemed_at: string | null
          redeemed_by: string | null
          team_id: string | null
          voucher_id: string | null
        }
        Insert: {
          id?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          team_id?: string | null
          voucher_id?: string | null
        }
        Update: {
          id?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          team_id?: string | null
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voucher_redemptions_redeemed_by_fkey"
            columns: ["redeemed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_redemptions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_redemptions_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "admin_voucher_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_task_settings: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_task_settings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_task_templates: {
        Row: {
          created_at: string
          day_of_week: number
          default_size_category: string | null
          description: string | null
          id: string
          is_active: boolean
          position: number
          team_id: string
          title: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          default_size_category?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          position?: number
          team_id: string
          title: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          default_size_category?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          position?: number
          team_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_task_templates_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_channel_participant: {
        Args: {
          allow_posting?: boolean
          channel_id: string
          new_user_id: string
        }
        Returns: undefined
      }
      auto_repair_team_assignments: {
        Args: never
        Returns: {
          repaired_count: number
        }[]
      }
      check_backend_health:
        | {
            Args: never
            Returns: {
              database_connected: boolean
              status: string
              tables_count: number
            }[]
          }
        | {
            Args: { p_office_id?: string }
            Returns: {
              database_connected: boolean
              office_id: string
              status: string
              tables_count: number
            }[]
          }
      check_invitation_rate_limit: {
        Args: { _user_id: string }
        Returns: {
          allowed: boolean
          message: string
          retry_after: number
        }[]
      }
      create_default_lists_for_team: {
        Args: { p_team_id: string }
        Returns: undefined
      }
      get_agency_team_ids: { Args: { _agency_id: string }; Returns: string[] }
      get_or_create_conversation: {
        Args: { user1_id: string; user2_id: string }
        Returns: string
      }
      get_or_create_direct_conversation: {
        Args: { user1_id: string; user2_id: string }
        Returns: string
      }
      get_or_create_orphan_team: {
        Args: { _agency_id: string }
        Returns: string
      }
      get_user_accessible_team_ids: {
        Args: { _user_id: string }
        Returns: string[]
      }
      get_user_agency_id: { Args: { _user_id: string }; Returns: string }
      get_user_team_ids: { Args: { _user_id: string }; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_team_admin: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      is_team_member: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      reset_demo_data: { Args: never; Returns: Json }
      seed_demo_data: { Args: { p_demo_user_id?: string }; Returns: Json }
      set_active_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      access_level: "admin" | "view" | "edit"
      agency_account_status: "active" | "paused" | "pending_deletion"
      app_role:
        | "platform_admin"
        | "office_manager"
        | "team_leader"
        | "salesperson"
        | "assistant"
      goal_type: "individual" | "team"
      invitation_status: "pending" | "accepted" | "revoked" | "expired"
      kpi_type: "calls" | "appraisals" | "listings_won" | "settlement_volume"
      listing_warmth: "cold" | "warm" | "hot"
      log_period: "daily" | "weekly" | "monthly" | "quarterly" | "annual"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      access_level: ["admin", "view", "edit"],
      agency_account_status: ["active", "paused", "pending_deletion"],
      app_role: [
        "platform_admin",
        "office_manager",
        "team_leader",
        "salesperson",
        "assistant",
      ],
      goal_type: ["individual", "team"],
      invitation_status: ["pending", "accepted", "revoked", "expired"],
      kpi_type: ["calls", "appraisals", "listings_won", "settlement_volume"],
      listing_warmth: ["cold", "warm", "hot"],
      log_period: ["daily", "weekly", "monthly", "quarterly", "annual"],
    },
  },
} as const
