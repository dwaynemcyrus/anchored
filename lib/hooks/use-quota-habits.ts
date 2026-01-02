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
  calculatePeriodStatus,
  calculateRemaining,
  calculateQuotaStats,
  getQuickAddAmounts,
  formatQuotaAmount,
  type QuotaStats,
} from "@/lib/habits/quota-stats";
import type {
  Habit,
  HabitUsageEvent,
  HabitPeriod,
} from "@/types/database";

// ============================================
// TYPES
// ============================================

export type QuotaStatus = "under" | "near" | "over";

export interface QuotaHabitWithStatus extends Habit {
  /** Amount used in current period */
  used: number;
  /** Amount remaining in current period */
  remaining: number;
  /** Current period status */
  status: QuotaStatus;
  /** Human-readable period label */
  periodLabel: string;
  /** Period end date */
  periodEndDate: string;
  /** Quick add amounts (small/medium/large) */
  quickAddAmounts: { small: number; medium: number; large: number };
  /** Last usage event ID for undo */
  lastUsageEventId: string | null;
}

export interface QuotaHabitDetail extends QuotaHabitWithStatus {
  /** Period history (most recent first) */
  periods: HabitPeriod[];
  /** Usage events in current period */
  currentPeriodEvents: HabitUsageEvent[];
  /** Calculated stats */
  stats: QuotaStats;
}

// ============================================
// QUERY KEYS
// ============================================

export const quotaHabitKeys = {
  all: ["quota-habits"] as const,
  lists: () => [...quotaHabitKeys.all, "list"] as const,
  list: (filters?: { active?: boolean }) =>
    [...quotaHabitKeys.lists(), filters] as const,
  details: () => [...quotaHabitKeys.all, "detail"] as const,
  detail: (id: string) => [...quotaHabitKeys.details(), id] as const,
};

// ============================================
// FETCH FUNCTIONS
// ============================================

async function fetchQuotaHabits(
  filters?: { active?: boolean }
): Promise<QuotaHabitWithStatus[]> {
  const supabase = createClient();
  const timezone = getBrowserTimezone();

  // Fetch quota habits
  let query = supabase
    .from("habits")
    .select("*")
    .eq("type", "quota")
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

  // For each habit, get the current period data
  const result: QuotaHabitWithStatus[] = [];

  for (const habit of habits) {
    const quotaPeriod = habit.quota_period as QuotaPeriod;
    const period = getCurrentPeriod(timezone, quotaPeriod);

    // Get current period cache
    const { data: periodData } = await supabase
      .from("habit_periods")
      .select("*")
      .eq("habit_id", habit.id)
      .eq("local_period_start", period.localStartDate)
      .single();

    const totalUsed = periodData?.total_used ?? 0;
    const quotaAmount = habit.quota_amount ?? 0;
    const nearThreshold = habit.near_threshold_percent ?? 80;

    // Get last usage event for undo
    const { data: lastEvent } = await supabase
      .from("habit_usage_events")
      .select("id")
      .eq("habit_id", habit.id)
      .eq("local_period_start", period.localStartDate)
      .order("occurred_at", { ascending: false })
      .limit(1)
      .single();

    result.push({
      ...habit,
      used: totalUsed,
      remaining: calculateRemaining(totalUsed, quotaAmount),
      status: calculatePeriodStatus(totalUsed, quotaAmount, nearThreshold),
      periodLabel: getPeriodLabel(period.localStartDate, quotaPeriod),
      periodEndDate: period.localEndDate,
      quickAddAmounts: getQuickAddAmounts(quotaAmount, habit.quota_unit ?? "count"),
      lastUsageEventId: lastEvent?.id ?? null,
    });
  }

  return result;
}

