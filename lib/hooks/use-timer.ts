"use client";

import { useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addDays, format, startOfDay } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useTimerStore, type ActiveTimer } from "@/lib/stores/timer-store";
import type { Task, Project } from "@/types/database";
import { taskKeys } from "./use-tasks";

// Query keys
export const timerKeys = {
  all: ["timer"] as const,
  active: () => [...timerKeys.all, "active"] as const,
  entries: () => [...timerKeys.all, "entries"] as const,
  entriesByTask: (taskId: string) => [...timerKeys.entries(), taskId] as const,
  entriesByDate: (date: string) => [...timerKeys.entries(), date] as const,
};

// Types
export interface TimeEntry {
  id: string;
  task_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  notes: string | null;
  created_at: string;
}

export interface TimeEntryWithTask extends TimeEntry {
  task: Pick<Task, "id" | "title"> & {
    project: Pick<Project, "id" | "title"> | null;
  };
}

// Fetch active (running) timer
async function fetchActiveTimer(): Promise<ActiveTimer | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("time_entries")
    .select(
      `
      id,
      task_id,
      started_at,
      task:tasks(
        id,
        title,
        project:projects(id, title)
      )
    `
    )
    .is("ended_at", null)
    .single();

  if (error) {
    // No active timer is not an error
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(error.message);
  }

  if (!data || !data.task) {
    return null;
  }

  const task = data.task as unknown as Pick<Task, "id" | "title"> & {
    project: Pick<Project, "id" | "title"> | null;
  };

  return {
    id: data.id,
    taskId: data.task_id,
    taskTitle: task.title,
    projectTitle: task.project?.title || null,
    startedAt: new Date(data.started_at),
  };
}

