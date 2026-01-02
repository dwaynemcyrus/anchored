"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { subDays, addDays, differenceInDays, format } from "date-fns";
import type { Task, Project, Habit } from "@/types/database";
import { taskKeys } from "./use-tasks";
import { projectKeys } from "./use-projects";
import { habitKeys } from "./use-habits";

// Types for logbook items
export type LogbookState = "completed" | "deleted";
export type LogbookEntityType = "task" | "project" | "habit";

export type LogbookTask = Task & {
  entityType: "task";
  logbookDate: string; // completed_at or deleted_at
  daysUntilPurge?: number; // Only for deleted items
};

export type LogbookProject = Project & {
  entityType: "project";
  logbookDate: string;
  daysUntilPurge?: number;
};

export type LogbookHabit = Habit & {
  entityType: "habit";
  logbookDate: string;
  daysUntilPurge?: number;
};

export type LogbookItem = LogbookTask | LogbookProject | LogbookHabit;

export interface LogbookFilters {
  state: LogbookState;
  dateRange: { from: Date; to: Date };
  entityTypes?: LogbookEntityType[];
}

// Query keys
export const logbookKeys = {
  all: ["logbook"] as const,
  lists: () => [...logbookKeys.all, "list"] as const,
  list: (filters: LogbookFilters) => [...logbookKeys.lists(), filters] as const,
};

const PURGE_DAYS = 60;

// Calculate days until purge for deleted items
function calculateDaysUntilPurge(deletedAt: string): number {
  const purgeDate = addDays(new Date(deletedAt), PURGE_DAYS);
  return Math.max(0, differenceInDays(purgeDate, new Date()));
}

// Fetch logbook items
async function fetchLogbookItems(
  filters: LogbookFilters
): Promise<LogbookItem[]> {
  const supabase = createClient();
  const { state, dateRange, entityTypes } = filters;
  const items: LogbookItem[] = [];

  const fromStr = format(dateRange.from, "yyyy-MM-dd'T'00:00:00");
  const toStr = format(dateRange.to, "yyyy-MM-dd'T'23:59:59");

  const shouldFetch = (type: LogbookEntityType) =>
    !entityTypes || entityTypes.includes(type);

  // Fetch tasks
  if (shouldFetch("task")) {
    let taskQuery = supabase.from("tasks").select("*");

    if (state === "completed") {
      taskQuery = taskQuery
        .not("completed_at", "is", null)
        .is("deleted_at", null)
        .gte("completed_at", fromStr)
        .lte("completed_at", toStr);
    } else {
      // deleted
      taskQuery = taskQuery
        .not("deleted_at", "is", null)
        .gte("deleted_at", fromStr)
        .lte("deleted_at", toStr);
    }

    const { data: tasks, error: tasksError } = await taskQuery;
    if (tasksError) throw new Error(tasksError.message);

    tasks?.forEach((task) => {
      const logbookDate =
        state === "completed" ? task.completed_at! : task.deleted_at!;
      items.push({
        ...task,
        entityType: "task",
        logbookDate,
        daysUntilPurge:
          state === "deleted"
            ? calculateDaysUntilPurge(task.deleted_at!)
            : undefined,
      });
    });
  }

  // Fetch projects
  if (shouldFetch("project")) {
    let projectQuery = supabase.from("projects").select("*");

    if (state === "completed") {
      projectQuery = projectQuery
        .not("completed_at", "is", null)
        .is("deleted_at", null)
        .gte("completed_at", fromStr)
        .lte("completed_at", toStr);
    } else {
      // deleted
      projectQuery = projectQuery
        .not("deleted_at", "is", null)
        .gte("deleted_at", fromStr)
        .lte("deleted_at", toStr);
    }

    const { data: projects, error: projectsError } = await projectQuery;
    if (projectsError) throw new Error(projectsError.message);

    projects?.forEach((project) => {
      const logbookDate =
        state === "completed" ? project.completed_at! : project.deleted_at!;
      items.push({
        ...project,
        entityType: "project",
        logbookDate,
        daysUntilPurge:
          state === "deleted"
            ? calculateDaysUntilPurge(project.deleted_at!)
            : undefined,
      });
    });
  }

  // Fetch habits (only deleted - habits don't have completed_at)
  if (shouldFetch("habit") && state === "deleted") {
    const { data: habits, error: habitsError } = await supabase
      .from("habits")
      .select("*")
      .not("deleted_at", "is", null)
      .gte("deleted_at", fromStr)
      .lte("deleted_at", toStr);

    if (habitsError) throw new Error(habitsError.message);

    habits?.forEach((habit) => {
      items.push({
        ...habit,
        entityType: "habit",
        logbookDate: habit.deleted_at!,
        daysUntilPurge: calculateDaysUntilPurge(habit.deleted_at!),
      });
    });
  }

  // Sort by logbook date, newest first
  items.sort(
    (a, b) =>
      new Date(b.logbookDate).getTime() - new Date(a.logbookDate).getTime()
  );

  return items;
}

