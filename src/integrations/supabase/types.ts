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
          activity_type: string
          admin_id: string | null
          created_at: string | null
          description: string
          id: string
          metadata: Json | null
        }
        Insert: {
          activity_type: string
          admin_id?: string | null
          created_at?: string | null
          description: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          activity_type?: string
          admin_id?: string | null
          created_at?: string | null
          description?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      admin_impersonation_log: {
        Row: {
          actions_taken: string[] | null
          admin_id: string | null
          ended_at: string | null
          id: string
          impersonated_user_id: string | null
          reason: string
          started_at: string | null
        }
        Insert: {
          actions_taken?: string[] | null
          admin_id?: string | null
          ended_at?: string | null
          id?: string
          impersonated_user_id?: string | null
          reason: string
          started_at?: string | null
        }
        Update: {
          actions_taken?: string[] | null
          admin_id?: string | null
          ended_at?: string | null
          id?: string
          impersonated_user_id?: string | null
          reason?: string
          started_at?: string | null
        }
        Relationships: []
      }
      agencies: {
        Row: {
          bio: string | null
          brand: string | null
          brand_color: string | null
          created_at: string
          created_by: string
          id: string
          invite_code: string | null
          is_archived: boolean
          logo_url: string | null
          name: string
          office_channel_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          bio?: string | null
          brand?: string | null
          brand_color?: string | null
          created_at?: string
          created_by: string
          id?: string
          invite_code?: string | null
          is_archived?: boolean
          logo_url?: string | null
          name: string
          office_channel_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          bio?: string | null
          brand?: string | null
          brand_color?: string | null
          created_at?: string
          created_by?: string
          id?: string
          invite_code?: string | null
          is_archived?: boolean
          logo_url?: string | null
          name?: string
          office_channel_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agencies_office_channel_id_fkey"
            columns: ["office_channel_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_financials: {
        Row: {
          agency_id: string | null
          arr: number | null
          billing_cycle: string | null
          created_at: string | null
          discount_amount: number | null
          discount_applied: string | null
          id: string
          lifetime_value: number | null
          mrr: number | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_plan_id: string | null
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          arr?: number | null
          billing_cycle?: string | null
          created_at?: string | null
          discount_amount?: number | null
          discount_applied?: string | null
          id?: string
          lifetime_value?: number | null
          mrr?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_plan_id?: string | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          arr?: number | null
          billing_cycle?: string | null
          created_at?: string | null
          discount_amount?: number | null
          discount_applied?: string | null
          id?: string
          lifetime_value?: number | null
          mrr?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_plan_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_financials_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_financials_subscription_plan_id_fkey"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_subscription_plans: {
        Row: {
          created_at: string
          id: string
          module_id: string
          plan_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          module_id: string
          plan_id: string
        }
        Update: {
          created_at?: string
          id?: string
          module_id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_subscription_plans_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_subscriptions: {
        Row: {
          agency_id: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          plan_id: string
          started_at: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          plan_id: string
          started_at?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          plan_id?: string
          started_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_subscriptions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_tracking: {
        Row: {
          action_count: number
          action_date: string
          created_at: string | null
          id: string
          last_action_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action_count?: number
          action_date?: string
          created_at?: string | null
          id?: string
          last_action_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action_count?: number
          action_date?: string
          created_at?: string | null
          id?: string
          last_action_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          target_user_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_user_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_user_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      birthday_celebrations: {
        Row: {
          auto_post_id: string | null
          birthday_date: string
          birthday_user_id: string
          celebration_count: number
          created_at: string
          id: string
        }
        Insert: {
          auto_post_id?: string | null
          birthday_date: string
          birthday_user_id: string
          celebration_count?: number
          created_at?: string
          id?: string
        }
        Update: {
          auto_post_id?: string | null
          birthday_date?: string
          birthday_user_id?: string
          celebration_count?: number
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "birthday_celebrations_auto_post_id_fkey"
            columns: ["auto_post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "birthday_celebrations_birthday_user_id_fkey"
            columns: ["birthday_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bug_categories: {
        Row: {
          color: string
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          color: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      bug_report_categories: {
        Row: {
          bug_report_id: string | null
          category_id: string | null
          created_at: string | null
          id: string
        }
        Insert: {
          bug_report_id?: string | null
          category_id?: string | null
          created_at?: string | null
          id?: string
        }
        Update: {
          bug_report_id?: string | null
          category_id?: string | null
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bug_report_categories_bug_report_id_fkey"
            columns: ["bug_report_id"]
            isOneToOne: false
            referencedRelation: "bug_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bug_report_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "bug_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      bug_report_comments: {
        Row: {
          bug_report_id: string
          content: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bug_report_id: string
          content: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bug_report_id?: string
          content?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
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
        ]
      }
      bug_reports: {
        Row: {
          admin_comments: string | null
          ai_analysis: Json | null
          ai_analyzed_at: string | null
          ai_confidence: number | null
          ai_impact: string | null
          archived_at: string | null
          archived_reason: string | null
          attachments: string[] | null
          created_at: string | null
          description: string
          environment: Json | null
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
          status: string | null
          steps_to_reproduce: string | null
          summary: string
          team_id: string | null
          updated_at: string | null
          user_id: string
          vote_count: number | null
          workspace_module: string | null
        }
        Insert: {
          admin_comments?: string | null
          ai_analysis?: Json | null
          ai_analyzed_at?: string | null
          ai_confidence?: number | null
          ai_impact?: string | null
          archived_at?: string | null
          archived_reason?: string | null
          attachments?: string[] | null
          created_at?: string | null
          description: string
          environment?: Json | null
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
          status?: string | null
          steps_to_reproduce?: string | null
          summary: string
          team_id?: string | null
          updated_at?: string | null
          user_id: string
          vote_count?: number | null
          workspace_module?: string | null
        }
        Update: {
          admin_comments?: string | null
          ai_analysis?: Json | null
          ai_analyzed_at?: string | null
          ai_confidence?: number | null
          ai_impact?: string | null
          archived_at?: string | null
          archived_reason?: string | null
          attachments?: string[] | null
          created_at?: string | null
          description?: string
          environment?: Json | null
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
          status?: string | null
          steps_to_reproduce?: string | null
          summary?: string
          team_id?: string | null
          updated_at?: string | null
          user_id?: string
          vote_count?: number | null
          workspace_module?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bug_reports_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_conversation_messages: {
        Row: {
          author_id: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
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
          created_at: string
          created_by: string
          id: string
          is_shared: boolean
          is_starred: boolean
          messages: Json
          share_with_friends: boolean | null
          team_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_shared?: boolean
          is_starred?: boolean
          messages?: Json
          share_with_friends?: boolean | null
          team_id?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_shared?: boolean
          is_starred?: boolean
          messages?: Json
          share_with_friends?: boolean | null
          team_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          can_post: boolean | null
          conversation_id: string | null
          id: string
          is_admin: boolean | null
          is_muted: boolean | null
          joined_at: string | null
          last_read_at: string | null
          muted: boolean | null
          user_id: string | null
        }
        Insert: {
          can_post?: boolean | null
          conversation_id?: string | null
          id?: string
          is_admin?: boolean | null
          is_muted?: boolean | null
          joined_at?: string | null
          last_read_at?: string | null
          muted?: boolean | null
          user_id?: string | null
        }
        Update: {
          can_post?: boolean | null
          conversation_id?: string | null
          id?: string
          is_admin?: boolean | null
          is_muted?: boolean | null
          joined_at?: string | null
          last_read_at?: string | null
          muted?: boolean | null
          user_id?: string | null
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
          allow_member_invites: boolean | null
          archived: boolean | null
          channel_type: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_system_channel: boolean | null
          last_message_at: string | null
          title: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          allow_member_invites?: boolean | null
          archived?: boolean | null
          channel_type?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_system_channel?: boolean | null
          last_message_at?: string | null
          title?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          allow_member_invites?: boolean | null
          archived?: boolean | null
          channel_type?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_system_channel?: boolean | null
          last_message_at?: string | null
          title?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
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
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      daily_log_tracker: {
        Row: {
          created_at: string
          id: string
          is_business_day: boolean
          log_date: string
          logged_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_business_day?: boolean
          log_date: string
          logged_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_business_day?: boolean
          log_date?: string
          logged_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_planner_assignments: {
        Row: {
          created_at: string
          id: string
          planner_item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          planner_item_id: string
          user_id: string
        }
        Update: {
          created_at?: string
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
      daily_planner_generated_instances: {
        Row: {
          created_at: string | null
          generated_for_date: string
          id: string
          planner_item_id: string
          template_id: string
        }
        Insert: {
          created_at?: string | null
          generated_for_date: string
          id?: string
          planner_item_id: string
          template_id: string
        }
        Update: {
          created_at?: string | null
          generated_for_date?: string
          id?: string
          planner_item_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_planner_generated_instances_planner_item_id_fkey"
            columns: ["planner_item_id"]
            isOneToOne: false
            referencedRelation: "daily_planner_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_planner_generated_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "daily_planner_recurring_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_planner_items: {
        Row: {
          completed: boolean
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string
          estimated_minutes: number | null
          id: string
          notes: string | null
          order_within_category: number | null
          position: number
          scheduled_date: string
          size_category: string | null
          team_id: string
          title: string
          updated_at: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by: string
          estimated_minutes?: number | null
          id?: string
          notes?: string | null
          order_within_category?: number | null
          position?: number
          scheduled_date: string
          size_category?: string | null
          team_id: string
          title: string
          updated_at?: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string
          estimated_minutes?: number | null
          id?: string
          notes?: string | null
          order_within_category?: number | null
          position?: number
          scheduled_date?: string
          size_category?: string | null
          team_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_planner_items_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_planner_recurring_templates: {
        Row: {
          created_at: string | null
          created_by: string
          end_date: string | null
          estimated_minutes: number | null
          id: string
          is_active: boolean | null
          last_generated_date: string | null
          notes: string | null
          recurrence_days: number[] | null
          recurrence_type: string
          size_category: string
          start_date: string
          team_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          end_date?: string | null
          estimated_minutes?: number | null
          id?: string
          is_active?: boolean | null
          last_generated_date?: string | null
          notes?: string | null
          recurrence_days?: number[] | null
          recurrence_type: string
          size_category: string
          start_date: string
          team_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          end_date?: string | null
          estimated_minutes?: number | null
          id?: string
          is_active?: boolean | null
          last_generated_date?: string | null
          notes?: string | null
          recurrence_days?: number[] | null
          recurrence_type?: string
          size_category?: string
          start_date?: string
          team_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_planner_recurring_templates_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          access_type: string
          active: boolean
          code: string
          created_at: string
          description: string
          expires_at: string | null
        }
        Insert: {
          access_type: string
          active?: boolean
          code: string
          created_at?: string
          description: string
          expires_at?: string | null
        }
        Update: {
          access_type?: string
          active?: boolean
          code?: string
          created_at?: string
          description?: string
          expires_at?: string | null
        }
        Relationships: []
      }
      feature_request_comments: {
        Row: {
          comment: string
          created_at: string | null
          feature_request_id: string | null
          id: string
          is_admin: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          comment: string
          created_at?: string | null
          feature_request_id?: string | null
          id?: string
          is_admin?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          comment?: string
          created_at?: string | null
          feature_request_id?: string | null
          id?: string
          is_admin?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_request_comments_feature_request_id_fkey"
            columns: ["feature_request_id"]
            isOneToOne: false
            referencedRelation: "feature_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_request_votes: {
        Row: {
          created_at: string
          feature_request_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feature_request_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
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
          created_at: string
          description: string
          id: string
          module: string | null
          position: number | null
          priority: string | null
          status: string
          team_id: string | null
          title: string
          updated_at: string
          user_id: string
          vote_count: number
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
          created_at?: string
          description: string
          id?: string
          module?: string | null
          position?: number | null
          priority?: string | null
          status?: string
          team_id?: string | null
          title: string
          updated_at?: string
          user_id: string
          vote_count?: number
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
          created_at?: string
          description?: string
          id?: string
          module?: string | null
          position?: number | null
          priority?: string | null
          status?: string
          team_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          vote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "feature_requests_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
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
          accepted: boolean
          created_at: string
          friend_id: string
          id: string
          invite_code: string
          is_starred: boolean
          user_id: string
        }
        Insert: {
          accepted?: boolean
          created_at?: string
          friend_id: string
          id?: string
          invite_code: string
          is_starred?: boolean
          user_id: string
        }
        Update: {
          accepted?: boolean
          created_at?: string
          friend_id?: string
          id?: string
          invite_code?: string
          is_starred?: boolean
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
          created_at: string
          created_by: string
          end_date: string
          goal_type: Database["public"]["Enums"]["goal_type"]
          id: string
          kpi_type: Database["public"]["Enums"]["kpi_type"]
          period: Database["public"]["Enums"]["log_period"]
          set_by_admin: boolean
          start_date: string
          target_value: number
          team_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          created_by: string
          end_date: string
          goal_type: Database["public"]["Enums"]["goal_type"]
          id?: string
          kpi_type: Database["public"]["Enums"]["kpi_type"]
          period: Database["public"]["Enums"]["log_period"]
          set_by_admin?: boolean
          start_date: string
          target_value: number
          team_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          created_by?: string
          end_date?: string
          goal_type?: Database["public"]["Enums"]["goal_type"]
          id?: string
          kpi_type?: Database["public"]["Enums"]["kpi_type"]
          period?: Database["public"]["Enums"]["log_period"]
          set_by_admin?: boolean
          start_date?: string
          target_value?: number
          team_id?: string | null
          updated_at?: string
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
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      help_requests: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          created_by: string
          description: string
          escalation_level: string
          id: string
          metadata: Json | null
          office_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category: string
          created_at?: string
          created_by: string
          description: string
          escalation_level?: string
          id?: string
          metadata?: Json | null
          office_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          team_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          escalation_level?: string
          id?: string
          metadata?: Json | null
          office_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          team_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_requests_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_requests_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_activity_log: {
        Row: {
          activity_type: string
          actor_id: string | null
          created_at: string | null
          error_reason: string | null
          id: string
          invitation_id: string | null
          metadata: Json | null
          office_id: string | null
          recipient_email: string
          team_id: string | null
        }
        Insert: {
          activity_type: string
          actor_id?: string | null
          created_at?: string | null
          error_reason?: string | null
          id?: string
          invitation_id?: string | null
          metadata?: Json | null
          office_id?: string | null
          recipient_email: string
          team_id?: string | null
        }
        Update: {
          activity_type?: string
          actor_id?: string | null
          created_at?: string | null
          error_reason?: string | null
          id?: string
          invitation_id?: string | null
          metadata?: Json | null
          office_id?: string | null
          recipient_email?: string
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitation_activity_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_activity_log_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "pending_invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_activity_log_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_activity_log_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_rate_limits: {
        Row: {
          created_at: string | null
          daily_count: number | null
          day_window_start: string | null
          hour_window_start: string | null
          hourly_count: number | null
          month_window_start: string | null
          monthly_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          daily_count?: number | null
          day_window_start?: string | null
          hour_window_start?: string | null
          hourly_count?: number | null
          month_window_start?: string | null
          monthly_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          daily_count?: number | null
          day_window_start?: string | null
          hour_window_start?: string | null
          hourly_count?: number | null
          month_window_start?: string | null
          monthly_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      kb_card_views: {
        Row: {
          card_id: string | null
          completed: boolean | null
          completed_at: string | null
          id: string
          time_spent_seconds: number | null
          user_id: string | null
          viewed_at: string | null
        }
        Insert: {
          card_id?: string | null
          completed?: boolean | null
          completed_at?: string | null
          id?: string
          time_spent_seconds?: number | null
          user_id?: string | null
          viewed_at?: string | null
        }
        Update: {
          card_id?: string | null
          completed?: boolean | null
          completed_at?: string | null
          id?: string
          time_spent_seconds?: number | null
          user_id?: string | null
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
        ]
      }
      knowledge_base_cards: {
        Row: {
          attachments: Json | null
          card_number: number
          content: Json | null
          created_at: string | null
          estimated_minutes: number | null
          id: string
          playbook_id: string | null
          template: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          attachments?: Json | null
          card_number: number
          content?: Json | null
          created_at?: string | null
          estimated_minutes?: number | null
          id?: string
          playbook_id?: string | null
          template?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          attachments?: Json | null
          card_number?: number
          content?: Json | null
          created_at?: string | null
          estimated_minutes?: number | null
          id?: string
          playbook_id?: string | null
          template?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_cards_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base_playbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_categories: {
        Row: {
          color_theme: string
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          sort_order: number | null
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          color_theme?: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          sort_order?: number | null
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          color_theme?: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_categories_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_playbooks: {
        Row: {
          category_id: string | null
          cover_image: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          estimated_minutes: number | null
          id: string
          is_published: boolean | null
          roles: string[] | null
          tags: string[] | null
          team_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          cover_image?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          is_published?: boolean | null
          roles?: string[] | null
          tags?: string[] | null
          team_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          cover_image?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          is_published?: boolean | null
          roles?: string[] | null
          tags?: string[] | null
          team_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_playbooks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_playbooks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_entries: {
        Row: {
          created_at: string
          entry_date: string
          id: string
          is_locked: boolean
          kpi_type: Database["public"]["Enums"]["kpi_type"]
          logged_at: string | null
          period: Database["public"]["Enums"]["log_period"]
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          entry_date: string
          id?: string
          is_locked?: boolean
          kpi_type: Database["public"]["Enums"]["kpi_type"]
          logged_at?: string | null
          period: Database["public"]["Enums"]["log_period"]
          updated_at?: string
          user_id: string
          value?: number
        }
        Update: {
          created_at?: string
          entry_date?: string
          id?: string
          is_locked?: boolean
          kpi_type?: Database["public"]["Enums"]["kpi_type"]
          logged_at?: string | null
          period?: Database["public"]["Enums"]["log_period"]
          updated_at?: string
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
      kpi_targets: {
        Row: {
          admin_notes: string | null
          created_at: string
          created_by: string
          end_date: string
          id: string
          kpi_type: string
          period_type: string
          set_by_admin: boolean
          source: string
          start_date: string
          target_value: number
          team_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          created_by: string
          end_date: string
          id?: string
          kpi_type: string
          period_type: string
          set_by_admin?: boolean
          source?: string
          start_date: string
          target_value: number
          team_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          created_by?: string
          end_date?: string
          id?: string
          kpi_type?: string
          period_type?: string
          set_by_admin?: boolean
          source?: string
          start_date?: string
          target_value?: number
          team_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_targets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_targets_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_targets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_source_options: {
        Row: {
          agency_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          label: string
          sort_order: number | null
          updated_at: string | null
          value: string
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          label: string
          sort_order?: number | null
          updated_at?: string | null
          value: string
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          label?: string
          sort_order?: number | null
          updated_at?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_source_options_agency_id_fkey"
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
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
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
        ]
      }
      listing_descriptions: {
        Row: {
          additional_features: string | null
          address: string
          bathrooms: number
          bedrooms: number
          created_at: string
          created_by: string
          generated_descriptions: Json
          id: string
          listing_type: string
          target_audience: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          additional_features?: string | null
          address: string
          bathrooms: number
          bedrooms: number
          created_at?: string
          created_by: string
          generated_descriptions: Json
          id?: string
          listing_type: string
          target_audience: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          additional_features?: string | null
          address?: string
          bathrooms?: number
          bedrooms?: number
          created_at?: string
          created_by?: string
          generated_descriptions?: Json
          id?: string
          listing_type?: string
          target_audience?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_descriptions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_pipeline_stats: {
        Row: {
          cold_count: number | null
          conversion_rate: number | null
          created_at: string | null
          hot_count: number | null
          id: string
          period_end: string
          period_start: string
          team_id: string | null
          total_listings: number | null
          total_value: number | null
          user_id: string | null
          warm_count: number | null
        }
        Insert: {
          cold_count?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          hot_count?: number | null
          id?: string
          period_end: string
          period_start: string
          team_id?: string | null
          total_listings?: number | null
          total_value?: number | null
          user_id?: string | null
          warm_count?: number | null
        }
        Update: {
          cold_count?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          hot_count?: number | null
          id?: string
          period_end?: string
          period_start?: string
          team_id?: string | null
          total_listings?: number | null
          total_value?: number | null
          user_id?: string | null
          warm_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_pipeline_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
          campaign_start_date: string | null
          contract_signed_date: string | null
          created_at: string
          created_by: string
          estimated_value: number | null
          expected_month: string
          geocode_error: string | null
          geocoded_at: string | null
          id: string
          last_contact: string
          last_edited_by: string
          latitude: number | null
          lead_source: string | null
          likelihood: number
          listing_appointment_date: string | null
          longitude: number | null
          loss_reason: string | null
          lost_date: string | null
          notes: string | null
          open_home_dates: Json | null
          outcome: string | null
          region: string | null
          stage: string | null
          suburb: string | null
          team_id: string
          updated_at: string
          vendor_name: string
          warmth: Database["public"]["Enums"]["listing_warmth"]
        }
        Insert: {
          address: string
          appraisal_date?: string | null
          appraisal_id?: string | null
          archived_at?: string | null
          assigned_to?: string | null
          attachments?: Json | null
          campaign_start_date?: string | null
          contract_signed_date?: string | null
          created_at?: string
          created_by: string
          estimated_value?: number | null
          expected_month: string
          geocode_error?: string | null
          geocoded_at?: string | null
          id?: string
          last_contact: string
          last_edited_by: string
          latitude?: number | null
          lead_source?: string | null
          likelihood?: number
          listing_appointment_date?: string | null
          longitude?: number | null
          loss_reason?: string | null
          lost_date?: string | null
          notes?: string | null
          open_home_dates?: Json | null
          outcome?: string | null
          region?: string | null
          stage?: string | null
          suburb?: string | null
          team_id: string
          updated_at?: string
          vendor_name: string
          warmth?: Database["public"]["Enums"]["listing_warmth"]
        }
        Update: {
          address?: string
          appraisal_date?: string | null
          appraisal_id?: string | null
          archived_at?: string | null
          assigned_to?: string | null
          attachments?: Json | null
          campaign_start_date?: string | null
          contract_signed_date?: string | null
          created_at?: string
          created_by?: string
          estimated_value?: number | null
          expected_month?: string
          geocode_error?: string | null
          geocoded_at?: string | null
          id?: string
          last_contact?: string
          last_edited_by?: string
          latitude?: number | null
          lead_source?: string | null
          likelihood?: number
          listing_appointment_date?: string | null
          longitude?: number | null
          loss_reason?: string | null
          lost_date?: string | null
          notes?: string | null
          open_home_dates?: Json | null
          outcome?: string | null
          region?: string | null
          stage?: string | null
          suburb?: string | null
          team_id?: string
          updated_at?: string
          vendor_name?: string
          warmth?: Database["public"]["Enums"]["listing_warmth"]
        }
        Relationships: [
          {
            foreignKeyName: "listings_pipeline_appraisal_id_fkey"
            columns: ["appraisal_id"]
            isOneToOne: false
            referencedRelation: "logged_appraisals"
            referencedColumns: ["id"]
          },
        ]
      }
      logged_appraisals: {
        Row: {
          address: string
          appraisal_date: string
          appraisal_method: string | null
          appraisal_range_high: number | null
          appraisal_range_low: number | null
          attachments: Json | null
          converted_date: string | null
          created_at: string | null
          created_by: string
          estimated_value: number | null
          geocode_error: string | null
          geocoded_at: string | null
          id: string
          intent: string
          last_contact: string | null
          last_edited_by: string
          latitude: number | null
          lead_source: string | null
          longitude: number | null
          loss_reason: string | null
          next_follow_up: string | null
          notes: string | null
          opportunity_id: string | null
          outcome: string | null
          region: string | null
          stage: string | null
          status: string | null
          suburb: string | null
          team_id: string
          updated_at: string | null
          vendor_name: string
        }
        Insert: {
          address: string
          appraisal_date: string
          appraisal_method?: string | null
          appraisal_range_high?: number | null
          appraisal_range_low?: number | null
          attachments?: Json | null
          converted_date?: string | null
          created_at?: string | null
          created_by: string
          estimated_value?: number | null
          geocode_error?: string | null
          geocoded_at?: string | null
          id?: string
          intent?: string
          last_contact?: string | null
          last_edited_by: string
          latitude?: number | null
          lead_source?: string | null
          longitude?: number | null
          loss_reason?: string | null
          next_follow_up?: string | null
          notes?: string | null
          opportunity_id?: string | null
          outcome?: string | null
          region?: string | null
          stage?: string | null
          status?: string | null
          suburb?: string | null
          team_id: string
          updated_at?: string | null
          vendor_name: string
        }
        Update: {
          address?: string
          appraisal_date?: string
          appraisal_method?: string | null
          appraisal_range_high?: number | null
          appraisal_range_low?: number | null
          attachments?: Json | null
          converted_date?: string | null
          created_at?: string | null
          created_by?: string
          estimated_value?: number | null
          geocode_error?: string | null
          geocoded_at?: string | null
          id?: string
          intent?: string
          last_contact?: string | null
          last_edited_by?: string
          latitude?: number | null
          lead_source?: string | null
          longitude?: number | null
          loss_reason?: string | null
          next_follow_up?: string | null
          notes?: string | null
          opportunity_id?: string | null
          outcome?: string | null
          region?: string | null
          stage?: string | null
          status?: string | null
          suburb?: string | null
          team_id?: string
          updated_at?: string | null
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "logged_appraisals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logged_appraisals_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logged_appraisals_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "listings_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logged_appraisals_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      message_polls: {
        Row: {
          allow_multiple: boolean | null
          closed: boolean | null
          created_at: string | null
          expires_at: string | null
          id: string
          message_id: string | null
          options: Json
          question: string
        }
        Insert: {
          allow_multiple?: boolean | null
          closed?: boolean | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          message_id?: string | null
          options: Json
          question: string
        }
        Update: {
          allow_multiple?: boolean | null
          closed?: boolean | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          message_id?: string | null
          options?: Json
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_polls_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          author_id: string | null
          content: string
          conversation_id: string | null
          created_at: string | null
          deleted: boolean | null
          edited: boolean | null
          id: string
          message_type: string | null
          reactions: Json | null
          reply_to_id: string | null
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          content: string
          conversation_id?: string | null
          created_at?: string | null
          deleted?: boolean | null
          edited?: boolean | null
          id?: string
          message_type?: string | null
          reactions?: Json | null
          reply_to_id?: string | null
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          deleted?: boolean | null
          edited?: boolean | null
          id?: string
          message_type?: string | null
          reactions?: Json | null
          reply_to_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      module_audit_events: {
        Row: {
          admin_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          module_id: string | null
          new_policy: string | null
          old_policy: string | null
          reason: string | null
          scope_id: string | null
          scope_type: string | null
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          module_id?: string | null
          new_policy?: string | null
          old_policy?: string | null
          reason?: string | null
          scope_id?: string | null
          scope_type?: string | null
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          module_id?: string | null
          new_policy?: string | null
          old_policy?: string | null
          reason?: string | null
          scope_id?: string | null
          scope_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_audit_events_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_audit_events_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_audit_events_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "user_effective_access_new"
            referencedColumns: ["module_id"]
          },
        ]
      }
      module_policies: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          module_id: string
          policy: string
          reason: string | null
          scope_id: string | null
          scope_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          module_id: string
          policy: string
          reason?: string | null
          scope_id?: string | null
          scope_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          module_id?: string
          policy?: string
          reason?: string | null
          scope_id?: string | null
          scope_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_policies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_policies_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_policies_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "user_effective_access_new"
            referencedColumns: ["module_id"]
          },
        ]
      }
      module_usage_stats: {
        Row: {
          created_at: string
          id: string
          last_visited_at: string | null
          module_id: string
          user_id: string
          visit_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          last_visited_at?: string | null
          module_id: string
          user_id: string
          visit_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          last_visited_at?: string | null
          module_id?: string
          user_id?: string
          visit_count?: number
        }
        Relationships: []
      }
      modules: {
        Row: {
          category: string
          created_at: string
          default_policy: string
          dependencies: string[] | null
          description: string | null
          icon: string | null
          id: string
          is_system: boolean
          sort_order: number
          title: string
        }
        Insert: {
          category?: string
          created_at?: string
          default_policy?: string
          dependencies?: string[] | null
          description?: string | null
          icon?: string | null
          id: string
          is_system?: boolean
          sort_order?: number
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          default_policy?: string
          dependencies?: string[] | null
          description?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      note_comments: {
        Row: {
          body: Json
          created_at: string
          id: string
          mentions: string[] | null
          note_id: string
          resolved: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body: Json
          created_at?: string
          id?: string
          mentions?: string[] | null
          note_id: string
          resolved?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: Json
          created_at?: string
          id?: string
          mentions?: string[] | null
          note_id?: string
          resolved?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_comments_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      note_links: {
        Row: {
          created_at: string
          created_by: string
          id: string
          note_id: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          note_id: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          note_id?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_links_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      note_presence: {
        Row: {
          last_seen_at: string | null
          note_id: string
          user_id: string
        }
        Insert: {
          last_seen_at?: string | null
          note_id: string
          user_id: string
        }
        Update: {
          last_seen_at?: string | null
          note_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_presence_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_presence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      note_shares: {
        Row: {
          created_at: string | null
          id: string
          invited_by: string | null
          note_id: string | null
          permission: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          invited_by?: string | null
          note_id?: string | null
          permission: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          invited_by?: string | null
          note_id?: string | null
          permission?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "note_shares_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_shares_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
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
      note_templates: {
        Row: {
          archived_at: string | null
          category: string
          content_rich: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_system: boolean | null
          team_id: string | null
          title: string
          usage_count: number | null
        }
        Insert: {
          archived_at?: string | null
          category: string
          content_rich: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          team_id?: string | null
          title: string
          usage_count?: number | null
        }
        Update: {
          archived_at?: string | null
          category?: string
          content_rich?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          team_id?: string | null
          title?: string
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "note_templates_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          archived_at: string | null
          content_plain: string | null
          content_rich: Json | null
          created_at: string
          id: string
          is_pinned: boolean | null
          is_template: boolean | null
          owner_id: string
          search_vector: unknown
          tags: string[] | null
          team_id: string | null
          title: string
          updated_at: string
          version_history: Json | null
          visibility: string | null
        }
        Insert: {
          archived_at?: string | null
          content_plain?: string | null
          content_rich?: Json | null
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          is_template?: boolean | null
          owner_id: string
          search_vector?: unknown
          tags?: string[] | null
          team_id?: string | null
          title: string
          updated_at?: string
          version_history?: Json | null
          visibility?: string | null
        }
        Update: {
          archived_at?: string | null
          content_plain?: string | null
          content_rich?: Json | null
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          is_template?: boolean | null
          owner_id?: string
          search_vector?: unknown
          tags?: string[] | null
          team_id?: string | null
          title?: string
          updated_at?: string
          version_history?: Json | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          dm_notifications: boolean | null
          email_digest: boolean | null
          group_notifications: boolean | null
          mention_notifications: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dm_notifications?: boolean | null
          email_digest?: boolean | null
          group_notifications?: boolean | null
          mention_notifications?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dm_notifications?: boolean | null
          email_digest?: boolean | null
          group_notifications?: boolean | null
          mention_notifications?: boolean | null
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
          created_at: string | null
          display_as_banner: boolean | null
          expires_at: string | null
          id: string
          message: string
          metadata: Json | null
          read: boolean | null
          sent_by: string | null
          target_id: string | null
          target_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_as_banner?: boolean | null
          expires_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean | null
          sent_by?: string | null
          target_id?: string | null
          target_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_as_banner?: boolean | null
          expires_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean | null
          sent_by?: string | null
          target_id?: string | null
          target_type?: string | null
          title?: string
          type?: string
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
      office_goals: {
        Row: {
          agency_id: string
          created_at: string | null
          created_by: string | null
          id: string
          target_cch: number
          week_start_date: string
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          target_cch: number
          week_start_date: string
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          target_cch?: number
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "office_goals_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      office_manager_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          office_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          office_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          office_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "office_manager_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_manager_assignments_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "agencies"
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
      password_reset_rate_limits: {
        Row: {
          attempt_count: number | null
          created_at: string | null
          email: string
          id: string
          last_attempt_at: string | null
          window_start: string | null
        }
        Insert: {
          attempt_count?: number | null
          created_at?: string | null
          email: string
          id?: string
          last_attempt_at?: string | null
          window_start?: string | null
        }
        Update: {
          attempt_count?: number | null
          created_at?: string | null
          email?: string
          id?: string
          last_attempt_at?: string | null
          window_start?: string | null
        }
        Relationships: []
      }
      past_sales: {
        Row: {
          address: string
          appraisal_date: string | null
          appraisal_high: number | null
          appraisal_low: number | null
          attachments: Json | null
          buyer_details: Json | null
          cabinet_number: string | null
          commission_amount: number | null
          commission_rate: number | null
          created_at: string
          created_by: string
          days_on_market: number | null
          days_to_convert: number | null
          first_contact_date: string | null
          geocode_error: string | null
          geocoded_at: string | null
          id: string
          last_contacted_date: string | null
          latitude: number | null
          lead_salesperson: string | null
          lead_source: string | null
          lead_source_detail: string | null
          listing_live_date: string | null
          listing_price: number | null
          listing_signed_date: string | null
          listing_type: string | null
          listing_url: string | null
          longitude: number | null
          lost_date: string | null
          lost_reason: string | null
          marketing_spend: number | null
          matterport_url: string | null
          next_followup_date: string | null
          photos: string[] | null
          referral_potential: string | null
          referral_tags: string[] | null
          region: string | null
          relationship_notes: string | null
          sale_price: number | null
          secondary_salesperson: string | null
          settlement_date: string | null
          status: string
          suburb: string | null
          team_id: string
          team_recommended_price: number | null
          unconditional_date: string | null
          updated_at: string
          vendor_details: Json | null
          vendor_expected_price: number | null
          video_tour_url: string | null
          won_date: string | null
        }
        Insert: {
          address: string
          appraisal_date?: string | null
          appraisal_high?: number | null
          appraisal_low?: number | null
          attachments?: Json | null
          buyer_details?: Json | null
          cabinet_number?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string
          created_by: string
          days_on_market?: number | null
          days_to_convert?: number | null
          first_contact_date?: string | null
          geocode_error?: string | null
          geocoded_at?: string | null
          id?: string
          last_contacted_date?: string | null
          latitude?: number | null
          lead_salesperson?: string | null
          lead_source?: string | null
          lead_source_detail?: string | null
          listing_live_date?: string | null
          listing_price?: number | null
          listing_signed_date?: string | null
          listing_type?: string | null
          listing_url?: string | null
          longitude?: number | null
          lost_date?: string | null
          lost_reason?: string | null
          marketing_spend?: number | null
          matterport_url?: string | null
          next_followup_date?: string | null
          photos?: string[] | null
          referral_potential?: string | null
          referral_tags?: string[] | null
          region?: string | null
          relationship_notes?: string | null
          sale_price?: number | null
          secondary_salesperson?: string | null
          settlement_date?: string | null
          status?: string
          suburb?: string | null
          team_id: string
          team_recommended_price?: number | null
          unconditional_date?: string | null
          updated_at?: string
          vendor_details?: Json | null
          vendor_expected_price?: number | null
          video_tour_url?: string | null
          won_date?: string | null
        }
        Update: {
          address?: string
          appraisal_date?: string | null
          appraisal_high?: number | null
          appraisal_low?: number | null
          attachments?: Json | null
          buyer_details?: Json | null
          cabinet_number?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string
          created_by?: string
          days_on_market?: number | null
          days_to_convert?: number | null
          first_contact_date?: string | null
          geocode_error?: string | null
          geocoded_at?: string | null
          id?: string
          last_contacted_date?: string | null
          latitude?: number | null
          lead_salesperson?: string | null
          lead_source?: string | null
          lead_source_detail?: string | null
          listing_live_date?: string | null
          listing_price?: number | null
          listing_signed_date?: string | null
          listing_type?: string | null
          listing_url?: string | null
          longitude?: number | null
          lost_date?: string | null
          lost_reason?: string | null
          marketing_spend?: number | null
          matterport_url?: string | null
          next_followup_date?: string | null
          photos?: string[] | null
          referral_potential?: string | null
          referral_tags?: string[] | null
          region?: string | null
          relationship_notes?: string | null
          sale_price?: number | null
          secondary_salesperson?: string | null
          settlement_date?: string | null
          status?: string
          suburb?: string | null
          team_id?: string
          team_recommended_price?: number | null
          unconditional_date?: string | null
          updated_at?: string
          vendor_details?: Json | null
          vendor_expected_price?: number | null
          video_tour_url?: string | null
          won_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "past_sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "past_sales_lead_salesperson_fkey"
            columns: ["lead_salesperson"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "past_sales_secondary_salesperson_fkey"
            columns: ["secondary_salesperson"]
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
      past_sales_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          past_sale_id: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          past_sale_id: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          past_sale_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "past_sales_comments_past_sale_id_fkey"
            columns: ["past_sale_id"]
            isOneToOne: false
            referencedRelation: "past_sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "past_sales_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      past_sales_milestones: {
        Row: {
          created_at: string
          id: string
          milestone_date: string
          milestone_type: string
          notes: string | null
          past_sale_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          milestone_date: string
          milestone_type: string
          notes?: string | null
          past_sale_id: string
        }
        Update: {
          created_at?: string
          id?: string
          milestone_date?: string
          milestone_type?: string
          notes?: string | null
          past_sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "past_sales_milestones_past_sale_id_fkey"
            columns: ["past_sale_id"]
            isOneToOne: false
            referencedRelation: "past_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_agency_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          notes: string | null
          requested_agency_id: string
          status: string
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          requested_agency_id: string
          status?: string
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          requested_agency_id?: string
          status?: string
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_agency_requests_requested_agency_id_fkey"
            columns: ["requested_agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_agency_requests_team_id_fkey"
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
          created_at: string | null
          email: string
          expires_at: string
          full_name: string | null
          id: string
          idempotency_key: string | null
          invited_by: string
          office_id: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          status: string
          team_id: string | null
          token: string
          token_hash: string | null
          token_used_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at: string
          full_name?: string | null
          id?: string
          idempotency_key?: string | null
          invited_by: string
          office_id?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          status?: string
          team_id?: string | null
          token: string
          token_hash?: string | null
          token_used_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          full_name?: string | null
          id?: string
          idempotency_key?: string | null
          invited_by?: string
          office_id?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          status?: string
          team_id?: string | null
          token?: string
          token_hash?: string | null
          token_used_at?: string | null
        }
        Relationships: [
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
      pending_office_approvals: {
        Row: {
          id: string
          office_id: string
          processed_at: string | null
          processed_by: string | null
          requested_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          id?: string
          office_id: string
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          id?: string
          office_id?: string
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_office_approvals_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string | null
          id: string
          option_id: string
          poll_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          option_id: string
          poll_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          option_id?: string
          poll_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "message_polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pomodoro_sessions: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          duration_minutes: number
          id: string
          notes: string | null
          session_title: string | null
          session_type: string
          started_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          session_title?: string | null
          session_type?: string
          started_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          session_title?: string | null
          session_type?: string
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_comment_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_office_id: string | null
          active_role: string | null
          avatar_url: string | null
          bio: string | null
          birthday: string | null
          birthday_visibility: string | null
          created_at: string
          email: string
          employs: string[] | null
          full_name: string | null
          fy_start_month: number | null
          id: string
          invite_code: string | null
          invited_by: string | null
          is_active: boolean
          last_active_at: string | null
          last_login_at: string | null
          last_office_switch_at: string | null
          last_role_switch_at: string | null
          mobile_number: string | null
          module_layout: Json | null
          notify_on_impersonation: boolean | null
          office_id: string | null
          onboarding_completed: boolean | null
          password_set: boolean | null
          presence_status: string | null
          primary_team_id: string | null
          reports_to: string | null
          show_live_impersonation_banner: boolean | null
          social_preferences: Json | null
          status: string
          task_view_mode: string | null
          total_bug_points: number
          updated_at: string
          user_type: string | null
          uses_financial_year: boolean | null
        }
        Insert: {
          active_office_id?: string | null
          active_role?: string | null
          avatar_url?: string | null
          bio?: string | null
          birthday?: string | null
          birthday_visibility?: string | null
          created_at?: string
          email: string
          employs?: string[] | null
          full_name?: string | null
          fy_start_month?: number | null
          id: string
          invite_code?: string | null
          invited_by?: string | null
          is_active?: boolean
          last_active_at?: string | null
          last_login_at?: string | null
          last_office_switch_at?: string | null
          last_role_switch_at?: string | null
          mobile_number?: string | null
          module_layout?: Json | null
          notify_on_impersonation?: boolean | null
          office_id?: string | null
          onboarding_completed?: boolean | null
          password_set?: boolean | null
          presence_status?: string | null
          primary_team_id?: string | null
          reports_to?: string | null
          show_live_impersonation_banner?: boolean | null
          social_preferences?: Json | null
          status?: string
          task_view_mode?: string | null
          total_bug_points?: number
          updated_at?: string
          user_type?: string | null
          uses_financial_year?: boolean | null
        }
        Update: {
          active_office_id?: string | null
          active_role?: string | null
          avatar_url?: string | null
          bio?: string | null
          birthday?: string | null
          birthday_visibility?: string | null
          created_at?: string
          email?: string
          employs?: string[] | null
          full_name?: string | null
          fy_start_month?: number | null
          id?: string
          invite_code?: string | null
          invited_by?: string | null
          is_active?: boolean
          last_active_at?: string | null
          last_login_at?: string | null
          last_office_switch_at?: string | null
          last_role_switch_at?: string | null
          mobile_number?: string | null
          module_layout?: Json | null
          notify_on_impersonation?: boolean | null
          office_id?: string | null
          onboarding_completed?: boolean | null
          password_set?: boolean | null
          presence_status?: string | null
          primary_team_id?: string | null
          reports_to?: string | null
          show_live_impersonation_banner?: boolean | null
          social_preferences?: Json | null
          status?: string
          task_view_mode?: string | null
          total_bug_points?: number
          updated_at?: string
          user_type?: string | null
          uses_financial_year?: boolean | null
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
            foreignKeyName: "profiles_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_primary_team_id_fkey"
            columns: ["primary_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_reports_to_fkey"
            columns: ["reports_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_assignees: {
        Row: {
          created_at: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_assignees_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assignees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_templates: {
        Row: {
          agency_id: string | null
          created_at: string
          created_by: string
          default_assignee_role: string | null
          description: string | null
          id: string
          is_archived: boolean | null
          is_system_default: boolean
          lifecycle_stage: string
          name: string
          tasks: Json
          team_id: string | null
          template_version: number | null
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          created_by: string
          default_assignee_role?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean | null
          is_system_default?: boolean
          lifecycle_stage: string
          name: string
          tasks?: Json
          team_id?: string | null
          template_version?: number | null
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          created_by?: string
          default_assignee_role?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean | null
          is_system_default?: boolean
          lifecycle_stage?: string
          name?: string
          tasks?: Json
          team_id?: string | null
          template_version?: number | null
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_templates_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_templates_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          listing_id: string | null
          priority: string | null
          status: string
          team_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          listing_id?: string | null
          priority?: string | null
          status?: string
          team_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          listing_id?: string | null
          priority?: string | null
          status?: string
          team_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_pipeline"
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
      provider_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          provider_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          provider_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          provider_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_attachments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color: string
          created_at?: string
          icon: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      provider_reviews: {
        Row: {
          content: string
          created_at: string
          id: string
          is_usage_note: boolean
          parent_review_id: string | null
          provider_id: string
          sentiment: Database["public"]["Enums"]["review_sentiment"]
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_usage_note?: boolean
          parent_review_id?: string | null
          provider_id: string
          sentiment: Database["public"]["Enums"]["review_sentiment"]
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_usage_note?: boolean
          parent_review_id?: string | null
          provider_id?: string
          sentiment?: Database["public"]["Enums"]["review_sentiment"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_reviews_parent_review_id_fkey"
            columns: ["parent_review_id"]
            isOneToOne: false
            referencedRelation: "provider_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_reviews_user_id_profiles_fkey"
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
          created_by: string
          goal_type: string
          id: string
          kpi_type: string
          quarter: number
          target_value: number
          team_id: string
          updated_at: string | null
          user_id: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          created_by: string
          goal_type: string
          id?: string
          kpi_type: string
          quarter: number
          target_value: number
          team_id: string
          updated_at?: string | null
          user_id?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          created_by?: string
          goal_type?: string
          id?: string
          kpi_type?: string
          quarter?: number
          target_value?: number
          team_id?: string
          updated_at?: string | null
          user_id?: string | null
          year?: number
        }
        Relationships: [
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
          action_items: string | null
          challenges: string | null
          completed: boolean | null
          created_at: string | null
          created_by: string
          id: string
          lessons_learned: string | null
          performance_data: Json | null
          quarter: number
          review_type: string
          team_id: string
          updated_at: string | null
          user_id: string | null
          wins: string | null
          year: number
        }
        Insert: {
          action_items?: string | null
          challenges?: string | null
          completed?: boolean | null
          created_at?: string | null
          created_by: string
          id?: string
          lessons_learned?: string | null
          performance_data?: Json | null
          quarter: number
          review_type: string
          team_id: string
          updated_at?: string | null
          user_id?: string | null
          wins?: string | null
          year: number
        }
        Update: {
          action_items?: string | null
          challenges?: string | null
          completed?: boolean | null
          created_at?: string | null
          created_by?: string
          id?: string
          lessons_learned?: string | null
          performance_data?: Json | null
          quarter?: number
          review_type?: string
          team_id?: string
          updated_at?: string | null
          user_id?: string | null
          wins?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "quarterly_reviews_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          claimed_at: string | null
          created_at: string | null
          id: string
          referred_email: string
          referred_team_id: string | null
          referrer_team_id: string
          referrer_user_id: string
          reward_claimed: boolean | null
          reward_type: string | null
          reward_value: number | null
          status: string
          updated_at: string | null
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string | null
          id?: string
          referred_email: string
          referred_team_id?: string | null
          referrer_team_id: string
          referrer_user_id: string
          reward_claimed?: boolean | null
          reward_type?: string | null
          reward_value?: number | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          claimed_at?: string | null
          created_at?: string | null
          id?: string
          referred_email?: string
          referred_team_id?: string | null
          referrer_team_id?: string
          referrer_user_id?: string
          reward_claimed?: boolean | null
          reward_type?: string | null
          reward_value?: number | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_team_id_fkey"
            columns: ["referred_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_team_id_fkey"
            columns: ["referrer_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      roleplay_scenarios: {
        Row: {
          call_type: string
          created_at: string | null
          description: string
          difficulty: string
          id: string
          is_active: boolean | null
          objectives: Json | null
          scenario_name: string
          system_prompt: string
          type: string
          updated_at: string | null
        }
        Insert: {
          call_type: string
          created_at?: string | null
          description: string
          difficulty?: string
          id?: string
          is_active?: boolean | null
          objectives?: Json | null
          scenario_name: string
          system_prompt: string
          type: string
          updated_at?: string | null
        }
        Update: {
          call_type?: string
          created_at?: string | null
          description?: string
          difficulty?: string
          id?: string
          is_active?: boolean | null
          objectives?: Json | null
          scenario_name?: string
          system_prompt?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      roleplay_session_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          role: string
          session_id: string
          timestamp: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          role: string
          session_id: string
          timestamp?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          role?: string
          session_id?: string
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roleplay_session_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "roleplay_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      roleplay_sessions: {
        Row: {
          analysis: Json | null
          completed: boolean | null
          config: Json
          created_at: string | null
          duration_seconds: number | null
          id: string
          rating: number | null
          scenario_id: string | null
          team_id: string | null
          transcript: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          analysis?: Json | null
          completed?: boolean | null
          config?: Json
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          rating?: number | null
          scenario_id?: string | null
          team_id?: string | null
          transcript?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          analysis?: Json | null
          completed?: boolean | null
          config?: Json
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          rating?: number | null
          scenario_id?: string | null
          team_id?: string | null
          transcript?: Json | null
          updated_at?: string | null
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
            foreignKeyName: "roleplay_sessions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_inquiries: {
        Row: {
          assigned_to: string | null
          company_name: string
          created_at: string
          email: string
          follow_up_date: string | null
          full_name: string
          id: string
          inquiry_type: string
          notes: string | null
          phone: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          company_name: string
          created_at?: string
          email: string
          follow_up_date?: string | null
          full_name: string
          id?: string
          inquiry_type?: string
          notes?: string | null
          phone: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          company_name?: string
          created_at?: string
          email?: string
          follow_up_date?: string | null
          full_name?: string
          id?: string
          inquiry_type?: string
          notes?: string | null
          phone?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_providers: {
        Row: {
          avatar_url: string | null
          category_id: string | null
          company_name: string | null
          created_at: string
          created_by: string
          duplicate_of: string | null
          email: string | null
          flagged_at: string | null
          full_name: string
          id: string
          last_flag_cleared_at: string | null
          last_used_at: string | null
          logo_url: string | null
          needs_review: boolean | null
          negative_count: number
          neutral_count: number
          notes: string | null
          phone: string | null
          positive_count: number
          reviewed_at: string | null
          reviewed_by: string | null
          search_vector: unknown
          team_category_id: string | null
          team_id: string
          total_reviews: number
          updated_at: string
          visibility_level: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          category_id?: string | null
          company_name?: string | null
          created_at?: string
          created_by: string
          duplicate_of?: string | null
          email?: string | null
          flagged_at?: string | null
          full_name: string
          id?: string
          last_flag_cleared_at?: string | null
          last_used_at?: string | null
          logo_url?: string | null
          needs_review?: boolean | null
          negative_count?: number
          neutral_count?: number
          notes?: string | null
          phone?: string | null
          positive_count?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          search_vector?: unknown
          team_category_id?: string | null
          team_id: string
          total_reviews?: number
          updated_at?: string
          visibility_level?: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          category_id?: string | null
          company_name?: string | null
          created_at?: string
          created_by?: string
          duplicate_of?: string | null
          email?: string | null
          flagged_at?: string | null
          full_name?: string
          id?: string
          last_flag_cleared_at?: string | null
          last_used_at?: string | null
          logo_url?: string | null
          needs_review?: boolean | null
          negative_count?: number
          neutral_count?: number
          notes?: string | null
          phone?: string | null
          positive_count?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          search_vector?: unknown
          team_category_id?: string | null
          team_id?: string
          total_reviews?: number
          updated_at?: string
          visibility_level?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_providers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "provider_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_providers_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_providers_team_category_id_fkey"
            columns: ["team_category_id"]
            isOneToOne: false
            referencedRelation: "team_provider_categories"
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
      social_posts: {
        Row: {
          content: string
          created_at: string
          id: string
          images: string[] | null
          is_pinned: boolean
          metadata: Json | null
          mood: string | null
          post_type: string
          reflection_data: Json | null
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          images?: string[] | null
          is_pinned?: boolean
          metadata?: Json | null
          mood?: string | null
          post_type: string
          reflection_data?: Json | null
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          images?: string[] | null
          is_pinned?: boolean
          metadata?: Json | null
          mood?: string | null
          post_type?: string
          reflection_data?: Json | null
          updated_at?: string
          user_id?: string
          visibility?: string
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
      subscription_plans: {
        Row: {
          admin_seats_free: boolean | null
          ai_credits_monthly: number | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price_annual: number | null
          price_monthly: number | null
          price_nzd: number | null
          price_usd: number | null
          team_seat_limit: number | null
          updated_at: string
          va_discount_percent: number | null
        }
        Insert: {
          admin_seats_free?: boolean | null
          ai_credits_monthly?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price_annual?: number | null
          price_monthly?: number | null
          price_nzd?: number | null
          price_usd?: number | null
          team_seat_limit?: number | null
          updated_at?: string
          va_discount_percent?: number | null
        }
        Update: {
          admin_seats_free?: boolean | null
          ai_credits_monthly?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price_annual?: number | null
          price_monthly?: number | null
          price_nzd?: number | null
          price_usd?: number | null
          team_seat_limit?: number | null
          updated_at?: string
          va_discount_percent?: number | null
        }
        Relationships: []
      }
      system_error_log: {
        Row: {
          context: Json | null
          created_at: string | null
          error_message: string
          error_type: string
          id: string
          resolved: boolean | null
          stack_trace: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          error_message: string
          error_type: string
          id?: string
          resolved?: boolean | null
          stack_trace?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          error_message?: string
          error_type?: string
          id?: string
          resolved?: boolean | null
          stack_trace?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      system_health_metrics: {
        Row: {
          id: string
          metric_type: string
          metric_value: Json
          recorded_at: string | null
        }
        Insert: {
          id?: string
          metric_type: string
          metric_value: Json
          recorded_at?: string | null
        }
        Update: {
          id?: string
          metric_type?: string
          metric_value?: Json
          recorded_at?: string | null
        }
        Relationships: []
      }
      tag_library: {
        Row: {
          category: string | null
          color: string
          created_at: string
          created_by: string | null
          icon: string | null
          id: string
          name: string
          team_id: string
          usage_count: number
        }
        Insert: {
          category?: string | null
          color?: string
          created_at?: string
          created_by?: string | null
          icon?: string | null
          id?: string
          name: string
          team_id: string
          usage_count?: number
        }
        Update: {
          category?: string | null
          color?: string
          created_at?: string
          created_by?: string | null
          icon?: string | null
          id?: string
          name?: string
          team_id?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "tag_library_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tag_library_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      task_activity: {
        Row: {
          activity_type: string
          created_at: string | null
          id: string
          metadata: Json | null
          task_id: string
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          task_id: string
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          task_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_activity_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "enriched_tasks_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_activity_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_activity_v2: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          metadata: Json | null
          task_id: string
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          task_id: string
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          task_id?: string
          user_id?: string | null
        }
        Relationships: []
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
            referencedRelation: "enriched_tasks_view"
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
      task_assignment_notifications: {
        Row: {
          assigned_by: string | null
          assigned_to: string
          created_at: string
          dismissed: boolean
          id: string
          read: boolean
          task_id: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_to: string
          created_at?: string
          dismissed?: boolean
          id?: string
          read?: boolean
          task_id: string
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string
          created_at?: string
          dismissed?: boolean
          id?: string
          read?: boolean
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignment_notifications_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignment_notifications_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignment_notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "enriched_tasks_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignment_notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
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
          file_type: string
          id: string
          task_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          task_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          task_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "enriched_tasks_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_boards: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string
          description: string | null
          icon: string | null
          id: string
          is_personal_admin_board: boolean | null
          is_shared: boolean | null
          order_position: number | null
          owner_role: string | null
          team_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          icon?: string | null
          id?: string
          is_personal_admin_board?: boolean | null
          is_shared?: boolean | null
          order_position?: number | null
          owner_role?: string | null
          team_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_personal_admin_board?: boolean | null
          is_shared?: boolean | null
          order_position?: number | null
          owner_role?: string | null
          team_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_boards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_boards_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          content: string
          created_at: string | null
          edited: boolean | null
          id: string
          task_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          edited?: boolean | null
          id?: string
          task_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          edited?: boolean | null
          id?: string
          task_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "enriched_tasks_view"
            referencedColumns: ["id"]
          },
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
          board_id: string
          color: string
          created_at: string
          created_by: string
          description: string | null
          icon: string
          id: string
          is_shared: boolean
          order_position: number
          team_id: string
          title: string
          updated_at: string
        }
        Insert: {
          board_id: string
          color?: string
          created_at?: string
          created_by: string
          description?: string | null
          icon?: string
          id?: string
          is_shared?: boolean
          order_position?: number
          team_id: string
          title: string
          updated_at?: string
        }
        Update: {
          board_id?: string
          color?: string
          created_at?: string
          created_by?: string
          description?: string | null
          icon?: string
          id?: string
          is_shared?: boolean
          order_position?: number
          team_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_lists_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "task_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_lists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      task_tag_assignments: {
        Row: {
          created_at: string
          id: string
          tag_id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tag_id: string
          task_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tag_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "task_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_tag_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "enriched_tasks_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_tag_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_tags: {
        Row: {
          color: string
          created_at: string
          created_by: string
          id: string
          name: string
          team_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by: string
          id?: string
          name: string
          team_id: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_tags_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          board_position: number | null
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          daily_position: number | null
          description: string | null
          due_date: string | null
          estimated_duration_minutes: number | null
          id: string
          is_important: boolean | null
          is_urgent: boolean | null
          last_updated_by: string | null
          list_id: string | null
          listing_id: string | null
          order_position: number | null
          parent_task_id: string | null
          priority: string | null
          project_id: string | null
          scheduled_date: string | null
          section: string | null
          size_category: string | null
          team_id: string
          title: string
          transaction_id: string | null
          transaction_stage: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          board_position?: number | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_position?: number | null
          description?: string | null
          due_date?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_important?: boolean | null
          is_urgent?: boolean | null
          last_updated_by?: string | null
          list_id?: string | null
          listing_id?: string | null
          order_position?: number | null
          parent_task_id?: string | null
          priority?: string | null
          project_id?: string | null
          scheduled_date?: string | null
          section?: string | null
          size_category?: string | null
          team_id: string
          title: string
          transaction_id?: string | null
          transaction_stage?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          board_position?: number | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_position?: number | null
          description?: string | null
          due_date?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_important?: boolean | null
          is_urgent?: boolean | null
          last_updated_by?: string | null
          list_id?: string | null
          listing_id?: string | null
          order_position?: number | null
          parent_task_id?: string | null
          priority?: string | null
          project_id?: string | null
          scheduled_date?: string | null
          section?: string | null
          size_category?: string | null
          team_id?: string
          title?: string
          transaction_id?: string | null
          transaction_stage?: string | null
          updated_at?: string | null
        }
        Relationships: [
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
            referencedRelation: "enriched_tasks_view"
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
            foreignKeyName: "tasks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_goals: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          target_cch: number
          team_id: string
          week_start_date: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          target_cch: number
          team_id: string
          week_start_date: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          target_cch?: number
          team_id?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_goals_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_member_kpis: {
        Row: {
          created_at: string
          id: string
          kpi_type: Database["public"]["Enums"]["kpi_type"]
          team_member_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kpi_type: Database["public"]["Enums"]["kpi_type"]
          team_member_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kpi_type?: Database["public"]["Enums"]["kpi_type"]
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_member_kpis_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          access_level: Database["public"]["Enums"]["access_level"]
          contributes_to_kpis: boolean
          created_at: string
          id: string
          joined_at: string | null
          member_type: string | null
          position: string | null
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_level?: Database["public"]["Enums"]["access_level"]
          contributes_to_kpis?: boolean
          created_at?: string
          id?: string
          joined_at?: string | null
          member_type?: string | null
          position?: string | null
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_level?: Database["public"]["Enums"]["access_level"]
          contributes_to_kpis?: boolean
          created_at?: string
          id?: string
          joined_at?: string | null
          member_type?: string | null
          position?: string | null
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_team_members_team_id"
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
      team_provider_categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          is_active: boolean
          name: string
          team_id: string
          updated_at: string
        }
        Insert: {
          color: string
          created_at?: string
          icon: string
          id?: string
          is_active?: boolean
          name: string
          team_id: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_provider_categories_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          agency_id: string | null
          bio: string | null
          created_at: string
          created_by: string
          financial_year_start_month: number | null
          id: string
          is_archived: boolean
          is_auto_created: boolean | null
          is_personal_team: boolean
          logo_url: string | null
          meeting_generation_day: string | null
          meeting_generation_enabled: boolean | null
          meeting_generation_time: string | null
          meeting_generation_tone: string | null
          name: string
          team_code: string
          team_type: string | null
          updated_at: string
          uses_financial_year: boolean | null
        }
        Insert: {
          agency_id?: string | null
          bio?: string | null
          created_at?: string
          created_by: string
          financial_year_start_month?: number | null
          id?: string
          is_archived?: boolean
          is_auto_created?: boolean | null
          is_personal_team?: boolean
          logo_url?: string | null
          meeting_generation_day?: string | null
          meeting_generation_enabled?: boolean | null
          meeting_generation_time?: string | null
          meeting_generation_tone?: string | null
          name?: string
          team_code: string
          team_type?: string | null
          updated_at?: string
          uses_financial_year?: boolean | null
        }
        Update: {
          agency_id?: string | null
          bio?: string | null
          created_at?: string
          created_by?: string
          financial_year_start_month?: number | null
          id?: string
          is_archived?: boolean
          is_auto_created?: boolean | null
          is_personal_team?: boolean
          logo_url?: string | null
          meeting_generation_day?: string | null
          meeting_generation_enabled?: boolean | null
          meeting_generation_time?: string | null
          meeting_generation_tone?: string | null
          name?: string
          team_code?: string
          team_type?: string | null
          updated_at?: string
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
            foreignKeyName: "teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      template_assignments: {
        Row: {
          assigned_by: string
          assigned_to_id: string
          assigned_to_type: string
          created_at: string
          id: string
          template_id: string
        }
        Insert: {
          assigned_by: string
          assigned_to_id: string
          assigned_to_type: string
          created_at?: string
          id?: string
          template_id: string
        }
        Update: {
          assigned_by?: string
          assigned_to_id?: string
          assigned_to_type?: string
          created_at?: string
          id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_assignments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_usage_log: {
        Row: {
          created_at: string
          created_by: string
          id: string
          listing_id: string | null
          project_id: string
          template_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          listing_id?: string | null
          project_id: string
          template_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          listing_id?: string | null
          project_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_usage_log_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_usage_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_usage_log_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_documents: {
        Row: {
          created_at: string
          created_by: string | null
          file_url: string | null
          id: string
          order_index: number
          required: boolean
          section: string
          stage: string
          title: string
          transaction_id: string
          updated_at: string
          uploaded: boolean
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          file_url?: string | null
          id?: string
          order_index?: number
          required?: boolean
          section: string
          stage: string
          title: string
          transaction_id: string
          updated_at?: string
          uploaded?: boolean
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          file_url?: string | null
          id?: string
          order_index?: number
          required?: boolean
          section?: string
          stage?: string
          title?: string
          transaction_id?: string
          updated_at?: string
          uploaded?: boolean
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: []
      }
      transaction_notes: {
        Row: {
          author_id: string
          body: string
          created_at: string | null
          id: string
          reactions: Json | null
          transaction_id: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string | null
          id?: string
          reactions?: Json | null
          transaction_id: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string | null
          id?: string
          reactions?: Json | null
          transaction_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_notes_transaction_id_fkey"
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
          documents: Json
          id: string
          is_default: boolean
          is_system_template: boolean
          name: string
          office_id: string | null
          stage: string
          tasks: Json
          team_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          documents?: Json
          id?: string
          is_default?: boolean
          is_system_template?: boolean
          name: string
          office_id?: string | null
          stage: string
          tasks?: Json
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          documents?: Json
          id?: string
          is_default?: boolean
          is_system_template?: boolean
          name?: string
          office_id?: string | null
          stage?: string
          tasks?: Json
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_stage_templates_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "agencies"
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
          archived: boolean | null
          assignees: Json | null
          attachments: Json | null
          auction_deadline_date: string | null
          building_report_date: string | null
          buyer_names: Json | null
          campaign_type: string | null
          client_email: string | null
          client_name: string
          client_phone: string | null
          conditional_date: string | null
          contract_date: string | null
          created_at: string
          created_by: string
          deal_history: Json | null
          docs_done: number | null
          docs_total: number | null
          expected_settlement: string | null
          geocode_error: string | null
          geocoded_at: string | null
          id: string
          last_edited_by: string
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
          photoshoot_date: string | null
          pre_settlement_inspection_date: string | null
          price_alignment_status: string | null
          sale_price: number | null
          settlement_date: string | null
          stage: string
          suburb: string | null
          tasks_done: number | null
          tasks_total: number | null
          team_id: string
          team_price: number | null
          unconditional_date: string | null
          updated_at: string
          vendor_email: string | null
          vendor_names: Json | null
          vendor_phone: string | null
          vendor_price: number | null
          warmth: string | null
        }
        Insert: {
          address: string
          archived?: boolean | null
          assignees?: Json | null
          attachments?: Json | null
          auction_deadline_date?: string | null
          building_report_date?: string | null
          buyer_names?: Json | null
          campaign_type?: string | null
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          conditional_date?: string | null
          contract_date?: string | null
          created_at?: string
          created_by: string
          deal_history?: Json | null
          docs_done?: number | null
          docs_total?: number | null
          expected_settlement?: string | null
          geocode_error?: string | null
          geocoded_at?: string | null
          id?: string
          last_edited_by: string
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
          photoshoot_date?: string | null
          pre_settlement_inspection_date?: string | null
          price_alignment_status?: string | null
          sale_price?: number | null
          settlement_date?: string | null
          stage?: string
          suburb?: string | null
          tasks_done?: number | null
          tasks_total?: number | null
          team_id: string
          team_price?: number | null
          unconditional_date?: string | null
          updated_at?: string
          vendor_email?: string | null
          vendor_names?: Json | null
          vendor_phone?: string | null
          vendor_price?: number | null
          warmth?: string | null
        }
        Update: {
          address?: string
          archived?: boolean | null
          assignees?: Json | null
          attachments?: Json | null
          auction_deadline_date?: string | null
          building_report_date?: string | null
          buyer_names?: Json | null
          campaign_type?: string | null
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          conditional_date?: string | null
          contract_date?: string | null
          created_at?: string
          created_by?: string
          deal_history?: Json | null
          docs_done?: number | null
          docs_total?: number | null
          expected_settlement?: string | null
          geocode_error?: string | null
          geocoded_at?: string | null
          id?: string
          last_edited_by?: string
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
          photoshoot_date?: string | null
          pre_settlement_inspection_date?: string | null
          price_alignment_status?: string | null
          sale_price?: number | null
          settlement_date?: string | null
          stage?: string
          suburb?: string | null
          tasks_done?: number | null
          tasks_total?: number | null
          team_id?: string
          team_price?: number | null
          unconditional_date?: string | null
          updated_at?: string
          vendor_email?: string | null
          vendor_names?: Json | null
          vendor_phone?: string | null
          vendor_price?: number | null
          warmth?: string | null
        }
        Relationships: []
      }
      user_activity_log: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          metadata: Json | null
          module_name: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          module_name?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          module_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ai_credits: {
        Row: {
          created_at: string | null
          credits_remaining: number
          credits_used: number
          id: string
          monthly_allowance: number
          resets_at: string
          team_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          credits_remaining?: number
          credits_used?: number
          id?: string
          monthly_allowance?: number
          resets_at: string
          team_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          credits_remaining?: number
          credits_used?: number
          id?: string
          monthly_allowance?: number
          resets_at?: string
          team_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_ai_credits_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_bug_points: {
        Row: {
          awarded_at: string
          awarded_by: string | null
          bug_report_id: string | null
          created_at: string
          id: string
          points_awarded: number
          points_reason: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          awarded_by?: string | null
          bug_report_id?: string | null
          created_at?: string
          id?: string
          points_awarded: number
          points_reason: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          awarded_by?: string | null
          bug_report_id?: string | null
          created_at?: string
          id?: string
          points_awarded?: number
          points_reason?: string
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
        ]
      }
      user_discount_codes: {
        Row: {
          code: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          code: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          code?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_discount_codes_code_fkey"
            columns: ["code"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["code"]
          },
        ]
      }
      user_preferences: {
        Row: {
          collapsed_hub_digest: boolean | null
          collapsed_hub_messages: boolean | null
          collapsed_hub_performance: boolean | null
          collapsed_hub_tasks: boolean | null
          created_at: string
          dashboard_edit_mode: boolean | null
          default_home_view: string | null
          default_transaction_role_admin: string | null
          default_transaction_role_salesperson: string | null
          expanded_module_sections: Json | null
          leaderboard_participation: boolean | null
          module_visibility: Json | null
          notify_conversation_share: boolean | null
          notify_email: boolean | null
          notify_friend_checkin: boolean | null
          pipeline_view_preference: string
          profile_visibility: string | null
          quick_actions_visible: boolean | null
          show_daily_digest: boolean | null
          stats_visibility: string | null
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          collapsed_hub_digest?: boolean | null
          collapsed_hub_messages?: boolean | null
          collapsed_hub_performance?: boolean | null
          collapsed_hub_tasks?: boolean | null
          created_at?: string
          dashboard_edit_mode?: boolean | null
          default_home_view?: string | null
          default_transaction_role_admin?: string | null
          default_transaction_role_salesperson?: string | null
          expanded_module_sections?: Json | null
          leaderboard_participation?: boolean | null
          module_visibility?: Json | null
          notify_conversation_share?: boolean | null
          notify_email?: boolean | null
          notify_friend_checkin?: boolean | null
          pipeline_view_preference?: string
          profile_visibility?: string | null
          quick_actions_visible?: boolean | null
          show_daily_digest?: boolean | null
          stats_visibility?: string | null
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          collapsed_hub_digest?: boolean | null
          collapsed_hub_messages?: boolean | null
          collapsed_hub_performance?: boolean | null
          collapsed_hub_tasks?: boolean | null
          created_at?: string
          dashboard_edit_mode?: boolean | null
          default_home_view?: string | null
          default_transaction_role_admin?: string | null
          default_transaction_role_salesperson?: string | null
          expanded_module_sections?: Json | null
          leaderboard_participation?: boolean | null
          module_visibility?: Json | null
          notify_conversation_share?: boolean | null
          notify_email?: boolean | null
          notify_friend_checkin?: boolean | null
          pipeline_view_preference?: string
          profile_visibility?: string | null
          quick_actions_visible?: boolean | null
          show_daily_digest?: boolean | null
          stats_visibility?: string | null
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_default_transaction_role_admin_fkey"
            columns: ["default_transaction_role_admin"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_preferences_default_transaction_role_salesperson_fkey"
            columns: ["default_transaction_role_salesperson"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          revoked_at: string | null
          revoked_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_assigned_by_fkey"
            columns: ["assigned_by"]
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
        ]
      }
      user_subscription_plans: {
        Row: {
          created_at: string
          id: string
          module_id: string
          plan_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          module_id: string
          plan_id: string
        }
        Update: {
          created_at?: string
          id?: string
          module_id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscription_plans_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          plan_id: string
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          plan_id: string
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          plan_id?: string
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_reports: {
        Row: {
          buyer_feedback: string
          campaign_week: number
          created_at: string
          created_by: string
          desired_outcome: string
          generated_report: Json
          id: string
          property_address: string
          team_id: string | null
          transaction_id: string | null
          updated_at: string
          vendor_name: string | null
        }
        Insert: {
          buyer_feedback: string
          campaign_week: number
          created_at?: string
          created_by: string
          desired_outcome: string
          generated_report: Json
          id?: string
          property_address: string
          team_id?: string | null
          transaction_id?: string | null
          updated_at?: string
          vendor_name?: string | null
        }
        Update: {
          buyer_feedback?: string
          campaign_week?: number
          created_at?: string
          created_by?: string
          desired_outcome?: string
          generated_report?: Json
          id?: string
          property_address?: string
          team_id?: string | null
          transaction_id?: string | null
          updated_at?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_reports_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_reports_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_reflection_prompts: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          post_id: string | null
          prompt_date: string
          prompt_sent_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          prompt_date: string
          prompt_sent_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          prompt_date?: string
          prompt_sent_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_reflection_prompts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_reflection_prompts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      enriched_tasks_view: {
        Row: {
          assigned_to: string | null
          assignees: Json | null
          board_position: number | null
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          creator: Json | null
          daily_position: number | null
          description: string | null
          due_date: string | null
          estimated_duration_minutes: number | null
          id: string | null
          is_important: boolean | null
          is_urgent: boolean | null
          last_updated_by: string | null
          list_id: string | null
          listing_id: string | null
          order_position: number | null
          parent_task_id: string | null
          priority: string | null
          project_id: string | null
          scheduled_date: string | null
          section: string | null
          size_category: string | null
          tags: Json | null
          team_id: string | null
          title: string | null
          transaction_id: string | null
          transaction_stage: string | null
          updated_at: string | null
        }
        Relationships: [
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
            referencedRelation: "enriched_tasks_view"
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
            foreignKeyName: "tasks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_aggregates: {
        Row: {
          entry_date: string | null
          kpi_type: Database["public"]["Enums"]["kpi_type"] | null
          last_week_value: number | null
          today_value: number | null
          total_value: number | null
          user_id: string | null
          week_value: number | null
          yesterday_value: number | null
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
      user_conversations_summary: {
        Row: {
          archived: boolean | null
          can_post: boolean | null
          channel_type: string | null
          conversation_id: string | null
          created_by: string | null
          description: string | null
          icon: string | null
          is_admin: boolean | null
          is_system_channel: boolean | null
          last_message: Json | null
          last_message_at: string | null
          last_read_at: string | null
          muted: boolean | null
          participants: Json | null
          title: string | null
          type: string | null
          unread_count: number | null
          user_id: string | null
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
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_effective_access_new: {
        Row: {
          effective_policy: string | null
          expires_at: string | null
          module_id: string | null
          policy_source: string | null
          reason: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      archive_inactive_user_data: { Args: never; Returns: undefined }
      archive_old_invitations: { Args: never; Returns: undefined }
      auto_archive_old_items: { Args: never; Returns: undefined }
      auto_repair_team_assignments: {
        Args: never
        Returns: {
          repair_log: Json
          repaired_count: number
        }[]
      }
      award_bug_points: {
        Args: {
          p_awarded_by?: string
          p_bug_report_id: string
          p_points: number
          p_reason: string
          p_user_id: string
        }
        Returns: string
      }
      calculate_subtask_progress: {
        Args: { p_parent_task_id: string }
        Returns: {
          completed: number
          percentage: number
          total: number
        }[]
      }
      check_backend_health:
        | {
            Args: never
            Returns: {
              check_name: string
              details: Json
              issue_count: number
              severity: string
            }[]
          }
        | {
            Args: { p_office_id?: string }
            Returns: {
              check_name: string
              details: Json
              issue_count: number
              severity: string
            }[]
          }
      check_data_health: {
        Args: never
        Returns: {
          check_name: string
          details: Json
          issue_count: number
          severity: string
        }[]
      }
      check_invitation_rate_limit: { Args: { _user_id: string }; Returns: Json }
      check_password_reset_rate_limit: {
        Args: { p_email: string }
        Returns: Json
      }
      check_provider_review_threshold: {
        Args: { p_provider_id: string }
        Returns: boolean
      }
      compute_effective_access: {
        Args: { _module_id: string; _user_id: string }
        Returns: Record<string, unknown>
      }
      compute_team_access_level: {
        Args: { _team_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["access_level"]
      }
      create_default_lists_for_team: {
        Args: { p_team_id: string; p_user_id: string }
        Returns: undefined
      }
      create_default_personal_board: {
        Args: { _team_id: string; _user_id: string }
        Returns: string
      }
      create_office_channel: { Args: { p_agency_id: string }; Returns: string }
      create_quarterly_review_notification: {
        Args: { _team_id: string; _user_id: string }
        Returns: undefined
      }
      create_team_channel: {
        Args: {
          channel_icon?: string
          channel_title: string
          channel_type: string
        }
        Returns: string
      }
      delete_expired_notifications: { Args: never; Returns: undefined }
      delete_old_coaching_conversations: { Args: never; Returns: undefined }
      delete_old_listing_descriptions: { Args: never; Returns: undefined }
      delete_old_vendor_reports: { Args: never; Returns: undefined }
      detect_team_assignment_issues: {
        Args: never
        Returns: {
          description: string
          issue_type: string
          primary_team_id: string
          team_name: string
          user_email: string
          user_id: string
        }[]
      }
      detect_users_without_roles: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          office_id: string
          user_id: string
        }[]
      }
      ensure_admin_task_board: {
        Args: { p_role: string; p_user_id: string }
        Returns: string
      }
      ensure_personal_team: {
        Args: {
          office_id_param: string
          user_full_name: string
          user_id_param: string
        }
        Returns: string
      }
      expire_old_invitations: { Args: never; Returns: undefined }
      generate_recurring_tasks_for_date: {
        Args: { p_target_date: string; p_team_id: string }
        Returns: number
      }
      generate_team_code: { Args: never; Returns: string }
      get_cross_office_assignments: {
        Args: never
        Returns: {
          team_id: string
          team_name: string
          team_office_id: string
          team_office_name: string
          user_id: string
          user_name: string
          user_office_id: string
          user_office_name: string
        }[]
      }
      get_or_create_conversation: {
        Args: { other_user_id: string }
        Returns: {
          created_at: string
          id: string
          title: string
          type: string
        }[]
      }
      get_or_create_direct_conversation:
        | { Args: { other_user_id: string }; Returns: string }
        | { Args: { user1_id: string; user2_id: string }; Returns: string }
      get_orphaned_team_members: {
        Args: never
        Returns: {
          issue: string
          team_id: string
          team_name: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      get_platform_offices_stats: {
        Args: never
        Returns: {
          active_users: number
          assistant_count: number
          id: string
          logo_url: string
          name: string
          salesperson_count: number
          team_leader_count: number
          total_teams: number
          total_users: number
        }[]
      }
      get_team_quarter: {
        Args: { _date?: string; _team_id: string }
        Returns: {
          is_financial: boolean
          quarter: number
          year: number
        }[]
      }
      get_user_team_id: { Args: { _user_id: string }; Returns: string }
      get_user_team_ids: {
        Args: { _user_id: string }
        Returns: {
          team_id: string
        }[]
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_module_visit: {
        Args: { p_module_id: string; p_user_id: string }
        Returns: undefined
      }
      is_conversation_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_team_admin: {
        Args: { team_id: string; user_id: string }
        Returns: boolean
      }
      is_team_member: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      lookup_profile_by_invite_code: {
        Args: { code: string }
        Returns: {
          email: string
          full_name: string
          user_id: string
        }[]
      }
      needs_quarterly_review: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      notify_office_managers_of_flagged_provider: {
        Args: { p_provider_id: string }
        Returns: undefined
      }
      notify_on_account_created: {
        Args: { p_office_id: string; p_team_id: string; p_user_id: string }
        Returns: undefined
      }
      record_health_metric: {
        Args: { p_metric_type: string; p_metric_value: Json }
        Returns: undefined
      }
      refresh_conversations_summary: { Args: never; Returns: undefined }
      refresh_kpi_aggregates: { Args: never; Returns: undefined }
      regenerate_team_code: { Args: { p_team_id: string }; Returns: string }
      remap_quarterly_data: { Args: { _team_id: string }; Returns: undefined }
      remove_channel_participant: {
        Args: { channel_id: string; participant_id: string }
        Returns: undefined
      }
      run_daily_data_health_check: { Args: never; Returns: undefined }
      set_active_role: {
        Args: { _role: string; _user_id: string }
        Returns: boolean
      }
      should_send_notification: {
        Args: { p_notification_type: string; p_user_id: string }
        Returns: boolean
      }
      validate_team_code: {
        Args: { code: string }
        Returns: {
          agency_id: string
          team_id: string
          team_name: string
        }[]
      }
      vote_on_poll: {
        Args: { p_option_id: string; p_poll_id: string }
        Returns: undefined
      }
    }
    Enums: {
      access_level: "view" | "edit" | "admin"
      app_role:
        | "admin"
        | "member"
        | "platform_admin"
        | "office_manager"
        | "team_leader"
        | "salesperson"
        | "assistant"
      goal_type: "individual" | "team"
      kpi_type:
        | "calls"
        | "sms"
        | "appraisals"
        | "open_homes"
        | "listings"
        | "sales"
      listing_warmth: "cold" | "warm" | "hot"
      log_period: "daily" | "weekly"
      review_sentiment: "positive" | "neutral" | "negative"
      task_priority: "low" | "medium" | "high"
      task_status: "todo" | "in_progress" | "done"
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
      access_level: ["view", "edit", "admin"],
      app_role: [
        "admin",
        "member",
        "platform_admin",
        "office_manager",
        "team_leader",
        "salesperson",
        "assistant",
      ],
      goal_type: ["individual", "team"],
      kpi_type: [
        "calls",
        "sms",
        "appraisals",
        "open_homes",
        "listings",
        "sales",
      ],
      listing_warmth: ["cold", "warm", "hot"],
      log_period: ["daily", "weekly"],
      review_sentiment: ["positive", "neutral", "negative"],
      task_priority: ["low", "medium", "high"],
      task_status: ["todo", "in_progress", "done"],
    },
  },
} as const
