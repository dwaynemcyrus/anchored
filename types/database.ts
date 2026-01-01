// This file will be auto-generated from Supabase
// Run: npx supabase gen types typescript --project-id <project-id> > types/database.ts
//
// For now, we define the types manually based on our schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          description: string | null;
          start_date: string | null;
          due_date: string | null;
          status: "active" | "completed" | "archived";
          sort_order: number;
          completed_at: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          description?: string | null;
          start_date?: string | null;
          due_date?: string | null;
          status?: "active" | "completed" | "archived";
          sort_order?: number;
          completed_at?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          title?: string;
          description?: string | null;
          start_date?: string | null;
          due_date?: string | null;
          status?: "active" | "completed" | "archived";
          sort_order?: number;
          completed_at?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          owner_id: string;
          project_id: string | null;
          title: string;
          notes: string | null;
          task_location: "inbox" | "anytime" | "project";
          status: "inbox" | "today" | "anytime" | "done";
          is_now: boolean;
          now_slot: "primary" | "secondary" | null;
          start_date: string | null;
          due_date: string | null;
          completed_at: string | null;
          deleted_at: string | null;
          deleted_reason: "user_deleted" | "project_deleted" | null;
          deleted_parent_id: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          project_id?: string | null;
          title: string;
          notes?: string | null;
          task_location?: "inbox" | "anytime" | "project";
          status?: "inbox" | "today" | "anytime" | "done";
          is_now?: boolean;
          now_slot?: "primary" | "secondary" | null;
          start_date?: string | null;
          due_date?: string | null;
          completed_at?: string | null;
          deleted_at?: string | null;
          deleted_reason?: "user_deleted" | "project_deleted" | null;
          deleted_parent_id?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          project_id?: string | null;
          title?: string;
          notes?: string | null;
          task_location?: "inbox" | "anytime" | "project";
          status?: "inbox" | "today" | "anytime" | "done";
          is_now?: boolean;
          now_slot?: "primary" | "secondary" | null;
          start_date?: string | null;
          due_date?: string | null;
          completed_at?: string | null;
          deleted_at?: string | null;
          deleted_reason?: "user_deleted" | "project_deleted" | null;
          deleted_parent_id?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey";
            columns: ["project_id"];
            referencedRelation: "projects";
            referencedColumns: ["id"];
          }
        ];
      };
      time_entries: {
        Row: {
          id: string;
          owner_id: string;
          task_id: string;
          started_at: string;
          ended_at: string | null;
          duration_seconds: number | null;
          accumulated_seconds: number;
          paused_at: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          task_id: string;
          started_at: string;
          ended_at?: string | null;
          duration_seconds?: number | null;
          accumulated_seconds?: number;
          paused_at?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          task_id?: string;
          started_at?: string;
          ended_at?: string | null;
          duration_seconds?: number | null;
          accumulated_seconds?: number;
          paused_at?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "time_entries_task_id_fkey";
            columns: ["task_id"];
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          }
        ];
      };
      time_entry_segments: {
        Row: {
          id: string;
          time_entry_id: string;
          owner_id: string;
          task_id: string;
          started_at: string;
          ended_at: string | null;
          duration_seconds: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          time_entry_id: string;
          owner_id: string;
          task_id: string;
          started_at: string;
          ended_at?: string | null;
          duration_seconds?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          time_entry_id?: string;
          owner_id?: string;
          task_id?: string;
          started_at?: string;
          ended_at?: string | null;
          duration_seconds?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "time_entry_segments_time_entry_id_fkey";
            columns: ["time_entry_id"];
            referencedRelation: "time_entries";
            referencedColumns: ["id"];
          }
        ];
      };
      time_entry_daily_totals: {
        Row: {
          id: string;
          owner_id: string;
          task_id: string;
          entry_date: string;
          total_seconds: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          task_id: string;
          entry_date: string;
          total_seconds?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          task_id?: string;
          entry_date?: string;
          total_seconds?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "time_entry_daily_totals_task_id_fkey";
            columns: ["task_id"];
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          }
        ];
      };
      habits: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          description: string | null;
          active: boolean;
          deleted_at: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          description?: string | null;
          active?: boolean;
          deleted_at?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          title?: string;
          description?: string | null;
          active?: boolean;
          deleted_at?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      habit_entries: {
        Row: {
          id: string;
          habit_id: string;
          owner_id: string;
          entry_date: string;
          completed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          habit_id: string;
          owner_id: string;
          entry_date: string;
          completed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          habit_id?: string;
          owner_id?: string;
          entry_date?: string;
          completed?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "habit_entries_habit_id_fkey";
            columns: ["habit_id"];
            referencedRelation: "habits";
            referencedColumns: ["id"];
          }
        ];
      };
      review_sessions: {
        Row: {
          id: string;
          owner_id: string;
          review_type: "daily" | "weekly" | "monthly" | "quarterly" | "annual";
          review_date: string;
          started_at: string;
          completed_at: string | null;
          data: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          review_type?: "daily" | "weekly" | "monthly" | "quarterly" | "annual";
          review_date: string;
          started_at: string;
          completed_at?: string | null;
          data?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          review_type?: "daily" | "weekly" | "monthly" | "quarterly" | "annual";
          review_date?: string;
          started_at?: string;
          completed_at?: string | null;
          data?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Convenience types
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
export type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];

export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
export type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];
export type TaskStatus = Task["status"];
export type TaskLocation = Task["task_location"];
export type DeletedReason = NonNullable<Task["deleted_reason"]>;

export type TimeEntry = Database["public"]["Tables"]["time_entries"]["Row"];
export type TimeEntryInsert = Database["public"]["Tables"]["time_entries"]["Insert"];
export type TimeEntryUpdate = Database["public"]["Tables"]["time_entries"]["Update"];

export type Habit = Database["public"]["Tables"]["habits"]["Row"];
export type HabitInsert = Database["public"]["Tables"]["habits"]["Insert"];
export type HabitUpdate = Database["public"]["Tables"]["habits"]["Update"];

export type HabitEntry = Database["public"]["Tables"]["habit_entries"]["Row"];
export type HabitEntryInsert = Database["public"]["Tables"]["habit_entries"]["Insert"];
export type HabitEntryUpdate = Database["public"]["Tables"]["habit_entries"]["Update"];

export type ReviewSession = Database["public"]["Tables"]["review_sessions"]["Row"];
export type ReviewSessionInsert = Database["public"]["Tables"]["review_sessions"]["Insert"];
export type ReviewSessionUpdate = Database["public"]["Tables"]["review_sessions"]["Update"];
export type ReviewType = ReviewSession["review_type"];
