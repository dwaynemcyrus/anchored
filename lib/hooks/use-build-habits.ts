"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getBrowserTimezone } from "@/lib/time/local-date";
import {
  getCurrentPeriod,
  getPeriodLabel,
  type QuotaPeriod,
} from "@/lib/time/periods";
import {
  calculateBuildStats,
  getBuildQuickAmounts,
  formatBuildAmount,
  type BuildStatus,
} from "@/lib/habits/build-stats";
import { habitKeys } from "@/lib/hooks/use-habits";
import type { Habit } from "@/types/database";

// ============================================
// TYPES
// ============================================

export interface BuildHabitWithStatus extends Habit {
  totalDone: number;
  target: number;
  remaining: number;
  status: BuildStatus;
  periodLabel: string;
  periodEndDate: string;
  quickAddAmounts: { small: number; medium: number; large: number };
  lastEventId: string | null;
  unit: string;
}

// ============================================
// QUERY KEYS
// ============================================

export const buildHabitKeys = {
  all: ["build-habits"] as const,
  lists: () => [...buildHabitKeys.all, "list"] as const,
  list: (filters?: { active?: boolean }) =>
    [...buildHabitKeys.lists(), filters] as const,
  details: () => [...buildHabitKeys.all, "detail"] as const,
  detail: (id: string) => [...buildHabitKeys.details(), id] as const,
};

// ============================================
// FETCH FUNCTIONS
// ============================================

async function fetchBuildHabits(
  filters?: { active?: boolean }
): Promise<BuildHabitWithStatus[]> {
  const supabase = createClient();
  const timezone = getBrowserTimezone();

  let query = supabase
    .from("habits")
    .select("*")
    .eq("type", "build")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (filters?.active !== undefined) {
    query = query.eq("active", filters.active);
  }

  const { data: habits, error: habitsError } = await query;

  if (habitsError) {
    throw new Error(habitsError.message);
  }

  if (!habits || habits.length === 0) {
    return [];
  }

  // Get current period for each habit
  const results: BuildHabitWithStatus[] = [];

  for (const habit of habits) {
    const habitAny = habit as any;
    const period = getCurrentPeriod(timezone, habitAny.build_period as QuotaPeriod);
    const target = habitAny.build_target as number;

    // Fetch total for current period
    const { data: periodData } = await (supabase as any)
      .from("habit_build_periods")
      .select("total_done, status")
      .eq("habit_id", habit.id)
      .eq("local_period_start", period.localStartDate)
      .single();

    const totalDone = periodData?.total_done ?? 0;

    // Get last event for undo
    const { data: lastEvent } = await (supabase as any)
      .from("habit_build_events")
      .select("id")
      .eq("habit_id", habit.id)
      .eq("local_period_start", period.localStartDate)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const stats = calculateBuildStats(totalDone, target);

    results.push({
      ...habit,
      totalDone,
      target,
      remaining: stats.remaining,
      status: stats.status,
      periodLabel: getPeriodLabel(period.localStartDate, habitAny.build_period as QuotaPeriod),
      periodEndDate: period.localEndDate,
      quickAddAmounts: getBuildQuickAmounts(target),
      lastEventId: lastEvent?.id ?? null,
      unit: habitAny.build_unit as string,
    });
  }

  return results;
}

// ============================================
// MUTATION FUNCTIONS
// ============================================

interface LogProgressParams {
  habitId: string;
  amount: number;
  note?: string;
}

async function logProgress({ habitId, amount, note }: LogProgressParams) {
  const supabase = createClient();
  const supabaseAny = supabase as any;
  const timezone = getBrowserTimezone();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Get habit to determine period
  const { data: habit, error: habitError } = await supabaseAny
    .from("habits")
    .select("build_period, build_target")
    .eq("id", habitId)
    .single();

  if (habitError || !habit) throw new Error("Habit not found");

  const period = getCurrentPeriod(timezone, habit.build_period as QuotaPeriod);

  // Insert event
  const { error: eventError } = await supabaseAny.from("habit_build_events").insert({
    habit_id: habitId,
    user_id: user.id,
    local_period_start: period.localStartDate,
    local_period_end: period.localEndDate,
    amount,
    note,
  });

  if (eventError) throw new Error(eventError.message);

  // Update period totals
  const { data: events } = await supabaseAny
    .from("habit_build_events")
    .select("amount")
    .eq("habit_id", habitId)
    .eq("local_period_start", period.localStartDate);

  const totalDone = (events || []).reduce((sum: number, e: any) => sum + Number(e.amount), 0);
  const status = totalDone >= habit.build_target ? "complete" : "incomplete";

  await supabaseAny.from("habit_build_periods").upsert(
    {
      habit_id: habitId,
      user_id: user.id,
      local_period_start: period.localStartDate,
      local_period_end: period.localEndDate,
      total_done: totalDone,
      status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "habit_id,local_period_start" }
  );
}

async function undoProgress(eventId: string) {
  const supabase = createClient();
  const supabaseAny = supabase as any;

  // Get event details before deleting
  const { data: event } = await supabaseAny
    .from("habit_build_events")
    .select("habit_id, local_period_start")
    .eq("id", eventId)
    .single();

  if (!event) throw new Error("Event not found");

  // Delete the event
  const { error } = await supabaseAny
    .from("habit_build_events")
    .delete()
    .eq("id", eventId);

  if (error) throw new Error(error.message);

  // Recalculate period
  const { data: habit } = await supabaseAny
    .from("habits")
    .select("build_target")
    .eq("id", event.habit_id)
    .single();

  const { data: events } = await supabaseAny
    .from("habit_build_events")
    .select("amount")
    .eq("habit_id", event.habit_id)
    .eq("local_period_start", event.local_period_start);

  const totalDone = (events || []).reduce((sum: number, e: any) => sum + Number(e.amount), 0);
  const status = totalDone >= (habit?.build_target ?? 0) ? "complete" : "incomplete";

  if (totalDone === 0) {
    await supabaseAny
      .from("habit_build_periods")
      .delete()
      .eq("habit_id", event.habit_id)
      .eq("local_period_start", event.local_period_start);
  } else {
    await supabaseAny
      .from("habit_build_periods")
      .update({ total_done: totalDone, status, updated_at: new Date().toISOString() })
      .eq("habit_id", event.habit_id)
      .eq("local_period_start", event.local_period_start);
  }
}

interface CreateBuildHabitParams {
  title: string;
  buildTarget: number;
  buildUnit: string;
  buildPeriod: QuotaPeriod;
}

async function createBuildHabit(params: CreateBuildHabitParams) {
  const supabase = createClient();
  const supabaseAny = supabase as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { error } = await supabaseAny.from("habits").insert({
    owner_id: user.id,
    title: params.title,
    type: "build",
    build_target: params.buildTarget,
    build_unit: params.buildUnit,
    build_period: params.buildPeriod,
    active: true,
  });

  if (error) throw new Error(error.message);
}

// ============================================
// HOOKS
// ============================================

export function useBuildHabits(filters?: { active?: boolean }) {
  return useQuery({
    queryKey: buildHabitKeys.list(filters),
    queryFn: () => fetchBuildHabits(filters),
  });
}

export function useActiveBuildHabits() {
  return useBuildHabits({ active: true });
}

export function useLogProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logProgress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: buildHabitKeys.lists() });
    },
  });
}

export function useUndoProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: undoProgress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: buildHabitKeys.lists() });
    },
  });
}

export function useCreateBuildHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBuildHabit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: buildHabitKeys.lists() });
      queryClient.invalidateQueries({ queryKey: habitKeys.lists() });
    },
  });
}

export { formatBuildAmount };
