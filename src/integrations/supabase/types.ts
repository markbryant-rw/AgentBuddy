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
        Relationships: []
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
      profiles: {
        Row: {
          active_office_id: string | null
          active_role: string | null
          avatar_url: string | null
          birthday: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          invite_code: string | null
          last_role_switch_at: string | null
          mobile: string | null
          office_id: string | null
          primary_team_id: string | null
          status: string | null
          total_bug_points: number | null
          updated_at: string | null
        }
        Insert: {
          active_office_id?: string | null
          active_role?: string | null
          avatar_url?: string | null
          birthday?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          invite_code?: string | null
          last_role_switch_at?: string | null
          mobile?: string | null
          office_id?: string | null
          primary_team_id?: string | null
          status?: string | null
          total_bug_points?: number | null
          updated_at?: string | null
        }
        Update: {
          active_office_id?: string | null
          active_role?: string | null
          avatar_url?: string | null
          birthday?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          invite_code?: string | null
          last_role_switch_at?: string | null
          mobile?: string | null
          office_id?: string | null
          primary_team_id?: string | null
          status?: string | null
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
      team_members: {
        Row: {
          access_level: Database["public"]["Enums"]["access_level"]
          id: string
          joined_at: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          access_level?: Database["public"]["Enums"]["access_level"]
          id?: string
          joined_at?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          access_level?: Database["public"]["Enums"]["access_level"]
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
          created_at: string | null
          description: string | null
          id: string
          is_archived: boolean | null
          is_personal_team: boolean | null
          name: string
          team_code: string | null
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean | null
          is_personal_team?: boolean | null
          name: string
          team_code?: string | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean | null
          is_personal_team?: boolean | null
          name?: string
          team_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_agency_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      access_level: "admin" | "view"
      app_role:
        | "platform_admin"
        | "office_manager"
        | "team_leader"
        | "salesperson"
        | "assistant"
      goal_type: "individual" | "team"
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
      access_level: ["admin", "view"],
      app_role: [
        "platform_admin",
        "office_manager",
        "team_leader",
        "salesperson",
        "assistant",
      ],
      goal_type: ["individual", "team"],
      kpi_type: ["calls", "appraisals", "listings_won", "settlement_volume"],
      listing_warmth: ["cold", "warm", "hot"],
      log_period: ["daily", "weekly", "monthly", "quarterly", "annual"],
    },
  },
} as const
