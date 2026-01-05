"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { addDays, format, startOfDay } from "date-fns";
import type {
  Task,
  TaskInsert,
  TaskUpdate,
  TaskStatus,
  TaskLocation,
  Project,
} from "@/types/database";
import { projectKeys } from "./use-projects";

// Extended task type with project info and time tracked
export type TaskWithDetails = Task & {
  project?: Pick<Project, "id" | "title"> | null;
  time_tracked_seconds: number;
};

type TaskFilters = {
  projectId?: string;
  status?: TaskStatus | TaskStatus[];
  taskLocation?: TaskLocation | TaskLocation[];
  excludeStatus?: TaskStatus | TaskStatus[];
  dueIsNull?: boolean;
  dueFrom?: string;
  dueTo?: string;
  excludeDone?: boolean;
  isNow?: boolean;
  nextTask?: boolean;
  nowSlot?: "primary" | "secondary" | Array<"primary" | "secondary">;
};

function isCompletedStatus(status: TaskStatus | null | undefined) {
  return status === "done" || status === "cancel";
}

async function insertTaskActivity({
  supabase,
  projectId,
  ownerId,
  action,
}: {
  supabase: ReturnType<typeof createClient>;
  projectId: string;
  ownerId: string;
  action: "task_completed" | "task_cancelled";
}) {
  const { error } = await supabase.from("project_activity").insert({
    project_id: projectId,
    owner_id: ownerId,
    action,
    reason: null,
  });

  if (error) {
    throw new Error(error.message);
  }
}

// Query keys
export const taskKeys = {
  all: ["tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) =>
    [...taskKeys.lists(), filters] as const,
  byProject: (projectId: string) =>
    [...taskKeys.lists(), { projectId }] as const,
  byStatus: (status: TaskStatus) =>
    [...taskKeys.lists(), { status }] as const,
  details: () => [...taskKeys.all, "detail"] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
};

// Fetch tasks with optional filters
async function fetchTasks(filters?: TaskFilters): Promise<TaskWithDetails[]> {
  const supabase = createClient();

  // Step 1: Fetch tasks (no join to avoid column ambiguity with deleted_at)
  let query = supabase
    .from("tasks")
    .select("*")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (filters?.projectId) {
    query = query.eq("project_id", filters.projectId);
  }

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in("status", filters.status);
    } else {
      query = query.eq("status", filters.status);
    }
  }

  if (filters?.taskLocation) {
    if (Array.isArray(filters.taskLocation)) {
      query = query.in("task_location", filters.taskLocation);
    } else {
      query = query.eq("task_location", filters.taskLocation);
    }
  }

  if (filters?.excludeStatus) {
    if (Array.isArray(filters.excludeStatus)) {
      const valueList = filters.excludeStatus
        .map((status) => `"${status}"`)
        .join(",");
      query = query.not("status", "in", `(${valueList})`);
    } else {
      query = query.neq("status", filters.excludeStatus);
    }
  }

  if (filters?.excludeDone) {
    query = query.not("status", "in", "(done,cancel)");
  }

  if (filters?.isNow !== undefined) {
    query = query.eq("is_now", filters.isNow);
  }

  if (filters?.nextTask !== undefined) {
    query = query.eq("next_task", filters.nextTask);
  }

  if (filters?.nowSlot) {
    if (Array.isArray(filters.nowSlot)) {
      query = query.in("now_slot", filters.nowSlot);
    } else {
      query = query.eq("now_slot", filters.nowSlot);
    }
  }

  if (filters?.dueIsNull) {
    query = query.is("due_date", null);
  }

  if (filters?.dueFrom || filters?.dueTo) {
    query = query.not("due_date", "is", null);
  }

  if (filters?.dueFrom) {
    query = query.gte("due_date", filters.dueFrom);
  }

  if (filters?.dueTo) {
    query = query.lte("due_date", filters.dueTo);
  }

  const { data: tasks, error: tasksError } = await query;

  if (tasksError) {
    throw new Error(tasksError.message);
  }

  if (!tasks || tasks.length === 0) {
    return [];
  }

  const taskIds = tasks.map((t) => t.id);

  // Step 2: Batch fetch projects for tasks that have project_id
  const projectIds = [...new Set(tasks.map((t) => t.project_id).filter(Boolean))] as string[];
  const projectMap = new Map<string, Pick<Project, "id" | "title">>();

  if (projectIds.length > 0) {
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("id, title")
      .in("id", projectIds);

    if (projectsError) {
      throw new Error(projectsError.message);
    }

    projects?.forEach((p) => {
      projectMap.set(p.id, { id: p.id, title: p.title });
    });
  }

  // Step 3: Fetch time entries for these tasks
  const { data: timeEntries, error: timeError } = await supabase
    .from("time_entries")
    .select("task_id, duration_seconds")
    .in("task_id", taskIds)
    .not("duration_seconds", "is", null);

  if (timeError) {
    throw new Error(timeError.message);
  }

  // Sum time per task
  const timeMap = new Map<string, number>();
  timeEntries?.forEach((entry) => {
    const current = timeMap.get(entry.task_id) || 0;
    timeMap.set(entry.task_id, current + (entry.duration_seconds || 0));
  });

  // Step 4: Merge results
  return tasks.map((task) => ({
    ...task,
    project: task.project_id ? projectMap.get(task.project_id) ?? null : null,
    time_tracked_seconds: timeMap.get(task.id) || 0,
  }));
}