// Default date range: last 30 days
function getDefaultDateRange(): { from: Date; to: Date } {
  return {
    from: subDays(new Date(), 30),
    to: new Date(),
  };
}

// Hook: Fetch logbook items
export function useLogbookItems(
  filters: Partial<LogbookFilters> & { state: LogbookState }
) {
  const fullFilters: LogbookFilters = {
    state: filters.state,
    dateRange: filters.dateRange || getDefaultDateRange(),
    entityTypes: filters.entityTypes,
  };

  // Serialize dates for stable query key (use date-only format since query uses date boundaries)
  const queryKey = [
    ...logbookKeys.lists(),
    {
      state: fullFilters.state,
      from: format(fullFilters.dateRange.from, "yyyy-MM-dd"),
      to: format(fullFilters.dateRange.to, "yyyy-MM-dd"),
      entityTypes: fullFilters.entityTypes,
    },
  ];

  return useQuery({
    queryKey,
    queryFn: () => fetchLogbookItems(fullFilters),
  });
}

// ============================================
// RESTORE MUTATIONS
// ============================================

// Restore completed task
async function restoreCompletedTask(taskId: string): Promise<{
  restored: boolean;
  movedToInbox: boolean;
}> {
  const supabase = createClient();

  // Fetch task to check project
  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("project_id")
    .eq("id", taskId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  let movedToInbox = false;
  let projectId = task.project_id;
  let taskLocation: "inbox" | "project" = projectId ? "project" : "inbox";

  // Check if project exists and is not deleted/completed
  if (projectId) {
    const { data: project } = await supabase
      .from("projects")
      .select("id, deleted_at, completed_at")
      .eq("id", projectId)
      .single();

    if (!project || project.deleted_at || project.completed_at) {
      // Project missing or not active - move to inbox
      projectId = null;
      taskLocation = "inbox";
      movedToInbox = true;
    }
  }

  // Restore task
  const { error } = await supabase
    .from("tasks")
    .update({
      completed_at: null,
      status: "today",
      project_id: projectId,
      task_location: taskLocation,
    })
    .eq("id", taskId);

  if (error) throw new Error(error.message);

  return { restored: true, movedToInbox };
}

// Restore deleted task
async function restoreDeletedTask(taskId: string): Promise<{
  restored: boolean;
  movedToInbox: boolean;
}> {
  const supabase = createClient();

  // Fetch task
  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("project_id, deleted_at")
    .eq("id", taskId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  // Check if within 60-day window
  if (task.deleted_at) {
    const daysUntilPurge = calculateDaysUntilPurge(task.deleted_at);
    if (daysUntilPurge <= 0) {
      throw new Error("Task has been purged and cannot be restored");
    }
  }

  let movedToInbox = false;
  let projectId = task.project_id;
  let taskLocation: "inbox" | "project" = projectId ? "project" : "inbox";

  // Check if project exists and is not deleted
  if (projectId) {
    const { data: project } = await supabase
      .from("projects")
      .select("id, deleted_at")
      .eq("id", projectId)
      .single();

    if (!project || project.deleted_at) {
      projectId = null;
      taskLocation = "inbox";
      movedToInbox = true;
    }
  }

  // Restore task - clear all delete fields and completed_at (deletion supersedes completion)
  const { error } = await supabase
    .from("tasks")
    .update({
      deleted_at: null,
      deleted_reason: null,
      deleted_parent_id: null,
      completed_at: null,
      status: "today",
      project_id: projectId,
      task_location: taskLocation,
    })
    .eq("id", taskId);

  if (error) throw new Error(error.message);

  return { restored: true, movedToInbox };
}

// Restore completed project
async function restoreCompletedProject(
  projectId: string
): Promise<{ restored: boolean }> {
  const supabase = createClient();

  const { error } = await supabase
    .from("projects")
    .update({ completed_at: null })
    .eq("id", projectId);

  if (error) throw new Error(error.message);

  return { restored: true };
}

// Restore deleted project (with cascade)
async function restoreDeletedProject(projectId: string): Promise<{
  restored: boolean;
  tasksRestored: number;
}> {
  const supabase = createClient();

  // Fetch project
  const { data: project, error: fetchError } = await supabase
    .from("projects")
    .select("deleted_at")
    .eq("id", projectId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  // Check if within 60-day window
  if (project.deleted_at) {
    const daysUntilPurge = calculateDaysUntilPurge(project.deleted_at);
    if (daysUntilPurge <= 0) {
      throw new Error("Project has been purged and cannot be restored");
    }
  }

  // Restore project
  const { error: projectError } = await supabase
    .from("projects")
    .update({ deleted_at: null })
    .eq("id", projectId);

  if (projectError) throw new Error(projectError.message);

  // Restore cascade-deleted tasks (only those deleted by this project deletion)
  const { data: tasksToRestore, error: tasksQueryError } = await supabase
    .from("tasks")
    .select("id")
    .eq("deleted_parent_id", projectId)
    .eq("deleted_reason", "project_deleted");

  if (tasksQueryError) throw new Error(tasksQueryError.message);

  const taskIds = tasksToRestore?.map((t) => t.id) || [];

  if (taskIds.length > 0) {
    const { error: restoreTasksError } = await supabase
      .from("tasks")
      .update({
        deleted_at: null,
        deleted_reason: null,
        deleted_parent_id: null,
        completed_at: null,
        status: "today",
      })
      .in("id", taskIds);

    if (restoreTasksError) throw new Error(restoreTasksError.message);
  }

  return { restored: true, tasksRestored: taskIds.length };
}

// Restore deleted habit
async function restoreDeletedHabit(
  habitId: string
): Promise<{ restored: boolean }> {
  const supabase = createClient();

  // Fetch habit
  const { data: habit, error: fetchError } = await supabase
    .from("habits")
    .select("deleted_at")
    .eq("id", habitId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  // Check if within 60-day window
  if (habit.deleted_at) {
    const daysUntilPurge = calculateDaysUntilPurge(habit.deleted_at);
    if (daysUntilPurge <= 0) {
      throw new Error("Habit has been purged and cannot be restored");
    }
  }

  const { error } = await supabase
    .from("habits")
    .update({ deleted_at: null })
    .eq("id", habitId);

  if (error) throw new Error(error.message);

  return { restored: true };
}

// ============================================
// SOFT DELETE MUTATIONS
// ============================================

// Soft delete task
async function softDeleteTask(taskId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("tasks")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_reason: "user_deleted",
      is_now: false,
      now_slot: null,
    })
    .eq("id", taskId);

  if (error) throw new Error(error.message);
}

// Soft delete project (with cascade)
async function softDeleteProject(projectId: string): Promise<{
  tasksDeleted: number;
}> {
  const supabase = createClient();
  const now = new Date().toISOString();

  // Soft delete project
  const { error: projectError } = await supabase
    .from("projects")
    .update({ deleted_at: now })
    .eq("id", projectId);

  if (projectError) throw new Error(projectError.message);

  // Cascade soft delete to tasks (only active tasks)
  const { data: tasksToDelete, error: tasksQueryError } = await supabase
    .from("tasks")
    .select("id")
    .eq("project_id", projectId)
    .is("deleted_at", null);

  if (tasksQueryError) throw new Error(tasksQueryError.message);

  const taskIds = tasksToDelete?.map((t) => t.id) || [];

  if (taskIds.length > 0) {
    const { error: deleteTasksError } = await supabase
      .from("tasks")
      .update({
        deleted_at: now,
        deleted_reason: "project_deleted",
        deleted_parent_id: projectId,
        is_now: false,
        now_slot: null,
      })
      .in("id", taskIds);

    if (deleteTasksError) throw new Error(deleteTasksError.message);
  }

  return { tasksDeleted: taskIds.length };
}

// Soft delete habit
async function softDeleteHabit(habitId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("habits")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", habitId);

  if (error) throw new Error(error.message);
}

// Complete project
async function completeProject(projectId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("projects")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", projectId);

  if (error) throw new Error(error.message);
}

// ============================================
// HARD DELETE MUTATIONS (Permanent)
// ============================================

async function hardDeleteTask(taskId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from("tasks").delete().eq("id", taskId);

  if (error) throw new Error(error.message);
}

async function hardDeleteProject(projectId: string): Promise<void> {
  const supabase = createClient();

  // Delete tasks first (or set project_id to null)
  const { error: tasksError } = await supabase
    .from("tasks")
    .delete()
    .eq("project_id", projectId);

  if (tasksError) throw new Error(tasksError.message);

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);

  if (error) throw new Error(error.message);
}

async function hardDeleteHabit(habitId: string): Promise<void> {
  const supabase = createClient();

  // Delete habit entries first
  const { error: entriesError } = await supabase
    .from("habit_entries")
    .delete()
    .eq("habit_id", habitId);

  if (entriesError) throw new Error(entriesError.message);

  const { error } = await supabase.from("habits").delete().eq("id", habitId);

  if (error) throw new Error(error.message);
}

// ============================================
// MUTATION HOOKS
// ============================================

export function useRestoreCompletedTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: restoreCompletedTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logbookKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useRestoreDeletedTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: restoreDeletedTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logbookKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useRestoreCompletedProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: restoreCompletedProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logbookKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

export function useRestoreDeletedProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: restoreDeletedProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logbookKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useRestoreDeletedHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: restoreDeletedHabit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logbookKeys.lists() });
      queryClient.invalidateQueries({ queryKey: habitKeys.lists() });
    },
  });
}

