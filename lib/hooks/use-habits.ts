"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { format, subDays, startOfDay } from "date-fns";
import type {
  Habit,
  HabitInsert,
  HabitUpdate,
  HabitEntry,
} from "@/types/database";

// Extended habit type with streak and today's entry
export type HabitWithStreak = Habit & {
  currentStreak: number;
  completedToday: boolean;
  todayEntryId: string | null;
};

// Query keys
export const habitKeys = {
  all: ["habits"] as const,
  lists: () => [...habitKeys.all, "list"] as const,
  list: (filters: { active?: boolean }) =>
    [...habitKeys.lists(), filters] as const,
  details: () => [...habitKeys.all, "detail"] as const,
  detail: (id: string) => [...habitKeys.details(), id] as const,
  entries: () => [...habitKeys.all, "entries"] as const,
  entriesByHabit: (habitId: string) =>
    [...habitKeys.entries(), habitId] as const,
};

// Calculate streak for a habit
function calculateStreak(entries: HabitEntry[], today: Date): number {
  if (!entries || entries.length === 0) return 0;

  // Sort entries by date descending
  const sortedEntries = [...entries]
    .filter((e) => e.completed)
    .sort(
      (a, b) =>
        new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
    );

  if (sortedEntries.length === 0) return 0;

  const todayStr = format(today, "yyyy-MM-dd");
  const yesterdayStr = format(subDays(today, 1), "yyyy-MM-dd");

  // Check if the most recent entry is today or yesterday
  const mostRecent = sortedEntries[0].entry_date;
  if (mostRecent !== todayStr && mostRecent !== yesterdayStr) {
    return 0; // Streak broken
  }

  // Count consecutive days
  let streak = 0;
  let expectedDate = mostRecent === todayStr ? today : subDays(today, 1);

  for (const entry of sortedEntries) {
    const entryDateStr = entry.entry_date;
    const expectedDateStr = format(expectedDate, "yyyy-MM-dd");

    if (entryDateStr === expectedDateStr) {
      streak++;
      expectedDate = subDays(expectedDate, 1);
    } else if (entryDateStr < expectedDateStr) {
      // Gap in streak
      break;
    }
    // If entryDateStr > expectedDateStr, skip (duplicate or future entry)
  }

  return streak;
}

// Fetch habits with streak calculation
async function fetchHabits(filters?: {
  active?: boolean;
}): Promise<HabitWithStreak[]> {
  const supabase = createClient();
  const today = startOfDay(new Date());
  const todayStr = format(today, "yyyy-MM-dd");

  // Fetch habits (exclude soft-deleted)
  let query = supabase
    .from("habits")
    .select("*")
    .is("deleted_at", null) // Exclude soft-deleted habits
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

  // Fetch all entries for these habits (last 90 days for streak calculation)
  const ninetyDaysAgo = format(subDays(today, 90), "yyyy-MM-dd");

  const { data: entries, error: entriesError } = await supabase
    .from("habit_entries")
    .select("*")
    .in("habit_id", habitIds)
    .gte("entry_date", ninetyDaysAgo)
    .order("entry_date", { ascending: false });

  if (entriesError) {
    throw new Error(entriesError.message);
  }

  // Group entries by habit
  const entriesByHabit = new Map<string, HabitEntry[]>();
  entries?.forEach((entry) => {
    const existing = entriesByHabit.get(entry.habit_id) || [];
    existing.push(entry);
    entriesByHabit.set(entry.habit_id, existing);
  });

  // Calculate streaks and today's status
  return habits.map((habit) => {
    const habitEntries = entriesByHabit.get(habit.id) || [];
    const todayEntry = habitEntries.find((e) => e.entry_date === todayStr);

    return {
      ...habit,
      currentStreak: calculateStreak(habitEntries, today),
      completedToday: todayEntry?.completed || false,
      todayEntryId: todayEntry?.id || null,
    };
  });
}

// Fetch single habit
async function fetchHabit(id: string): Promise<HabitWithStreak> {
  const supabase = createClient();
  const today = startOfDay(new Date());
  const todayStr = format(today, "yyyy-MM-dd");

  const { data: habit, error } = await supabase
    .from("habits")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null) // Exclude soft-deleted habits
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // Fetch entries for streak calculation
  const ninetyDaysAgo = format(subDays(today, 90), "yyyy-MM-dd");

  const { data: entries } = await supabase
    .from("habit_entries")
    .select("*")
    .eq("habit_id", id)
    .gte("entry_date", ninetyDaysAgo)
    .order("entry_date", { ascending: false });

  const todayEntry = entries?.find((e) => e.entry_date === todayStr);

  return {
    ...habit,
    currentStreak: calculateStreak(entries || [], today),
    completedToday: todayEntry?.completed || false,
    todayEntryId: todayEntry?.id || null,
  };
}

// Create habit
async function createHabit(
  habit: Omit<HabitInsert, "owner_id">
): Promise<Habit> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("habits")
    .insert({ ...habit, owner_id: user.id })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Update habit
async function updateHabit({
  id,
  ...updates
}: HabitUpdate & { id: string }): Promise<Habit> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("habits")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Archive habit (deactivate by setting active = false - legacy)
async function archiveHabit(id: string): Promise<Habit> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("habits")
    .update({ active: false })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Soft delete habit (moves to logbook)
