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
  accumulated_seconds: number;
  paused_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface TimeEntrySegment {
  id: string;
  time_entry_id: string;
  owner_id: string;
  task_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  created_at: string;
}

export interface TimeEntryDailyTotal {
  id: string;
  owner_id: string;
  task_id: string;
  entry_date: string;
  total_seconds: number;
  updated_at: string;
}
export interface TimeEntryWithTask extends TimeEntry {
  task: Pick<Task, "id" | "title"> & {
    project: Pick<Project, "id" | "title"> | null;
  };
}

type StopTimerInput = {
  notes?: string | null;
};

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
      accumulated_seconds,
      paused_at,
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
    accumulatedSeconds: data.accumulated_seconds || 0,
    isPaused: Boolean(data.paused_at),
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
    .select("id, started_at, accumulated_seconds, paused_at")
    .is("ended_at", null)
    .single();

  if (existing) {
    await stopTimer();
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

  const { error: segmentError } = await supabase.from("time_entry_segments").insert({
    owner_id: user.id,
    time_entry_id: data.id,
    task_id: data.task_id,
    started_at: data.started_at,
  });

  if (segmentError) {
    console.error("Failed to create time entry segment:", segmentError.message, segmentError.code, segmentError.details);
    throw new Error(segmentError.message);
  }

  return data;
}

async function addDailyTotalsForSegment(
  supabase: ReturnType<typeof createClient>,
  ownerId: string,
  taskId: string,
  segmentStart: Date,
  segmentEnd: Date
) {
  const start = startOfDay(segmentStart);
  const end = startOfDay(segmentEnd);
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.max(0, Math.floor((end.getTime() - start.getTime()) / dayMs));

  for (let i = 0; i <= days; i += 1) {
    const dayStart = new Date(start.getTime() + i * dayMs);
    const dayEnd = new Date(dayStart.getTime() + dayMs);
    const overlapStart = Math.max(dayStart.getTime(), segmentStart.getTime());
    const overlapEnd = Math.min(dayEnd.getTime(), segmentEnd.getTime());
    const overlapSeconds = Math.max(
      0,
      Math.floor((overlapEnd - overlapStart) / 1000)
    );

    if (overlapSeconds === 0) {
      continue;
    }

    const entryDate = format(dayStart, "yyyy-MM-dd");

    const { data: existing, error: existingError } = await supabase
      .from("time_entry_daily_totals")
      .select("id, total_seconds")
      .eq("owner_id", ownerId)
      .eq("task_id", taskId)
      .eq("entry_date", entryDate)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from("time_entry_daily_totals")
        .update({
          total_seconds: existing.total_seconds + overlapSeconds,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateError) {
        throw new Error(updateError.message);
      }
    } else {
      const { error: insertError } = await supabase
        .from("time_entry_daily_totals")
        .insert({
          owner_id: ownerId,
          task_id: taskId,
          entry_date: entryDate,
          total_seconds: overlapSeconds,
        });

      if (insertError) {
        throw new Error(insertError.message);
      }
    }
  }
}