export function useSoftDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: softDeleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: logbookKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

export function useSoftDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: softDeleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: logbookKeys.lists() });
    },
  });
}

export function useSoftDeleteHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: softDeleteHabit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: habitKeys.lists() });
      queryClient.invalidateQueries({ queryKey: logbookKeys.lists() });
    },
  });
}

export function useCompleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: completeProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: logbookKeys.lists() });
    },
  });
}

export function useHardDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: hardDeleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logbookKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useHardDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: hardDeleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logbookKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useHardDeleteHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: hardDeleteHabit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logbookKeys.lists() });
      queryClient.invalidateQueries({ queryKey: habitKeys.lists() });
    },
  });
}

// Generic restore function based on item type and state
export function useRestoreLogbookItem() {
  const restoreCompletedTask = useRestoreCompletedTask();
  const restoreDeletedTask = useRestoreDeletedTask();
  const restoreCompletedProject = useRestoreCompletedProject();
  const restoreDeletedProject = useRestoreDeletedProject();
  const restoreDeletedHabit = useRestoreDeletedHabit();

  return {
    mutate: (item: LogbookItem, state: LogbookState) => {
      if (item.entityType === "task") {
        if (state === "completed") {
          restoreCompletedTask.mutate(item.id);
        } else {
          restoreDeletedTask.mutate(item.id);
        }
      } else if (item.entityType === "project") {
        if (state === "completed") {
          restoreCompletedProject.mutate(item.id);
        } else {
          restoreDeletedProject.mutate(item.id);
        }
      } else if (item.entityType === "habit") {
        // Habits can only be deleted, not completed
        restoreDeletedHabit.mutate(item.id);
      }
    },
    isPending:
      restoreCompletedTask.isPending ||
      restoreDeletedTask.isPending ||
      restoreCompletedProject.isPending ||
      restoreDeletedProject.isPending ||
      restoreDeletedHabit.isPending,
  };
}

// Generic hard delete function
export function useHardDeleteLogbookItem() {
  const hardDeleteTask = useHardDeleteTask();
  const hardDeleteProject = useHardDeleteProject();
  const hardDeleteHabit = useHardDeleteHabit();

  return {
    mutate: (item: LogbookItem) => {
      if (item.entityType === "task") {
        hardDeleteTask.mutate(item.id);
      } else if (item.entityType === "project") {
        hardDeleteProject.mutate(item.id);
      } else if (item.entityType === "habit") {
        hardDeleteHabit.mutate(item.id);
      }
    },
    isPending:
      hardDeleteTask.isPending ||
      hardDeleteProject.isPending ||
      hardDeleteHabit.isPending,
  };
}
