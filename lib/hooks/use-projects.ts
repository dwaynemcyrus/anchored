"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type {
  Project,
  ProjectInsert,
  ProjectUpdate,
} from "@/types/database";
import { taskKeys } from "./use-tasks";

// Extended project type with task count
export type ProjectWithTaskCount = Project & {
  task_count: number;
};

function isCompletedProjectStatus(status: Project["status"] | null | undefined) {
  return status === "complete" || status === "cancelled";
}

// Query keys
export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) =>
    [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, "detail"] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

// Fetch all projects with task counts
async function fetchProjects(): Promise<ProjectWithTaskCount[]> {
  const supabase = createClient();

  // Fetch projects (exclude deleted)
  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("*")
    .is("deleted_at", null) // Exclude soft-deleted projects
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (projectsError) {
    throw new Error(projectsError.message);
  }

  // Fetch task counts per project (exclude deleted and completed tasks)
  const { data: taskCounts, error: taskCountsError } = await supabase
    .from("tasks")
    .select("project_id")
    .not("project_id", "is", null)
    .is("deleted_at", null) // Exclude soft-deleted tasks
    .not("status", "in", "(done,cancel)");

  if (taskCountsError) {
    throw new Error(taskCountsError.message);
  }

  // Count tasks per project
  const countMap = new Map<string, number>();
  taskCounts?.forEach((task) => {
    if (task.project_id) {
      countMap.set(task.project_id, (countMap.get(task.project_id) || 0) + 1);
    }
  });

  // Merge counts with projects
  return (projects || []).map((project) => ({
    ...project,
    task_count: countMap.get(project.id) || 0,
  }));
}

// Fetch single project
async function fetchProject(id: string): Promise<Project> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null) // Exclude soft-deleted projects
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Create project
async function createProject(
  project: Omit<ProjectInsert, "owner_id">
): Promise<Project> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({ ...project, owner_id: user.id })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Update project
async function updateProject({
  id,
  ...updates
}: ProjectUpdate & { id: string }): Promise<Project> {
  const supabase = createClient();

  if (updates.status) {
    updates.completed_at = isCompletedProjectStatus(updates.status)
      ? new Date().toISOString()
      : null;
  }

  const { data, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Archive project (status change)
async function archiveProject(id: string): Promise<Project> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("projects")
    .update({ status: "archived", completed_at: null })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Soft delete project (moves to logbook with cascade to tasks)
async function softDeleteProject(id: string): Promise<{ tasksDeleted: number }> {
  const supabase = createClient();
  const now = new Date().toISOString();

  // Soft delete project
  const { error: projectError } = await supabase
    .from("projects")
    .update({ deleted_at: now })
    .eq("id", id);

  if (projectError) {
    throw new Error(projectError.message);
  }

  // Cascade soft delete to tasks (only active tasks)
  const { data: tasksToDelete, error: tasksQueryError } = await supabase
    .from("tasks")
    .select("id")
    .eq("project_id", id)
    .is("deleted_at", null);

  if (tasksQueryError) {
    throw new Error(tasksQueryError.message);
  }

  const taskIds = tasksToDelete?.map((t) => t.id) || [];

  if (taskIds.length > 0) {
    const { error: deleteTasksError } = await supabase
      .from("tasks")
      .update({
        deleted_at: now,
        deleted_reason: "project_deleted",
        deleted_parent_id: id,
        is_now: false,
        now_slot: null,
      })
      .in("id", taskIds);

    if (deleteTasksError) {
      throw new Error(deleteTasksError.message);
    }
  }

  return { tasksDeleted: taskIds.length };
}

// Complete project
async function completeProject(id: string): Promise<Project> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("projects")
    .update({ status: "complete", completed_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Hooks

export function useProjects() {
  return useQuery({
    queryKey: projectKeys.lists(),
    queryFn: fetchProjects,
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => fetchProject(id),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProject,
    onMutate: async (newProject) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: projectKeys.lists() });

      // Snapshot previous value
      const previousProjects = queryClient.getQueryData<ProjectWithTaskCount[]>(
        projectKeys.lists()
      );

      // Optimistically add new project
      if (previousProjects) {
        const optimisticProject: ProjectWithTaskCount = {
          id: `temp-${Date.now()}`,
          owner_id: "",
          title: newProject.title,
          description: newProject.description || null,
          status: newProject.status || "active",
          sort_order: 0,
          completed_at: null,
          deleted_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          task_count: 0,
        };

        queryClient.setQueryData<ProjectWithTaskCount[]>(projectKeys.lists(), [
          optimisticProject,
          ...previousProjects,
        ]);
      }

      return { previousProjects };
    },
    onError: (_err, _newProject, context) => {
      // Rollback on error
      if (context?.previousProjects) {
        queryClient.setQueryData(projectKeys.lists(), context.previousProjects);
      }
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProject,
    onMutate: async (updatedProject) => {
      await queryClient.cancelQueries({ queryKey: projectKeys.lists() });
      await queryClient.cancelQueries({
        queryKey: projectKeys.detail(updatedProject.id),
      });

      const previousProjects = queryClient.getQueryData<ProjectWithTaskCount[]>(
        projectKeys.lists()
      );

      const optimisticUpdate = {
        ...updatedProject,
        ...(updatedProject.status
          ? {
              completed_at: isCompletedProjectStatus(updatedProject.status)
                ? new Date().toISOString()
                : null,
            }
          : {}),
      };

      // Optimistically update
      if (previousProjects) {
        queryClient.setQueryData<ProjectWithTaskCount[]>(
          projectKeys.lists(),
          previousProjects.map((p) =>
            p.id === updatedProject.id ? { ...p, ...optimisticUpdate } : p
          )
        );
      }

      return { previousProjects };
    },
    onError: (_err, _updatedProject, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(projectKeys.lists(), context.previousProjects);
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: projectKeys.detail(variables.id),
      });
    },
  });
}