// Fetch single task
async function fetchTask(id: string): Promise<TaskWithDetails> {
  const supabase = createClient();

  // Step 1: Fetch task (no join to avoid column ambiguity with deleted_at)
  const { data: task, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // Step 2: Fetch project if task has project_id
  let project: Pick<Project, "id" | "title"> | null = null;
  if (task.project_id) {
    const { data: projectData } = await supabase
      .from("projects")
      .select("id, title")
      .eq("id", task.project_id)
      .single();

    if (projectData) {
      project = { id: projectData.id, title: projectData.title };
    }
  }

  // Step 3: Fetch time entries
  const { data: timeEntries } = await supabase
    .from("time_entries")
    .select("duration_seconds")
    .eq("task_id", id)
    .not("duration_seconds", "is", null);

  const totalTime =
    timeEntries?.reduce((sum, e) => sum + (e.duration_seconds || 0), 0) || 0;

  return {
    ...task,
    project,
    time_tracked_seconds: totalTime,
  };
}

// Create task
async function createTask(
  task: Omit<TaskInsert, "owner_id">
): Promise<Task> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...task, owner_id: user.id })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Update task
async function updateTask({
  id,
  ...updates
}: TaskUpdate & { id: string }): Promise<Task> {
  const supabase = createClient();
  let projectIdToLog: string | null = null;
  let activityAction: "task_completed" | "task_cancelled" | null = null;

  if (updates.status === "done" || updates.status === "cancel") {
    const { data: currentTask, error: currentError } = await supabase
      .from("tasks")
      .select("status, project_id")
      .eq("id", id)
      .single();

    if (currentError) {
      throw new Error(currentError.message);
    }

    if (
      currentTask.project_id &&
      currentTask.status !== updates.status
    ) {
      projectIdToLog = currentTask.project_id;
      activityAction =
        updates.status === "done" ? "task_completed" : "task_cancelled";
    }
  }

  // If marking as done, set completed_at
  if (updates.status && isCompletedStatus(updates.status) && !updates.completed_at) {
    updates.completed_at = new Date().toISOString();
  }
  // If unmarking from done, clear completed_at
  if (updates.status && !isCompletedStatus(updates.status)) {
    updates.completed_at = null;
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (projectIdToLog && activityAction) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await insertTaskActivity({
        supabase,
        projectId: projectIdToLog,
        ownerId: user.id,
        action: activityAction,
      });
    }
  }

  return data;
}

// Soft delete task (moves to logbook)
async function deleteTask(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("tasks")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_reason: "user_deleted",
      is_now: false,
      now_slot: null,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

// Hooks

export function useTasks(filters?: {
  projectId?: string;
  status?: TaskStatus | TaskStatus[];
  taskLocation?: TaskLocation | TaskLocation[];
  excludeStatus?: TaskStatus | TaskStatus[];
}) {
  return useQuery({
    queryKey: taskKeys.list(filters || {}),
    queryFn: () => fetchTasks(filters),
  });
}

function formatDueDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function useScheduledTasks(options?: { from?: Date; to?: Date }) {
  const from = options?.from ?? addDays(startOfDay(new Date()), 1);
  const to = options?.to;

  const filters: TaskFilters = {
    dueFrom: formatDueDate(from),
    dueTo: to ? formatDueDate(to) : undefined,
    excludeDone: true,
  };

  return useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: () => fetchTasks(filters),
  });
}