// Start timer for a task
async function startTimer(taskId: string): Promise<TimeEntry> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  // First, stop any existing timer
  const { data: existing } = await supabase
    .from("time_entries")
    .select("id, started_at")
    .is("ended_at", null)
    .single();

  if (existing) {
    const duration = Math.floor(
      (Date.now() - new Date(existing.started_at).getTime()) / 1000
    );
    await supabase
      .from("time_entries")
      .update({
        ended_at: new Date().toISOString(),
        duration_seconds: duration,
      })
      .eq("id", existing.id);
  }

  // Start new timer
  const { data, error } = await supabase
    .from("time_entries")
    .insert({
      owner_id: user.id,
      task_id: taskId,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Stop current timer
async function stopTimer(): Promise<TimeEntry | null> {
  const supabase = createClient();

  const { data: existing } = await supabase
    .from("time_entries")
    .select("id, started_at")
    .is("ended_at", null)
    .single();

  if (!existing) {
    return null;
  }

  const duration = Math.floor(
    (Date.now() - new Date(existing.started_at).getTime()) / 1000
  );

  const { data, error } = await supabase
    .from("time_entries")
    .update({
      ended_at: new Date().toISOString(),
      duration_seconds: duration,
    })
    .eq("id", existing.id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Delete a time entry
async function deleteTimeEntry(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from("time_entries").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

// Fetch time entries for a specific task
async function fetchTimeEntriesByTask(
  taskId: string
): Promise<TimeEntry[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("time_entries")
    .select("*")
    .eq("task_id", taskId)
    .order("started_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

async function fetchTimeEntriesByDate(date: Date): Promise<TimeEntry[]> {
  const supabase = createClient();
  const start = startOfDay(date);
  const end = addDays(start, 1);

  const { data, error } = await supabase
    .from("time_entries")
    .select("*")
    .gte("started_at", start.toISOString())
    .lt("started_at", end.toISOString())
    .order("started_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

// Hooks

// Hook to sync active timer with Zustand store
export function useActiveTimer() {
  // Use selectors to avoid re-renders from elapsedSeconds changes during sync
  const activeTimer = useTimerStore((state) => state.activeTimer);
  const elapsedSeconds = useTimerStore((state) => state.elapsedSeconds);
  const isLoading = useTimerStore((state) => state.isLoading);
  const setActiveTimer = useTimerStore((state) => state.setActiveTimer);
  const setIsLoading = useTimerStore((state) => state.setIsLoading);
  const startLocalTimer = useTimerStore((state) => state.startLocalTimer);
  const stopLocalTimer = useTimerStore((state) => state.stopLocalTimer);

  const query = useQuery({
    queryKey: timerKeys.active(),
    queryFn: fetchActiveTimer,
    refetchOnWindowFocus: true,
    staleTime: 0, // Always refetch to ensure sync
  });

  // Sync query data with Zustand store
  useEffect(() => {
    if (query.isLoading) {
      setIsLoading(true);
      return;
    }

    setIsLoading(false);

    if (query.data) {
      setActiveTimer(query.data);
      startLocalTimer();
    } else {
      setActiveTimer(null);
      stopLocalTimer();
    }

    return () => {
      stopLocalTimer();
    };
  }, [query.data, query.isLoading, setActiveTimer, setIsLoading, startLocalTimer, stopLocalTimer]);

  return {
    ...query,
    activeTimer,
    elapsedSeconds,
    isTimerLoading: isLoading,
  };
}

// Hook to start timer
export function useStartTimer() {
  const queryClient = useQueryClient();
  const stopLocalTimer = useTimerStore((state) => state.stopLocalTimer);

  return useMutation({
    mutationFn: startTimer,
    onMutate: async () => {
      // Optimistically stop any running timer visually
      stopLocalTimer();
    },
    onSuccess: async () => {
      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey: timerKeys.active() });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
    onError: () => {
      // Refetch to get correct state
      queryClient.invalidateQueries({ queryKey: timerKeys.active() });
    },
  });
}

// Hook to stop timer
export function useStopTimer() {
  const queryClient = useQueryClient();
  const stopLocalTimer = useTimerStore((state) => state.stopLocalTimer);
  const setActiveTimer = useTimerStore((state) => state.setActiveTimer);

  return useMutation({
    mutationFn: stopTimer,
    onMutate: async () => {
      // Optimistically stop timer visually
      stopLocalTimer();
      setActiveTimer(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timerKeys.active() });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
    onError: () => {
      // Refetch to get correct state
      queryClient.invalidateQueries({ queryKey: timerKeys.active() });
    },
  });
}

// Hook to get time entries for a task
export function useTimeEntriesByTask(taskId: string) {
  return useQuery({
    queryKey: timerKeys.entriesByTask(taskId),
    queryFn: () => fetchTimeEntriesByTask(taskId),
    enabled: !!taskId,
  });
}

export function useTimeEntriesByDate(date: Date) {
  const dateKey = format(date, "yyyy-MM-dd");

  return useQuery({
    queryKey: timerKeys.entriesByDate(dateKey),
    queryFn: () => fetchTimeEntriesByDate(date),
  });
}

// Hook to delete a time entry
export function useDeleteTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTimeEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timerKeys.entries() });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

// Convenience hook for timer controls
export function useTimerControls() {
  // Use selectors to avoid re-renders from unrelated state changes
  const activeTimer = useTimerStore((state) => state.activeTimer);
  const elapsedSeconds = useTimerStore((state) => state.elapsedSeconds);
  const isLoading = useTimerStore((state) => state.isLoading);
  const startTimerMutation = useStartTimer();
  const stopTimerMutation = useStopTimer();

  const handleStartTimer = useCallback(
    (taskId: string) => {
      startTimerMutation.mutate(taskId);
    },
    [startTimerMutation]
  );

  const handleStopTimer = useCallback(() => {
    stopTimerMutation.mutate();
  }, [stopTimerMutation]);

  const handleToggleTimer = useCallback(
    (taskId: string) => {
      if (activeTimer?.taskId === taskId) {
        handleStopTimer();
      } else {
        handleStartTimer(taskId);
      }
    },
    [activeTimer, handleStartTimer, handleStopTimer]
  );

  return {
    activeTimer,
    elapsedSeconds,
    isLoading,
    isStarting: startTimerMutation.isPending,
    isStopping: stopTimerMutation.isPending,
    startTimer: handleStartTimer,
    stopTimer: handleStopTimer,
    toggleTimer: handleToggleTimer,
    isTimerRunningForTask: (taskId: string) =>
      activeTimer?.taskId === taskId,
  };
}
