"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  getTodayLocalDateString,
  getLocalDateString,
  getDaysAgoLocalDateString,
  getBrowserTimezone,
} from "@/lib/time/local-date";
import type {
  Habit,
  HabitSlip,
  HabitDay,
  HabitDayStatus,
} from "@/types/database";

// ============================================
// TYPES
// ============================================

export type AvoidHabitDayState = "clean" | "slipped" | "excluded";

export interface AvoidHabitWithStatus extends Habit {
  todayStatus: AvoidHabitDayState;
  currentStreak: number;
  lastSlipDate: string | null;
  todaySlipCount: number;
  lastTodaySlipId: string | null; // For undo functionality
}

export interface AvoidHabitDetail extends AvoidHabitWithStatus {
  days: HabitDay[];
  slips: HabitSlip[];
}

// ============================================
// QUERY KEYS
// ============================================

export const avoidHabitKeys = {
  all: ["avoid-habits"] as const,
  lists: () => [...avoidHabitKeys.all, "list"] as const,
  list: (filters?: { active?: boolean }) =>
    [...avoidHabitKeys.lists(), filters] as const,
  details: () => [...avoidHabitKeys.all, "detail"] as const,
  detail: (id: string) => [...avoidHabitKeys.details(), id] as const,
};

// ============================================
// STREAK CALCULATION (Pure Function)
// ============================================

/**
 * Calculate consecutive clean days streak for an avoid habit
 *
 * Rules:
 * - Streak = consecutive CLEAN days counting backward from yesterday
 * - Excluded days do NOT increment or break the streak (they're skipped)
 * - Slipped days break the streak
 * - If today is clean, it adds 1 to the streak
 */
export function calculateAvoidStreak(
  days: HabitDay[],
  todayStr: string
): number {
  if (!days || days.length === 0) return 0;

  // Sort by date descending (most recent first)
  const sortedDays = [...days].sort(
    (a, b) => new Date(b.local_date).getTime() - new Date(a.local_date).getTime()
  );

  // Build a map for quick lookup
  const dayMap = new Map<string, HabitDayStatus>();
  for (const day of sortedDays) {
    dayMap.set(day.local_date, day.status as HabitDayStatus);
  }

  let streak = 0;
  let checkDate = todayStr;

  // Count consecutive clean days
  // We iterate backwards from today, skipping excluded days
  for (let i = 0; i < 365; i++) {
    // Max 365 days to prevent infinite loop
    const status = dayMap.get(checkDate);

    if (status === "slipped") {
      // Streak broken
      break;
    } else if (status === "excluded") {
      // Skip excluded days - they don't count for or against streak
    } else {
      // Clean day (either explicit 'clean' or no entry = clean by default)
      streak++;
    }

    // Move to previous day
    // Note: This is a simple date subtraction, timezone is already handled
    const date = new Date(checkDate);
    date.setDate(date.getDate() - 1);
    checkDate = date.toISOString().split("T")[0];
  }

  return streak;
}

/**
 * Find the most recent slip date
 */
function findLastSlipDate(slips: HabitSlip[]): string | null {
  if (!slips || slips.length === 0) return null;

  const sorted = [...slips].sort(
    (a, b) =>
      new Date(b.local_date).getTime() - new Date(a.local_date).getTime()
  );

  return sorted[0].local_date;
}

// ============================================
// FETCH FUNCTIONS
// ============================================