export function useAnytimeTasks() {
  const filters: TaskFilters = {
    taskLocation: "anytime",
    dueIsNull: true,
    excludeStatus: ["done", "cancel", "active"],
  };

  return useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: () => fetchTasks(filters),
  });
}

export function useNextTasks() {
  const filters: TaskFilters = {
    nextTask: true,
    taskLocation: "anytime",
    excludeStatus: ["done", "cancel"],
  };

  return useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: () => fetchTasks(filters),
  });
}

export function useNowTasks() {
  const filters: TaskFilters = { nowSlot: ["primary", "secondary"] };

  return useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: () => fetchTasks(filters),
  });
}

function getTomorrowDueDate(): string {
  return formatDueDate(addDays(startOfDay(new Date()), 1));
}

export function useMoveTaskToTomorrow() {
  const updateTask = useUpdateTask();

  return {
    ...updateTask,
    mutate: (task: TaskWithDetails | string) => {
      const taskId = typeof task === "string" ? task : task.id;
      const moveToAnytime =
        typeof task === "string" ? false : task.status === "active";

      updateTask.mutate({
        id: taskId,
        due_date: getTomorrowDueDate(),
        ...(moveToAnytime ? { task_location: "anytime" } : {}),
      });
    },
    mutateAsync: async (task: TaskWithDetails | string) => {
      const taskId = typeof task === "string" ? task : task.id;
      const moveToAnytime =
        typeof task === "string" ? false : task.status === "active";

      return updateTask.mutateAsync({
        id: taskId,
        due_date: getTomorrowDueDate(),
        ...(moveToAnytime ? { task_location: "anytime" } : {}),
      });
    },
  };
}

export function useDueTasks(options?: {
  from?: Date;
  to?: Date;
  excludeDone?: boolean;
}) {
  const from = options?.from;
  const to = options?.to;

  const filters: TaskFilters = {
    dueFrom: from ? formatDueDate(from) : undefined,
    dueTo: to ? formatDueDate(to) : undefined,
    excludeDone: options?.excludeDone ?? false,
  };

  return useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: () => fetchTasks(filters),
  });
}

export function useTasksByProject(projectId: string) {
  return useQuery({
    queryKey: taskKeys.byProject(projectId),
    queryFn: () => fetchTasks({ projectId }),
    enabled: !!projectId,
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => fetchTask(id),
    enabled: !!id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTask,
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      if (data.project_id) {
        queryClient.invalidateQueries({
          queryKey: projectKeys.lists(),
        });
      }
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTask,
    onMutate: async (updatedTask) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      // Snapshot and optimistically update all task lists
      const previousData = queryClient.getQueriesData({
        queryKey: taskKeys.lists(),
      });

      queryClient.setQueriesData(
        { queryKey: taskKeys.lists() },
        (old: TaskWithDetails[] | undefined) => {
          if (!old) return old;
          return old.map((task) =>
            task.id === updatedTask.id ? { ...task, ...updatedTask } : task
          );
        }
      );

      return { previousData };
    },
    onError: (_err, _updatedTask, context) => {
      // Rollback on error
      context?.previousData?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: taskKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      // Invalidate logbook since deleted items appear there
      queryClient.invalidateQueries({ queryKey: ["logbook"] });
    },
  });
}

// Toggle task completion
export function useToggleTaskComplete() {
  const updateTask = useUpdateTask();

  return {
    ...updateTask,
    mutate: (task: TaskWithDetails) => {
      const newStatus: TaskStatus = isCompletedStatus(task.status)
        ? "active"
        : "done";
      updateTask.mutate({ id: task.id, status: newStatus });
    },
    mutateAsync: async (task: TaskWithDetails) => {
      const newStatus: TaskStatus = isCompletedStatus(task.status)
        ? "active"
        : "done";
      return updateTask.mutateAsync({ id: task.id, status: newStatus });
    },
  };
}

// Convenience hook for inbox tasks
export function useInboxTasks() {
  return useTasks({
    taskLocation: "inbox",
    excludeStatus: ["active", "done", "cancel"],
  });
}