async function fetchQuotaHabitDetail(
  id: string,
  rangeStart?: string,
  rangeEnd?: string
): Promise<QuotaHabitDetail> {
  const supabase = createClient();
  const timezone = getBrowserTimezone();

  // Fetch the habit
  const { data: habit, error: habitError } = await supabase
    .from("habits")
    .select("*")
    .eq("id", id)
    .eq("type", "quota")
    .single();

  if (habitError || !habit) {
    throw new Error(habitError?.message ?? "Habit not found");
  }

  const quotaPeriod = habit.quota_period as QuotaPeriod;
  const currentPeriod = getCurrentPeriod(timezone, quotaPeriod);
  const quotaAmount = habit.quota_amount ?? 0;
  const nearThreshold = habit.near_threshold_percent ?? 80;

  // Fetch period history
  let periodsQuery = supabase
    .from("habit_periods")
    .select("*")
    .eq("habit_id", id)
    .order("local_period_start", { ascending: false });

  if (rangeStart) {
    periodsQuery = periodsQuery.gte("local_period_start", rangeStart);
  }
  if (rangeEnd) {
    periodsQuery = periodsQuery.lte("local_period_end", rangeEnd);
  }

  const { data: periods, error: periodsError } = await periodsQuery;

  if (periodsError) {
    throw new Error(periodsError.message);
  }

  // Fetch current period events
  const { data: currentPeriodEvents, error: eventsError } = await supabase
    .from("habit_usage_events")
    .select("*")
    .eq("habit_id", id)
    .eq("local_period_start", currentPeriod.localStartDate)
    .order("occurred_at", { ascending: false });

  if (eventsError) {
    throw new Error(eventsError.message);
  }

  // Get current period data
  const currentPeriodData = periods?.find(
    (p) => p.local_period_start === currentPeriod.localStartDate
  );
  const totalUsed = currentPeriodData?.total_used ?? 0;

  // Get last usage event for undo
  const lastUsageEventId = currentPeriodEvents?.[0]?.id ?? null;

  // Calculate stats
  const stats = calculateQuotaStats(
    periods ?? [],
    habit.allow_soft_over ?? false
  );

  return {
    ...habit,
    used: totalUsed,
    remaining: calculateRemaining(totalUsed, quotaAmount),
    status: calculatePeriodStatus(totalUsed, quotaAmount, nearThreshold),
    periodLabel: getPeriodLabel(currentPeriod.localStartDate, quotaPeriod),
    periodEndDate: currentPeriod.localEndDate,
    quickAddAmounts: getQuickAddAmounts(quotaAmount, habit.quota_unit ?? "count"),
    lastUsageEventId,
    periods: periods ?? [],
    currentPeriodEvents: currentPeriodEvents ?? [],
    stats,
  };
}

// ============================================
// MUTATION FUNCTIONS
// ============================================

interface LogUsageParams {
  habitId: string;
  amount: number;
  occurredAt?: Date;
  note?: string;
}

async function logUsage({
  habitId,
  amount,
  occurredAt,
  note,
}: LogUsageParams): Promise<HabitUsageEvent> {
  const supabase = createClient();
  const timezone = getBrowserTimezone();

  // Get user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  // Get habit to determine period
  const { data: habit, error: habitError } = await supabase
    .from("habits")
    .select("quota_period, quota_amount, near_threshold_percent")
    .eq("id", habitId)
    .single();

  if (habitError || !habit) {
    throw new Error(habitError?.message ?? "Habit not found");
  }

  const quotaPeriod = habit.quota_period as QuotaPeriod;
  const eventTime = occurredAt ?? new Date();
  const period = getCurrentPeriod(timezone, quotaPeriod);

  // Insert usage event
  const { data: event, error: eventError } = await supabase
    .from("habit_usage_events")
    .insert({
      habit_id: habitId,
      owner_id: user.id,
      occurred_at: eventTime.toISOString(),
      local_period_start: period.localStartDate,
      local_period_end: period.localEndDate,
      amount,
      note: note ?? null,
    })
    .select()
    .single();

  if (eventError) {
    throw new Error(eventError.message);
  }

  // Update period cache
  await updatePeriodCache(
    supabase,
    habitId,
    user.id,
    period.localStartDate,
    period.localEndDate,
    habit.quota_amount ?? 0,
    habit.near_threshold_percent ?? 80
  );

  return event;
}