async function fetchAvoidHabits(filters?: {
  active?: boolean;
}): Promise<AvoidHabitWithStatus[]> {
  const supabase = createClient();
  const timezone = getBrowserTimezone();
  const todayStr = getTodayLocalDateString(timezone);
  const ninetyDaysAgo = getDaysAgoLocalDateString(90, timezone);

  // Fetch avoid habits
  let query = supabase
    .from("habits")
    .select("*")
    .eq("type", "avoid")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
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

  const habitIds = habits.map((h) => h.id);

  // Fetch habit days for streak calculation
  const { data: days, error: daysError } = await supabase
    .from("habit_days")
    .select("*")
    .in("habit_id", habitIds)
    .gte("local_date", ninetyDaysAgo)
    .order("local_date", { ascending: false });

  if (daysError) {
    throw new Error(daysError.message);
  }

  // Fetch slips to find last slip date and today's slip count
  const { data: slips, error: slipsError } = await supabase
    .from("habit_slips")
    .select("*")
    .in("habit_id", habitIds)
    .order("occurred_at", { ascending: false });

  if (slipsError) {
    throw new Error(slipsError.message);
  }

  // Group by habit
  const daysByHabit = new Map<string, HabitDay[]>();
  const slipsByHabit = new Map<string, HabitSlip[]>();

  days?.forEach((day) => {
    const existing = daysByHabit.get(day.habit_id) || [];
    existing.push(day);
    daysByHabit.set(day.habit_id, existing);
  });

  slips?.forEach((slip) => {
    const existing = slipsByHabit.get(slip.habit_id) || [];
    existing.push(slip);
    slipsByHabit.set(slip.habit_id, existing);
  });

  // Calculate status for each habit
  return habits.map((habit) => {
    const habitDays = daysByHabit.get(habit.id) || [];
    const habitSlips = slipsByHabit.get(habit.id) || [];

    // Find today's day status
    const todayDay = habitDays.find((d) => d.local_date === todayStr);
    const todayStatus: AvoidHabitDayState = todayDay
      ? (todayDay.status as AvoidHabitDayState)
      : "clean";

    // Get today's slips (sorted by occurred_at descending)
    const todaySlips = habitSlips.filter((s) => s.local_date === todayStr);
    const todaySlipCount = todaySlips.length;
    const lastTodaySlipId = todaySlips.length > 0 ? todaySlips[0].id : null;

    return {
      ...habit,
      todayStatus,
      currentStreak: calculateAvoidStreak(habitDays, todayStr),
      lastSlipDate: findLastSlipDate(habitSlips),
      todaySlipCount,
      lastTodaySlipId,
    };
  });
}

async function fetchAvoidHabitDetail(
  id: string,
  daysBack: number = 60
): Promise<AvoidHabitDetail> {
  const supabase = createClient();
  const timezone = getBrowserTimezone();
  const todayStr = getTodayLocalDateString(timezone);
  const rangeStart = getDaysAgoLocalDateString(daysBack, timezone);

  // Fetch habit
  const { data: habit, error: habitError } = await supabase
    .from("habits")
    .select("*")
    .eq("id", id)
    .eq("type", "avoid")
    .is("deleted_at", null)
    .single();

  if (habitError) {
    throw new Error(habitError.message);
  }

  // Fetch days
  const { data: days, error: daysError } = await supabase
    .from("habit_days")
    .select("*")
    .eq("habit_id", id)
    .gte("local_date", rangeStart)
    .order("local_date", { ascending: false });

  if (daysError) {
    throw new Error(daysError.message);
  }

  // Fetch slips
  const { data: slips, error: slipsError } = await supabase
    .from("habit_slips")
    .select("*")
    .eq("habit_id", id)
    .gte("local_date", rangeStart)
    .order("occurred_at", { ascending: false });

  if (slipsError) {
    throw new Error(slipsError.message);
  }

  // Find today's status
  const todayDay = days?.find((d) => d.local_date === todayStr);
  const todayStatus: AvoidHabitDayState = todayDay
    ? (todayDay.status as AvoidHabitDayState)
    : "clean";

  const todaySlips = slips?.filter((s) => s.local_date === todayStr) || [];
  const todaySlipCount = todaySlips.length;
  const lastTodaySlipId = todaySlips.length > 0 ? todaySlips[0].id : null;

  return {
    ...habit,
    todayStatus,
    currentStreak: calculateAvoidStreak(days || [], todayStr),
    lastSlipDate: findLastSlipDate(slips || []),
    todaySlipCount,
    lastTodaySlipId,
    days: days || [],
    slips: slips || [],
  };
}

// ============================================
// MUTATION FUNCTIONS
// ============================================

interface LogSlipParams {
  habitId: string;
  severity?: 1 | 2 | 3;
  note?: string;
  occurredAt?: Date;
}

async function logSlip({
  habitId,
  severity,
  note,
  occurredAt,
}: LogSlipParams): Promise<HabitSlip> {
  const supabase = createClient();
  const timezone = getBrowserTimezone();
  const now = occurredAt || new Date();
  const localDate = getLocalDateString(now, timezone);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  // Insert slip
  const { data: slip, error: slipError } = await supabase
    .from("habit_slips")
    .insert({
      habit_id: habitId,
      owner_id: user.id,
      occurred_at: now.toISOString(),
      local_date: localDate,
      severity: severity || null,
      note: note || null,
    })
    .select()
    .single();

  if (slipError) {
    throw new Error(slipError.message);
  }

  // Upsert habit_days to mark as slipped (unless excluded)
  const { data: existingDay } = await supabase
    .from("habit_days")
    .select("status")
    .eq("habit_id", habitId)
    .eq("local_date", localDate)
    .single();

  // Only update if not excluded
  if (!existingDay || existingDay.status !== "excluded") {
    const { error: dayError } = await supabase.from("habit_days").upsert(
      {
        habit_id: habitId,
        owner_id: user.id,
        local_date: localDate,
        status: "slipped",
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "habit_id,local_date",
      }
    );

    if (dayError) {
      throw new Error(dayError.message);
    }
  }

  return slip;
}