// Quick status change (for moving tasks between backlog/active/anytime)
export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: TaskStatus;
    }) => {
      const supabase = createClient();

      const updates: TaskUpdate = { status };

      // Handle completed_at timestamp
      if (isCompletedStatus(status)) {
        updates.completed_at = new Date().toISOString();
        updates.is_now = false;
        updates.now_slot = null;
      } else {
        updates.completed_at = null;
        if (status !== "active") {
          updates.is_now = false;
          updates.now_slot = null;
        }
      }

      const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      const previousData = queryClient.getQueriesData({
        queryKey: taskKeys.lists(),
      });

      queryClient.setQueriesData(
        { queryKey: taskKeys.lists() },
        (old: TaskWithDetails[] | undefined) => {
          if (!old) return old;
          return old.map((task) =>
            task.id === id
              ? {
                  ...task,
                  status,
                  completed_at: isCompletedStatus(status)
                    ? new Date().toISOString()
                    : null,
                  is_now:
                    isCompletedStatus(status) || status !== "active"
                      ? false
                      : task.is_now,
                  now_slot:
                    isCompletedStatus(status) || status !== "active"
                      ? null
                      : task.now_slot ?? null,
                }
              : task
          );
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
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

export function useSetNowSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      slot,
    }: {
      taskId: string | null;
      slot: "primary" | "secondary";
    }) => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Not authenticated");
      }

      const { error: clearError } = await supabase
        .from("tasks")
        .update({ now_slot: null })
        .eq("owner_id", user.id)
        .eq("now_slot", slot);

      if (clearError) {
        throw new Error(clearError.message);
      }

      if (!taskId) {
        return null;
      }

      const { data, error } = await supabase
        .from("tasks")
        .update({ now_slot: slot, status: "active" })
        .eq("id", taskId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onMutate: async ({ taskId, slot }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      const previousData = queryClient.getQueriesData({
        queryKey: taskKeys.lists(),
      });

      queryClient.setQueriesData(
        { queryKey: taskKeys.lists() },
        (old: TaskWithDetails[] | undefined) => {
          if (!old) return old;
          return old.map((task) => ({
            ...task,
            now_slot:
              taskId && task.id === taskId
                ? slot
                : task.now_slot === slot
                  ? null
                  : task.now_slot ?? null,
            status:
              taskId && task.id === taskId && task.status !== "active"
                ? "active"
                : task.status,
          }));
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
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

export function useSwapNowSlots() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      primaryId,
      secondaryId,
    }: {
      primaryId: string | null;
      secondaryId: string | null;
    }) => {
      const supabase = createClient();

      if (!primaryId && !secondaryId) {
        return null;
      }

      if (primaryId) {
        const { error: clearPrimaryError } = await supabase
          .from("tasks")
          .update({ now_slot: null })
          .eq("id", primaryId);

        if (clearPrimaryError) {
          throw new Error(clearPrimaryError.message);
        }
      }

      if (secondaryId) {
        const { error: clearSecondaryError } = await supabase
          .from("tasks")
          .update({ now_slot: null })
          .eq("id", secondaryId);

        if (clearSecondaryError) {
          throw new Error(clearSecondaryError.message);
        }
      }

      if (primaryId && secondaryId) {
        const { error: setPrimaryError } = await supabase
          .from("tasks")
          .update({ now_slot: "primary", status: "active" })
          .eq("id", secondaryId);

        if (setPrimaryError) {
          throw new Error(setPrimaryError.message);
        }

        const { error: setSecondaryError } = await supabase
          .from("tasks")
          .update({ now_slot: "secondary", status: "active" })
          .eq("id", primaryId);

        if (setSecondaryError) {
          throw new Error(setSecondaryError.message);
        }
      } else if (secondaryId && !primaryId) {
        const { error: setPrimaryError } = await supabase
          .from("tasks")
          .update({ now_slot: "primary", status: "active" })
          .eq("id", secondaryId);

        if (setPrimaryError) {
          throw new Error(setPrimaryError.message);
        }
      } else if (primaryId && !secondaryId) {
        const { error: setPrimaryError } = await supabase
          .from("tasks")
          .update({ now_slot: "primary", status: "active" })
          .eq("id", primaryId);

        if (setPrimaryError) {
          throw new Error(setPrimaryError.message);
        }
      }

      return true;
    },
    onMutate: async ({ primaryId, secondaryId }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      const previousData = queryClient.getQueriesData({
        queryKey: taskKeys.lists(),
      });

      queryClient.setQueriesData(
        { queryKey: taskKeys.lists() },
        (old: TaskWithDetails[] | undefined) => {
          if (!old) return old;
          return old.map((task) => {
            if (primaryId && task.id === primaryId) {
              return {
                ...task,
                now_slot: secondaryId ? "secondary" : null,
                status: "active",
              };
            }
            if (secondaryId && task.id === secondaryId) {
              return {
                ...task,
                now_slot: "primary",
                status: "active",
              };
            }
            return task;
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
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

// Quick task location change (for moving tasks between inbox/anytime/project)
export function useUpdateTaskLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      task_location,
    }: {
      id: string;
      task_location: TaskLocation;
    }) => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("tasks")
        .update({ task_location })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onMutate: async ({ id, task_location }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      const previousData = queryClient.getQueriesData({
        queryKey: taskKeys.lists(),
      });

      queryClient.setQueriesData(
        { queryKey: taskKeys.lists() },
        (old: TaskWithDetails[] | undefined) => {
          if (!old) return old;
          return old.map((task) =>
            task.id === id ? { ...task, task_location } : task
          );
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
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

// Assign task to project
export function useAssignTaskToProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      projectId,
    }: {
      taskId: string;
      projectId: string | null;
    }) => {
      const supabase = createClient();
      const task_location = projectId ? "project" : "inbox";

      const { data, error } = await supabase
        .from("tasks")
        .update({ project_id: projectId, task_location })
        .eq("id", taskId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onMutate: async ({ taskId, projectId }) => {
      const task_location = projectId ? "project" : "inbox";
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      const previousData = queryClient.getQueriesData({
        queryKey: taskKeys.lists(),
      });

      queryClient.setQueriesData(
        { queryKey: taskKeys.lists() },
        (old: TaskWithDetails[] | undefined) => {
          if (!old) return old;
          return old.map((task) =>
            task.id === taskId
              ? { ...task, project_id: projectId, task_location }
              : task
          );
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
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

// Bulk update task status (for clearing inbox)
export function useBulkUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskIds,
      status,
    }: {
      taskIds: string[];
      status: TaskStatus;
    }) => {
      const supabase = createClient();

      const updates: TaskUpdate = { status };
      if (isCompletedStatus(status)) {
        updates.completed_at = new Date().toISOString();
      } else {
        updates.completed_at = null;
      }

      const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .in("id", taskIds)
        .select();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onMutate: async ({ taskIds, status }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      const previousData = queryClient.getQueriesData({
        queryKey: taskKeys.lists(),
      });

      queryClient.setQueriesData(
        { queryKey: taskKeys.lists() },
        (old: TaskWithDetails[] | undefined) => {
          if (!old) return old;
          return old.map((task) =>
            taskIds.includes(task.id)
              ? {
                  ...task,
                  status,
                  completed_at: isCompletedStatus(status)
                    ? new Date().toISOString()
                    : null,
                }
              : task
          );
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
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

// Bulk soft delete tasks
export function useBulkDeleteTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskIds: string[]) => {
      const supabase = createClient();

      const { error } = await supabase
        .from("tasks")
        .update({
          deleted_at: new Date().toISOString(),
          deleted_reason: "user_deleted",
          is_now: false,
          now_slot: null,
        })
        .in("id", taskIds);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ["logbook"] });
    },
  });
}

// Reorder tasks (updates sort_order for multiple tasks)
export function useReorderTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      taskOrders: { id: string; sort_order: number }[]
    ) => {
      const supabase = createClient();

      // Call the RPC function for atomic updates
      // Using type assertion since the RPC function may not be in generated types yet
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)(
        "reorder_tasks",
        { task_orders: taskOrders }
      ) as { error: { message: string; code?: string } | null };

      if (error) {
        // Fallback to individual updates if RPC not available
        if (error.message.includes("function") || error.code === "42883") {
          // Update each task individually
          for (const { id, sort_order } of taskOrders) {
            const { error: updateError } = await supabase
              .from("tasks")
              .update({ sort_order })
              .eq("id", id);

            if (updateError) {
              throw new Error(updateError.message);
            }
          }
        } else {
          throw new Error(error.message);
        }
      }
    },
    onMutate: async (taskOrders) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      const previousData = queryClient.getQueriesData({
        queryKey: taskKeys.lists(),
      });

      // Create a map of id -> sort_order for quick lookup
      const orderMap = new Map(
        taskOrders.map(({ id, sort_order }) => [id, sort_order])
      );

      // Optimistically update all task lists
      queryClient.setQueriesData(
        { queryKey: taskKeys.lists() },
        (old: TaskWithDetails[] | undefined) => {
          if (!old) return old;
          return old
            .map((task) => {
              const newOrder = orderMap.get(task.id);
              if (newOrder !== undefined) {
                return { ...task, sort_order: newOrder };
              }
              return task;
            })
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        }
      );

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      context?.previousData?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
