"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getBrowserTimezone, getTodayLocalDateString } from "@/lib/time/local-date";
import {
  generateOccurrences,
  formatSchedulePattern,
  formatScheduledTime,
  type SchedulePattern,
  type OccurrenceStatus,
} from "@/lib/time/schedule";
import {
  calculateScheduleStats,
  getStatusDisplayText,
  type ScheduleStats,
} from "@/lib/habits/schedule-stats";
import { habitKeys } from "@/lib/hooks/use-habits";
import type { Habit } from "@/types/database";
import { startOfDay, endOfDay, subDays } from "date-fns";
import { TZDate } from "@date-fns/tz";

// ============================================
// TYPES
// ============================================

export interface ScheduleOccurrence {
  id: string;
  habitId: string;
  scheduledAt: Date;
  localDate: string;
  status: OccurrenceStatus;
  completedAt: Date | null;
  note: string | null;
}

export interface ScheduleHabitWithOccurrences extends Habit {
  pattern: SchedulePattern;
  patternLabel: string;
  timezone: string;
  todayOccurrences: ScheduleOccurrence[];
  stats: ScheduleStats;
}

// ============================================
// QUERY KEYS
// ============================================

export const scheduleHabitKeys = {
  all: ["schedule-habits"] as const,
  lists: () => [...scheduleHabitKeys.all, "list"] as const,
  list: (filters?: { active?: boolean }) =>
    [...scheduleHabitKeys.lists(), filters] as const,
  details: () => [...scheduleHabitKeys.all, "detail"] as const,
  detail: (id: string) => [...scheduleHabitKeys.details(), id] as const,
  occurrences: () => [...scheduleHabitKeys.all, "occurrences"] as const,
  todayOccurrences: () => [...scheduleHabitKeys.occurrences(), "today"] as const,
};

// ============================================
// FETCH FUNCTIONS
// ============================================

async function fetchScheduleHabits(
  filters?: { active?: boolean }
): Promise<ScheduleHabitWithOccurrences[]> {
  const supabase = createClient();
  const supabaseAny = supabase as any;
  const timezone = getBrowserTimezone();
  const today = getTodayLocalDateString(timezone);

  try {
    let query = supabaseAny
      .from("habits")
      .select("*")
      .eq("type", "schedule")
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (filters?.active !== undefined) {
      query = query.eq("active", filters.active);
    }

    const { data: habits, error: habitsError } = await query;

    if (habitsError) {
      console.error("Error fetching schedule habits:", habitsError);
      return [];
    }

    if (!habits || habits.length === 0) {
      return [];
    }

    // Filter to only habits with valid schedule fields
    const validHabits = habits.filter(
      (h: any) => h.schedule_pattern && h.schedule_timezone
    );

    if (validHabits.length === 0) {
      return [];
    }

    const results: ScheduleHabitWithOccurrences[] = [];

    for (const habit of validHabits) {
      const habitAny = habit as any;
      const pattern = habitAny.schedule_pattern as SchedulePattern;
      const habitTimezone = habitAny.schedule_timezone as string;

      // Fetch today's occurrences from database
      const { data: dbOccurrences } = await supabaseAny
        .from("habit_schedule_occurrences")
        .select("*")
        .eq("habit_id", habit.id)
        .eq("local_date", today);

      // Generate expected occurrences for today
      const now = new TZDate(new Date(), habitTimezone);
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      const expectedOccurrences = generateOccurrences(
        pattern,
        habitTimezone,
        todayStart,
        todayEnd
      );

      // Map database occurrences
      const todayOccurrences: ScheduleOccurrence[] = [];

      for (const expected of expectedOccurrences) {
        // Check if this occurrence exists in database
        const existing = dbOccurrences?.find(
          (o: any) =>
            new Date(o.scheduled_at).getTime() === expected.scheduledAt.getTime()
        );

        if (existing) {
          todayOccurrences.push({
            id: existing.id,
            habitId: habit.id,
            scheduledAt: new Date(existing.scheduled_at),
            localDate: existing.local_date,
            status: existing.status as OccurrenceStatus,
            completedAt: existing.completed_at
              ? new Date(existing.completed_at)
              : null,
            note: existing.note,
          });
        } else {
          // Need to create this occurrence
          todayOccurrences.push({
            id: "", // Will be created on first interaction
            habitId: habit.id,
            scheduledAt: expected.scheduledAt,
            localDate: expected.localDate,
            status: expected.status,
            completedAt: null,
            note: null,
          });
        }
      }

      // Fetch historical occurrences for stats (last 30 days)
      const thirtyDaysAgo = subDays(now, 30);
      const { data: historicalOccurrences } = await supabaseAny
        .from("habit_schedule_occurrences")
        .select("id, status, scheduled_at, local_date")
        .eq("habit_id", habit.id)
        .gte("local_date", thirtyDaysAgo.toISOString().split("T")[0])
        .order("scheduled_at", { ascending: false });

      const statsOccurrences = (historicalOccurrences || []).map((o: any) => ({
        id: o.id,
        status: o.status as OccurrenceStatus,
        scheduledAt: new Date(o.scheduled_at),
        localDate: o.local_date,
      }));

      const stats = calculateScheduleStats(statsOccurrences);

      results.push({
        ...habit,
        pattern,
        patternLabel: formatSchedulePattern(pattern),
        timezone: habitTimezone,
        todayOccurrences,
        stats,
      });
    }

    return results;
  } catch (error) {
    console.error("Error in fetchScheduleHabits:", error);
    return [];
  }
}

// ============================================
// MUTATION FUNCTIONS
// ============================================

interface CreateScheduleHabitParams {
  title: string;
  schedulePattern: SchedulePattern;
  scheduleTimezone: string;
}

async function createScheduleHabit(params: CreateScheduleHabitParams) {
  const supabase = createClient();
  const supabaseAny = supabase as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { error } = await supabaseAny.from("habits").insert({
    owner_id: user.id,
    title: params.title,
    type: "schedule",
    schedule_pattern: params.schedulePattern,
    schedule_timezone: params.scheduleTimezone,
    active: true,
  });

  if (error) throw new Error(error.message);
}

interface MarkOccurrenceParams {
  habitId: string;
  scheduledAt: Date;
  localDate: string;
  status: "completed" | "skipped";
}

async function markOccurrence(params: MarkOccurrenceParams) {
  const supabase = createClient();
  const supabaseAny = supabase as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const now = new Date().toISOString();

  // Upsert the occurrence
  const { error } = await supabaseAny.from("habit_schedule_occurrences").upsert(
    {
      habit_id: params.habitId,
      user_id: user.id,
      scheduled_at: params.scheduledAt.toISOString(),
      local_date: params.localDate,
      status: params.status,
      completed_at: params.status === "completed" ? now : null,
    },
    { onConflict: "habit_id,scheduled_at" }
  );

  if (error) throw new Error(error.message);
}

// ============================================
// HOOKS
// ============================================

export function useScheduleHabits(filters?: { active?: boolean }) {
  return useQuery({
    queryKey: scheduleHabitKeys.list(filters),
    queryFn: () => fetchScheduleHabits(filters),
  });
}

export function useActiveScheduleHabits() {
  return useScheduleHabits({ active: true });
}

export function useCreateScheduleHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createScheduleHabit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleHabitKeys.lists() });
      queryClient.invalidateQueries({ queryKey: habitKeys.lists() });
    },
  });
}

export function useMarkOccurrence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markOccurrence,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleHabitKeys.lists() });
    },
  });
}

export { formatScheduledTime, getStatusDisplayText };
