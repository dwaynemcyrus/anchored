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
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      documents: {
        Row: {
          body_md: string | null
          content_type: string
          created_at: string | null
          id: string
          metadata: Json | null
          order: number | null
          published_at: string | null
          slug: string
          status: string
          summary: string | null
          title: string
          updated_at: string | null
          user_id: string
          visibility: string
        }
        Insert: {
          body_md?: string | null
          content_type: string
          created_at?: string | null
          id: string
          metadata?: Json | null
          order?: number | null
          published_at?: string | null
          slug: string
          status?: string
          summary?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          visibility?: string
        }
        Update: {
          body_md?: string | null
          content_type?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          order?: number | null
          published_at?: string | null
          slug?: string
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
      habit_days: {
        Row: {
          habit_id: string
          id: string
          local_date: string
          note: string | null
          owner_id: string
          status: string
          updated_at: string
        }
        Insert: {
          habit_id: string
          id?: string
          local_date: string
          note?: string | null
          owner_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          habit_id?: string
          id?: string
          local_date?: string
          note?: string | null
          owner_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_days_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_entries: {
        Row: {
          completed: boolean
          created_at: string | null
          entry_date: string
          habit_id: string
          id: string
          owner_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string | null
          entry_date: string
          habit_id: string
          id?: string
          owner_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string | null
          entry_date?: string
          habit_id?: string
          id?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_entries_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_periods: {
        Row: {
          habit_id: string
          id: string
          local_period_end: string
          local_period_start: string
          owner_id: string
          status: string
          total_used: number
          updated_at: string
        }
        Insert: {
          habit_id: string
          id?: string
          local_period_end: string
          local_period_start: string
          owner_id: string
          status?: string
          total_used?: number
          updated_at?: string
        }
        Update: {
          habit_id?: string
          id?: string
          local_period_end?: string
          local_period_start?: string
          owner_id?: string
          status?: string
          total_used?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_periods_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_slips: {
        Row: {
          created_at: string
          habit_id: string
          id: string
          local_date: string
          note: string | null
          occurred_at: string
          owner_id: string
          severity: number | null
        }
        Insert: {
          created_at?: string
          habit_id: string
          id?: string
          local_date: string
          note?: string | null
          occurred_at?: string
          owner_id: string
          severity?: number | null
        }
        Update: {
          created_at?: string
          habit_id?: string
          id?: string
          local_date?: string
          note?: string | null
          occurred_at?: string
          owner_id?: string
          severity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "habit_slips_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_usage_events: {
        Row: {
          amount: number
          created_at: string
          habit_id: string
          id: string
          local_period_end: string
          local_period_start: string
          note: string | null
          occurred_at: string
          owner_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          habit_id: string
          id?: string
          local_period_end: string
          local_period_start: string
          note?: string | null
          occurred_at?: string
          owner_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          habit_id?: string
          id?: string
          local_period_end?: string
          local_period_start?: string
          note?: string | null
          occurred_at?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_usage_events_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          active: boolean | null
          allow_soft_over: boolean
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          near_threshold_percent: number
          owner_id: string
          quota_amount: number | null
          quota_period: string | null
          quota_unit: string | null
          sort_order: number | null
          timezone: string
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          allow_soft_over?: boolean
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          near_threshold_percent?: number
          owner_id: string
          quota_amount?: number | null
          quota_period?: string | null
          quota_unit?: string | null
          sort_order?: number | null
          timezone?: string
          title: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          allow_soft_over?: boolean
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          near_threshold_percent?: number
          owner_id?: string
          quota_amount?: number | null
          quota_period?: string | null
          quota_unit?: string | null
          sort_order?: number | null
          timezone?: string
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          completed_at: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          owner_id: string
          sort_order: number | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          owner_id: string
          sort_order?: number | null
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          owner_id?: string
          sort_order?: number | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      review_sessions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          data: Json | null
          id: string
          owner_id: string
          review_date: string
          review_type: string
          started_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          owner_id: string
          review_date: string
          review_type?: string
          started_at: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          owner_id?: string
          review_date?: string
          review_type?: string
          started_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_parent_id: string | null
          deleted_reason: string | null
          due_date: string | null
          id: string
          is_now: boolean
          next_task: boolean
          notes: string | null
          now_slot: string | null
          owner_id: string
          project_id: string | null
          sort_order: number | null
          start_date: string | null
          status: string
          task_location: string
          title: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_parent_id?: string | null
          deleted_reason?: string | null
          due_date?: string | null
          id?: string
          is_now?: boolean
          next_task?: boolean
          notes?: string | null
          now_slot?: string | null
          owner_id: string
          project_id?: string | null
          sort_order?: number | null
          start_date?: string | null
          status?: string
          task_location?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_parent_id?: string | null
          deleted_reason?: string | null
          due_date?: string | null
          id?: string
          is_now?: boolean
          next_task?: boolean
          notes?: string | null
          now_slot?: string | null
          owner_id?: string
          project_id?: string | null
          sort_order?: number | null
          start_date?: string | null
          status?: string
          task_location?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_deleted_parent_id_fkey"
            columns: ["deleted_parent_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          accumulated_seconds: number
          created_at: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          notes: string | null
          owner_id: string
          paused_at: string | null
          started_at: string
          task_id: string
        }
        Insert: {
          accumulated_seconds?: number
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          owner_id: string
          paused_at?: string | null
          started_at: string
          task_id: string
        }
        Update: {
          accumulated_seconds?: number
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          owner_id?: string
          paused_at?: string | null
          started_at?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entry_daily_totals: {
        Row: {
          entry_date: string
          id: string
          owner_id: string
          task_id: string
          total_seconds: number
          updated_at: string | null
        }
        Insert: {
          entry_date: string
          id?: string
          owner_id: string
          task_id: string
          total_seconds?: number
          updated_at?: string | null
        }
        Update: {
          entry_date?: string
          id?: string
          owner_id?: string
          task_id?: string
          total_seconds?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entry_daily_totals_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entry_segments: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          owner_id: string
          started_at: string
          task_id: string
          time_entry_id: string
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          owner_id: string
          started_at: string
          task_id: string
          time_entry_id: string
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          owner_id?: string
          started_at?: string
          task_id?: string
          time_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entry_segments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entry_segments_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "time_entries"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

// ============================================
// CONVENIENCE TYPE EXPORTS
// ============================================

// Projects
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
export type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];

// Tasks
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
export type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];
export type TaskStatus = Task["status"];
export type TaskLocation = Task["task_location"];

// Time Entries
export type TimeEntry = Database["public"]["Tables"]["time_entries"]["Row"];
export type TimeEntryInsert = Database["public"]["Tables"]["time_entries"]["Insert"];
export type TimeEntryUpdate = Database["public"]["Tables"]["time_entries"]["Update"];

// Time Entry Segments
export type TimeEntrySegment = Database["public"]["Tables"]["time_entry_segments"]["Row"];
export type TimeEntrySegmentInsert = Database["public"]["Tables"]["time_entry_segments"]["Insert"];

// Time Entry Daily Totals
export type TimeEntryDailyTotal = Database["public"]["Tables"]["time_entry_daily_totals"]["Row"];

// Habits
export type Habit = Database["public"]["Tables"]["habits"]["Row"];
export type HabitInsert = Database["public"]["Tables"]["habits"]["Insert"];
export type HabitUpdate = Database["public"]["Tables"]["habits"]["Update"];
export type HabitType = Habit["type"];

// Habit Entries (legacy build habits)
export type HabitEntry = Database["public"]["Tables"]["habit_entries"]["Row"];
export type HabitEntryInsert = Database["public"]["Tables"]["habit_entries"]["Insert"];
export type HabitEntryUpdate = Database["public"]["Tables"]["habit_entries"]["Update"];

// Habit Slips (avoid habits)
export type HabitSlip = Database["public"]["Tables"]["habit_slips"]["Row"];
export type HabitSlipInsert = Database["public"]["Tables"]["habit_slips"]["Insert"];

// Habit Days (avoid habits - day cache)
export type HabitDay = Database["public"]["Tables"]["habit_days"]["Row"];
export type HabitDayInsert = Database["public"]["Tables"]["habit_days"]["Insert"];
export type HabitDayStatus = HabitDay["status"];

// Habit Usage Events (quota habits)
export type HabitUsageEvent = Database["public"]["Tables"]["habit_usage_events"]["Row"];
export type HabitUsageEventInsert = Database["public"]["Tables"]["habit_usage_events"]["Insert"];

// Habit Periods (quota habits - period cache)
export type HabitPeriod = Database["public"]["Tables"]["habit_periods"]["Row"];
export type HabitPeriodInsert = Database["public"]["Tables"]["habit_periods"]["Insert"];
export type HabitPeriodStatus = HabitPeriod["status"];

// Review Sessions
export type ReviewSession = Database["public"]["Tables"]["review_sessions"]["Row"];
export type ReviewSessionInsert = Database["public"]["Tables"]["review_sessions"]["Insert"];
export type ReviewSessionUpdate = Database["public"]["Tables"]["review_sessions"]["Update"];

// Documents
export type Document = Database["public"]["Tables"]["documents"]["Row"];
export type DocumentInsert = Database["public"]["Tables"]["documents"]["Insert"];
export type DocumentUpdate = Database["public"]["Tables"]["documents"]["Update"];
