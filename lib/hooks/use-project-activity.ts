"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type ProjectActivityAction =
  | "created"
  | "active"
  | "paused"
  | "cancelled"
  | "complete"
  | "archived"
  | "task_completed"
  | "task_cancelled";

export type ProjectActivity = {
  id: string;
  project_id: string;
  owner_id: string;
  action: ProjectActivityAction;
  reason: string | null;
  created_at: string;
};

export const projectActivityKeys = {
  all: ["project-activity"] as const,
  byProject: (projectId: string) =>
    [...projectActivityKeys.all, projectId] as const,
};

async function fetchProjectActivity(projectId: string): Promise<ProjectActivity[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("project_activity")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as ProjectActivity[];
}

async function createProjectActivity(input: {
  projectId: string;
  action: ProjectActivityAction;
  reason?: string | null;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("project_activity")
    .insert({
      project_id: input.projectId,
      owner_id: user.id,
      action: input.action,
      reason: input.reason ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as ProjectActivity;
}

export function useProjectActivity(projectId: string) {
  return useQuery({
    queryKey: projectActivityKeys.byProject(projectId),
    queryFn: () => fetchProjectActivity(projectId),
    enabled: !!projectId,
  });
}

export function useCreateProjectActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProjectActivity,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectActivityKeys.byProject(variables.projectId),
      });
    },
  });
}