async function undoUsage(eventId: string): Promise<void> {
  const supabase = createClient();

  // Get the event to find habit and period info
  const { data: event, error: eventError } = await supabase
    .from("habit_usage_events")
    .select("*, habits(quota_amount, near_threshold_percent)")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    throw new Error(eventError?.message ?? "Event not found");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  // Delete the event
  const { error: deleteError } = await supabase
    .from("habit_usage_events")
    .delete()
    .eq("id", eventId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  // Recompute period cache
  const habitData = event.habits as { quota_amount: number; near_threshold_percent: number } | null;
  await updatePeriodCache(
    supabase,
    event.habit_id,
    user.id,
    event.local_period_start,
    event.local_period_end,
    habitData?.quota_amount ?? 0,
    habitData?.near_threshold_percent ?? 80
  );
}

async function updatePeriodCache(
  supabase: ReturnType<typeof createClient>,
  habitId: string,
  ownerId: string,
  periodStart: string,
  periodEnd: string,
  quotaAmount: number,
  nearThresholdPercent: number
): Promise<void> {
  // Sum all events for this period
  const { data: events } = await supabase
    .from("habit_usage_events")
    .select("amount")
    .eq("habit_id", habitId)
    .eq("local_period_start", periodStart);

  const totalUsed = events?.reduce((sum, e) => sum + (e.amount ?? 0), 0) ?? 0;
  const status = calculatePeriodStatus(totalUsed, quotaAmount, nearThresholdPercent);

  // Upsert period cache
  const { error } = await supabase
    .from("habit_periods")
    .upsert(
      {
        habit_id: habitId,
        owner_id: ownerId,
        local_period_start: periodStart,
        local_period_end: periodEnd,
        total_used: totalUsed,
        status,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "habit_id,local_period_start",
      }
    );

  if (error) {
    console.error("Failed to update period cache:", error);
  }
}

interface CreateQuotaHabitParams {
  title: string;
  quotaAmount: number;
  quotaUnit: string;
  quotaPeriod: QuotaPeriod;
  nearThresholdPercent?: number;
  allowSoftOver?: boolean;
}

async function createQuotaHabit(params: CreateQuotaHabitParams): Promise<Habit> {
  const supabase = createClient();
  const timezone = getBrowserTimezone();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("habits")
    .insert({
      owner_id: user.id,
      title: params.title,
      type: "quota",
      timezone,
      quota_amount: params.quotaAmount,
      quota_unit: params.quotaUnit,
      quota_period: params.quotaPeriod,
      near_threshold_percent: params.nearThresholdPercent ?? 80,
      allow_soft_over: params.allowSoftOver ?? false,
      active: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// ============================================
// REACT QUERY HOOKS
// ============================================

/**
 * Fetch all quota habits with current period status
 */
export function useQuotaHabits(filters?: { active?: boolean }) {
  return useQuery({
    queryKey: quotaHabitKeys.list(filters),
    queryFn: () => fetchQuotaHabits(filters),
  });
}

/**
 * Fetch active quota habits for Today view
 */
export function useActiveQuotaHabits() {
  return useQuotaHabits({ active: true });
}

/**
 * Fetch detailed quota habit data
 */
export function useQuotaHabitDetail(
  id: string,
  options?: { rangeStart?: string; rangeEnd?: string }
) {
  return useQuery({
    queryKey: quotaHabitKeys.detail(id),
    queryFn: () => fetchQuotaHabitDetail(id, options?.rangeStart, options?.rangeEnd),
    enabled: !!id,
  });
}

/**
 * Log usage for a quota habit
 */
export function useLogUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logUsage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotaHabitKeys.all });
    },
  });
}

/**
 * Undo a usage event
 */
export function useUndoUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: undoUsage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotaHabitKeys.all });
    },
  });
}

/**
 * Create a new quota habit
 */
export function useCreateQuotaHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createQuotaHabit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotaHabitKeys.all });
    },
  });
}

// ============================================
// HELPER EXPORTS
// ============================================

export { formatQuotaAmount } from "@/lib/habits/quota-stats";