async function undoSlip(slipId: string): Promise<void> {
  const supabase = createClient();

  // Get the slip first to know which day to recompute
  const { data: slip, error: fetchError } = await supabase
    .from("habit_slips")
    .select("habit_id, local_date")
    .eq("id", slipId)
    .single();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  // Delete the slip
  const { error: deleteError } = await supabase
    .from("habit_slips")
    .delete()
    .eq("id", slipId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  // Check if there are any remaining slips for this day
  const { data: remainingSlips } = await supabase
    .from("habit_slips")
    .select("id")
    .eq("habit_id", slip.habit_id)
    .eq("local_date", slip.local_date);

  // If no remaining slips and day is not excluded, set to clean
  if (!remainingSlips || remainingSlips.length === 0) {
    const { data: existingDay } = await supabase
      .from("habit_days")
      .select("status")
      .eq("habit_id", slip.habit_id)
      .eq("local_date", slip.local_date)
      .single();

    if (existingDay && existingDay.status !== "excluded") {
      // Delete the day record (clean is the default)
      await supabase
        .from("habit_days")
        .delete()
        .eq("habit_id", slip.habit_id)
        .eq("local_date", slip.local_date);
    }
  }
}

interface SetDayExcludedParams {
  habitId: string;
  localDate: string;
  excluded: boolean;
}

async function setDayExcluded({
  habitId,
  localDate,
  excluded,
}: SetDayExcludedParams): Promise<void> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  if (excluded) {
    // Set day as excluded
    const { error } = await supabase.from("habit_days").upsert(
      {
        habit_id: habitId,
        owner_id: user.id,
        local_date: localDate,
        status: "excluded",
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "habit_id,local_date",
      }
    );

    if (error) {
      throw new Error(error.message);
    }
  } else {
    // Un-exclude: check if there are slips for this day
    const { data: slips } = await supabase
      .from("habit_slips")
      .select("id")
      .eq("habit_id", habitId)
      .eq("local_date", localDate);

    if (slips && slips.length > 0) {
      // Has slips, set to slipped
      const { error } = await supabase
        .from("habit_days")
        .update({ status: "slipped", updated_at: new Date().toISOString() })
        .eq("habit_id", habitId)
        .eq("local_date", localDate);

      if (error) {
        throw new Error(error.message);
      }
    } else {
      // No slips, delete the day record (clean is default)
      await supabase
        .from("habit_days")
        .delete()
        .eq("habit_id", habitId)
        .eq("local_date", localDate);
    }
  }
}

interface CreateAvoidHabitParams {
  title: string;
  description?: string;
  timezone?: string;
}

async function createAvoidHabit({
  title,
  description,
  timezone,
}: CreateAvoidHabitParams): Promise<Habit> {
  const supabase = createClient();

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
      title,
      description: description || null,
      type: "avoid",
      timezone: timezone || getBrowserTimezone(),
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
// HOOKS
// ============================================

export function useAvoidHabits(filters?: { active?: boolean }) {
  return useQuery({
    queryKey: avoidHabitKeys.list(filters),
    queryFn: () => fetchAvoidHabits(filters),
  });
}

export function useActiveAvoidHabits() {
  return useAvoidHabits({ active: true });
}

export function useAvoidHabitDetail(id: string, daysBack: number = 60) {
  return useQuery({
    queryKey: avoidHabitKeys.detail(id),
    queryFn: () => fetchAvoidHabitDetail(id, daysBack),
    enabled: !!id,
  });
}

export function useCreateAvoidHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAvoidHabit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: avoidHabitKeys.lists() });
    },
  });
}

export function useLogSlip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logSlip,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: avoidHabitKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: avoidHabitKeys.detail(variables.habitId),
      });
    },
  });
}

export function useUndoSlip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: undoSlip,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: avoidHabitKeys.lists() });
      queryClient.invalidateQueries({ queryKey: avoidHabitKeys.details() });
    },
  });
}

export function useSetDayExcluded() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setDayExcluded,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: avoidHabitKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: avoidHabitKeys.detail(variables.habitId),
      });
    },
  });
}