// Stop current timer
async function stopTimer({ notes }: StopTimerInput = {}): Promise<TimeEntry | null> {
  const supabase = createClient();

  const { data: existing } = await supabase
    .from("time_entries")
    .select("id, started_at, accumulated_seconds, paused_at, owner_id, task_id")
    .is("ended_at", null)
    .single();

  if (!existing) {
    return null;
  }

  const now = new Date();
  const { data: activeSegment } = await supabase
    .from("time_entry_segments")
    .select("id, started_at")
    .eq("time_entry_id", existing.id)
    .is("ended_at", null)
    .single();

  if (activeSegment) {
    const segmentSeconds = Math.floor(
      (now.getTime() - new Date(activeSegment.started_at).getTime()) / 1000
    );
    await supabase
      .from("time_entry_segments")
      .update({
        ended_at: now.toISOString(),
        duration_seconds: segmentSeconds,
      })
      .eq("id", activeSegment.id);

    await addDailyTotalsForSegment(
      supabase,
      existing.owner_id,
      existing.task_id,
      new Date(activeSegment.started_at),
      now
    );
  }

  const { data: segments } = await supabase
    .from("time_entry_segments")
    .select("duration_seconds")
    .eq("time_entry_id", existing.id);

  const duration =
    segments?.reduce((sum, segment) => sum + (segment.duration_seconds || 0), 0) ||
    0;

  const updateFields: Partial<TimeEntry> = {
    ended_at: new Date().toISOString(),
    duration_seconds: duration,
    accumulated_seconds: duration,
    paused_at: null,
  };

  if (notes !== undefined) {
    updateFields.notes = notes?.trim() ? notes.trim() : null;
  }

  const { data, error } = await supabase
    .from("time_entries")
    .update(updateFields)
    .eq("id", existing.id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Pause current timer
async function pauseTimer(): Promise<TimeEntry | null> {
  const supabase = createClient();

  const { data: existing, error: existingError } = await supabase
    .from("time_entries")
    .select("id, started_at, accumulated_seconds, paused_at, owner_id, task_id")
    .is("ended_at", null)
    .is("paused_at", null)
    .single();

  if (existingError || !existing) {
    return null;
  }

  const now = new Date();

  // Calculate time from the current session (since started_at)
  const currentSessionSeconds = Math.floor(
    (now.getTime() - new Date(existing.started_at).getTime()) / 1000
  );

  const { data: activeSegment, error: segmentError } = await supabase
    .from("time_entry_segments")
    .select("id, started_at")
    .eq("time_entry_id", existing.id)
    .is("ended_at", null)
    .maybeSingle();

  if (segmentError) {
    console.error("Failed to fetch active segment:", segmentError.message, segmentError.code);
  }

  if (activeSegment) {
    const segmentSeconds = Math.floor(
      (now.getTime() - new Date(activeSegment.started_at).getTime()) / 1000
    );
    const { error: updateError } = await supabase
      .from("time_entry_segments")
      .update({
        ended_at: now.toISOString(),
        duration_seconds: segmentSeconds,
      })
      .eq("id", activeSegment.id);

    if (updateError) {
      console.error("Failed to update segment:", updateError.message, updateError.code);
    }

    await addDailyTotalsForSegment(
      supabase,
      existing.owner_id,
      existing.task_id,
      new Date(activeSegment.started_at),
      now
    );
  }

  const { data: segments, error: segmentsError } = await supabase
    .from("time_entry_segments")
    .select("duration_seconds")
    .eq("time_entry_id", existing.id);

  if (segmentsError) {
    console.error("Failed to fetch segments:", segmentsError.message, segmentsError.code);
  }

  // Calculate accumulated: sum of segment durations, or fallback to current session time
  const segmentTotal = segments?.reduce(
    (sum, segment) => sum + (segment.duration_seconds || 0), 0
  ) || 0;

  // Use the greater of: existing accumulated + current session, or segment total
  // This ensures we don't lose time if segments aren't working
  const newAccumulated = Math.max(
    segmentTotal,
    (existing.accumulated_seconds || 0) + currentSessionSeconds
  );

  const { data, error } = await supabase
    .from("time_entries")
    .update({
      accumulated_seconds: newAccumulated,
      paused_at: now.toISOString(),
    })
    .eq("id", existing.id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Resume paused timer
async function resumeTimer(): Promise<TimeEntry | null> {
  const supabase = createClient();

  const { data: existing } = await supabase
    .from("time_entries")
    .select("id, paused_at, owner_id")
    .is("ended_at", null)
    .not("paused_at", "is", null)
    .single();

  if (!existing) {
    return null;
  }

  const { data, error } = await supabase
    .from("time_entries")
    .update({
      started_at: new Date().toISOString(),
      paused_at: null,
    })
    .eq("id", existing.id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const { error: segmentError } = await supabase.from("time_entry_segments").insert({
    owner_id: existing.owner_id,
    time_entry_id: existing.id,
    task_id: data.task_id,
    started_at: data.started_at,
  });

  if (segmentError) {
    console.error("Failed to create resume segment:", segmentError.message, segmentError.code);
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
    .lt("started_at", end.toISOString())
    .or(`ended_at.is.null,ended_at.gte.${start.toISOString()}`)
    .order("started_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

async function fetchTimeEntrySegmentsByDate(date: Date): Promise<TimeEntrySegment[]> {
  const supabase = createClient();
  const start = startOfDay(date);
  const end = addDays(start, 1);

  const { data, error } = await supabase
    .from("time_entry_segments")
    .select("*")
    .lt("started_at", end.toISOString())
    .or(`ended_at.is.null,ended_at.gte.${start.toISOString()}`)
    .order("started_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

async function fetchDailyTotalsByDate(
  date: Date
): Promise<TimeEntryDailyTotal[]> {
  const supabase = createClient();
  const entryDate = format(date, "yyyy-MM-dd");

  const { data, error } = await supabase
    .from("time_entry_daily_totals")
    .select("*")
    .eq("entry_date", entryDate);

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

// Fetch recent completed time entries for Focus Record
async function fetchRecentTimeEntries(limit = 50): Promise<TimeEntryWithTask[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("time_entries")
    .select(`
      id,
      task_id,
      started_at,
      ended_at,
      duration_seconds,
      accumulated_seconds,
      paused_at,
      notes,
      created_at,
      task:tasks(id, title, project:projects(id, title))
    `)
    .not("ended_at", "is", null)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((entry) => ({
    ...entry,
    task: entry.task as unknown as TimeEntryWithTask["task"],
  }));
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
      if (!query.data.isPaused) {
        startLocalTimer();
      } else {
        stopLocalTimer();
      }
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
      queryClient.invalidateQueries({ queryKey: timerKeys.entries() });
      queryClient.invalidateQueries({ queryKey: ["timer", "segments"] });
      queryClient.invalidateQueries({ queryKey: ["timer", "daily"] });
    },
    onError: () => {
      // Refetch to get correct state
      queryClient.invalidateQueries({ queryKey: timerKeys.active() });
    },
  });
}

// Hook to pause timer
export function usePauseTimer() {
  const queryClient = useQueryClient();
  const stopLocalTimer = useTimerStore((state) => state.stopLocalTimer);

  return useMutation({
    mutationFn: pauseTimer,
    onMutate: async () => {
      stopLocalTimer();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: timerKeys.active() });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: timerKeys.entries() });
      queryClient.invalidateQueries({ queryKey: ["timer", "segments"] });
      queryClient.invalidateQueries({ queryKey: ["timer", "daily"] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: timerKeys.active() });
    },
  });
}

// Hook to resume timer
export function useResumeTimer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resumeTimer,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: timerKeys.active() });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: timerKeys.entries() });
      queryClient.invalidateQueries({ queryKey: ["timer", "segments"] });
      queryClient.invalidateQueries({ queryKey: ["timer", "daily"] });
    },
    onError: () => {
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
      queryClient.invalidateQueries({ queryKey: timerKeys.entries() });
      queryClient.invalidateQueries({ queryKey: ["timer", "segments"] });
      queryClient.invalidateQueries({ queryKey: ["timer", "daily"] });
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

export function useTimeEntrySegmentsByDate(date: Date) {
  const dateKey = format(date, "yyyy-MM-dd");

  return useQuery({
    queryKey: ["timer", "segments", dateKey],
    queryFn: () => fetchTimeEntrySegmentsByDate(date),
  });
}

export function useDailyTotalsByDate(date: Date) {
  const dateKey = format(date, "yyyy-MM-dd");

  return useQuery({
    queryKey: ["timer", "daily", dateKey],
    queryFn: () => fetchDailyTotalsByDate(date),
  });
}

// Hook to get recent completed time entries for Focus Record
export function useRecentTimeEntries(limit = 50) {
  return useQuery({
    queryKey: ["timer", "recent", limit],
    queryFn: () => fetchRecentTimeEntries(limit),
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
  const pauseTimerMutation = usePauseTimer();
  const resumeTimerMutation = useResumeTimer();
  const stopTimerMutation = useStopTimer();
  const isPaused = activeTimer?.isPaused ?? false;

  const handleStartTimer = useCallback(
    (taskId: string) => {
      startTimerMutation.mutate(taskId);
    },
    [startTimerMutation]
  );

  const handleStopTimer = useCallback(() => {
    stopTimerMutation.mutate({});
  }, [stopTimerMutation]);

  const handleStopTimerWithNotes = useCallback(
    (notes?: string | null) => stopTimerMutation.mutateAsync({ notes }),
    [stopTimerMutation]
  );

  const handlePauseTimer = useCallback(() => {
    pauseTimerMutation.mutate();
  }, [pauseTimerMutation]);

  const handleResumeTimer = useCallback(() => {
    resumeTimerMutation.mutate();
  }, [resumeTimerMutation]);

  const handleToggleTimer = useCallback(
    (taskId: string) => {
      if (activeTimer?.taskId === taskId) {
        if (activeTimer.isPaused) {
          handleResumeTimer();
        } else {
          handlePauseTimer();
        }
      } else {
        handleStartTimer(taskId);
      }
    },
    [activeTimer, handleResumeTimer, handleStartTimer, handlePauseTimer]
  );

  return {
    activeTimer,
    elapsedSeconds,
    isLoading,
    isStarting: startTimerMutation.isPending,
    isPausing: pauseTimerMutation.isPending,
    isResuming: resumeTimerMutation.isPending,
    isStopping: stopTimerMutation.isPending,
    startTimer: handleStartTimer,
    pauseTimer: handlePauseTimer,
    resumeTimer: handleResumeTimer,
    stopTimer: handleStopTimer,
    stopTimerWithNotes: handleStopTimerWithNotes,
    toggleTimer: handleToggleTimer,
    isPaused,
    isTimerRunningForTask: (taskId: string) =>
      activeTimer?.taskId === taskId && !activeTimer.isPaused,
  };
}