export function useArchiveProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: archiveProject,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: projectKeys.lists() });

      const previousProjects = queryClient.getQueryData<ProjectWithTaskCount[]>(
        projectKeys.lists()
      );

      // Optimistically update status to archived
      if (previousProjects) {
        queryClient.setQueryData<ProjectWithTaskCount[]>(
          projectKeys.lists(),
          previousProjects.map((p) =>
            p.id === id
              ? { ...p, status: "archived" as const, completed_at: null }
              : p
          )
        );
      }

      return { previousProjects };
    },
    onError: (_err, _id, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(projectKeys.lists(), context.previousProjects);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

export function useSoftDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: softDeleteProject,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: projectKeys.lists() });

      const previousProjects = queryClient.getQueryData<ProjectWithTaskCount[]>(
        projectKeys.lists()
      );

      // Optimistically remove project from list
      if (previousProjects) {
        queryClient.setQueryData<ProjectWithTaskCount[]>(
          projectKeys.lists(),
          previousProjects.filter((p) => p.id !== id)
        );
      }

      return { previousProjects };
    },
    onError: (_err, _id, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(projectKeys.lists(), context.previousProjects);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ["logbook"] });
    },
  });
}

export function useCompleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: completeProject,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: projectKeys.lists() });

      const previousProjects = queryClient.getQueryData<ProjectWithTaskCount[]>(
        projectKeys.lists()
      );

      // Optimistically update status to complete
      if (previousProjects) {
        queryClient.setQueryData<ProjectWithTaskCount[]>(
          projectKeys.lists(),
          previousProjects.map((p) =>
            p.id === id
              ? { ...p, status: "complete" as const, completed_at: new Date().toISOString() }
              : p
          )
        );
      }

      return { previousProjects };
    },
    onError: (_err, _id, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(projectKeys.lists(), context.previousProjects);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ["logbook"] });
    },
  });
}