async function softDeleteHabit(id: string): Promise<Habit> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("habits")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Toggle today's habit entry
async function toggleHabitToday(
  habitId: string,
  completed: boolean
): Promise<HabitEntry> {
  const supabase = createClient();
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  // Check if entry exists for today
  const { data: existing } = await supabase
    .from("habit_entries")
    .select("id")
    .eq("habit_id", habitId)
    .eq("entry_date", todayStr)
    .single();

  if (existing) {
    // Update existing entry
    const { data, error } = await supabase
      .from("habit_entries")
      .update({ completed })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  } else {
    // Create new entry
    const { data, error } = await supabase
      .from("habit_entries")
      .insert({
        habit_id: habitId,
        owner_id: user.id,
        entry_date: todayStr,
        completed,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }
}

// Reorder habits
async function reorderHabits(
  habitOrders: { id: string; sort_order: number }[]
): Promise<void> {
  const supabase = createClient();

  // Update each habit's sort_order
  for (const { id, sort_order } of habitOrders) {
    const { error } = await supabase
      .from("habits")
      .update({ sort_order })
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }
  }
}

// Hooks

export function useHabits(filters?: { active?: boolean }) {
  return useQuery({
    queryKey: habitKeys.list(filters || {}),
    queryFn: () => fetchHabits(filters),
  });
}

export function useActiveHabits() {
  return useHabits({ active: true });
}

export function useHabit(id: string) {
  return useQuery({
    queryKey: habitKeys.detail(id),
    queryFn: () => fetchHabit(id),
    enabled: !!id,
  });
}

export function useCreateHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createHabit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: habitKeys.lists() });
    },
  });
}

export function useUpdateHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateHabit,
    onMutate: async (updatedHabit) => {
      await queryClient.cancelQueries({ queryKey: habitKeys.lists() });

      const previousData = queryClient.getQueriesData({
        queryKey: habitKeys.lists(),
      });

      queryClient.setQueriesData(
        { queryKey: habitKeys.lists() },
        (old: HabitWithStreak[] | undefined) => {
          if (!old) return old;
          return old.map((habit) =>
            habit.id === updatedHabit.id
              ? { ...habit, ...updatedHabit }
              : habit
          );
        }
      );

      return { previousData };
    },
    onError: (_err, _updatedHabit, context) => {
      context?.previousData?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: habitKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: habitKeys.detail(variables.id),
      });
    },
  });
}

export function useArchiveHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: archiveHabit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: habitKeys.lists() });
    },
  });
}

export function useSoftDeleteHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: softDeleteHabit,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: habitKeys.lists() });

      const previousData = queryClient.getQueriesData({
        queryKey: habitKeys.lists(),
      });

      // Optimistically remove habit from lists
      queryClient.setQueriesData(
        { queryKey: habitKeys.lists() },
        (old: HabitWithStreak[] | undefined) => {
          if (!old) return old;
          return old.filter((habit) => habit.id !== id);
        }
      );

      return { previousData };
    },
    onError: (_err, _id, context) => {
      context?.previousData?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: habitKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ["logbook"] });
    },
  });
}

export function useToggleHabitToday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      habitId,
      completed,
    }: {
      habitId: string;
      completed: boolean;
    }) => toggleHabitToday(habitId, completed),
    onMutate: async ({ habitId, completed }) => {
      await queryClient.cancelQueries({ queryKey: habitKeys.lists() });

      const previousData = queryClient.getQueriesData({
        queryKey: habitKeys.lists(),
      });

      // Optimistically update
      queryClient.setQueriesData(
        { queryKey: habitKeys.lists() },
        (old: HabitWithStreak[] | undefined) => {
          if (!old) return old;
          return old.map((habit) => {
            if (habit.id !== habitId) return habit;

            // Recalculate streak optimistically
            let newStreak = habit.currentStreak;
            if (completed && !habit.completedToday) {
              // Adding completion - streak increases
              newStreak = habit.currentStreak + 1;
            } else if (!completed && habit.completedToday) {
              // Removing completion - streak decreases (if today was part of streak)
              newStreak = Math.max(0, habit.currentStreak - 1);
            }

            return {
              ...habit,
              completedToday: completed,
              currentStreak: newStreak,
            };
          });
        }
      );

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      context?.previousData?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: habitKeys.lists() });
    },
  });
}

export function useReorderHabits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reorderHabits,
    onMutate: async (habitOrders) => {
      await queryClient.cancelQueries({ queryKey: habitKeys.lists() });

      const previousData = queryClient.getQueriesData({
        queryKey: habitKeys.lists(),
      });

      const orderMap = new Map(
        habitOrders.map(({ id, sort_order }) => [id, sort_order])
      );

      queryClient.setQueriesData(
        { queryKey: habitKeys.lists() },
        (old: HabitWithStreak[] | undefined) => {
          if (!old) return old;
          return old
            .map((habit) => {
              const newOrder = orderMap.get(habit.id);
              if (newOrder !== undefined) {
                return { ...habit, sort_order: newOrder };
              }
              return habit;
            })
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        }
      );

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      context?.previousData?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: habitKeys.lists() });
    },
  });
}
