"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProjectDetailSkeleton } from "@/components/skeletons";
import { InlineError } from "@/components/error-boundary";
import { ProjectDetailModal } from "@/components/projects/project-detail-modal";
import { ProjectOptionsMenu } from "@/components/projects/project-options-menu";
import { ProjectStatusReasonModal } from "@/components/projects/project-status-reason-modal";
import { ProjectInfoSheet } from "@/components/projects/project-info-sheet";
import menuStyles from "@/components/projects/project-options-menu.module.css";
import { Separator } from "@/components/ui/separator";
import { TaskList } from "@/components/tasks/task-list";
import taskListStyles from "@/components/tasks/task-list.module.css";
import styles from "./page.module.css";
import { QuickAddInline } from "@/components/tasks/quick-add";
import Link from "next/link";
import {
  useProject,
  useUpdateProject,
  useUpdateProjectStatusWithReason,
} from "@/lib/hooks/use-projects";
import { useProjectActivity } from "@/lib/hooks/use-project-activity";
import {
  useTasksByProject,
  useToggleTaskComplete,
  type TaskWithDetails,
} from "@/lib/hooks/use-tasks";

const statusConfig = {
  backlog: { label: "Backlog", variant: "outline" as const },
  active: { label: "Active", variant: "default" as const },
  paused: { label: "Paused", variant: "secondary" as const },
  complete: { label: "Complete", variant: "secondary" as const },
  archived: { label: "Archived", variant: "outline" as const },
  cancelled: { label: "Cancelled", variant: "outline" as const },
};

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const { data: project, isLoading: projectLoading, error: projectError } = useProject(id);
  const { data: tasks, isLoading: tasksLoading } = useTasksByProject(id);
  const { data: activity } = useProjectActivity(id);

  const updateProject = useUpdateProject();
  const updateProjectWithReason = useUpdateProjectStatusWithReason();
  const toggleComplete = useToggleTaskComplete();
  const [pendingStatus, setPendingStatus] = useState<{
    status: "paused" | "cancelled";
  } | null>(null);
  const handleDismissOverlay = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/projects");
  }, [router]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleDismissOverlay();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleDismissOverlay]);

  const handleUpdateProject = async (values: {
    title: string;
    outcome: string;
    purpose: string;
    description: string | null;
  }) => {
    await updateProject.mutateAsync({
      id,
      ...values,
    });
  };

  const handleToggleComplete = (task: TaskWithDetails) => {
    toggleComplete.mutate(task);
  };

  const returnTo = encodeURIComponent(`/projects/${id}`);
  const taskLinkSuffix = `?returnTo=${returnTo}`;

  const handleAddTask = () => {
    router.push(`/tasks/new?projectId=${id}&returnTo=${returnTo}`);
  };

  const isLoading = projectLoading || tasksLoading;

  if (isLoading) {
    return <ProjectDetailSkeleton />;
  }

  if (projectError || !project) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          className={menuStyles.trigger}
          onClick={handleDismissOverlay}
        >
          Back
        </button>
        <InlineError message={projectError?.message || "Project not found"} />
      </div>
    );
  }

  const config = statusConfig[project.status as keyof typeof statusConfig] ?? statusConfig.active;
  const nextTask = tasks?.find((task) => task.next_task) || null;
  const remainingTasks = nextTask
    ? tasks?.filter((task) => task.id !== nextTask.id)
    : tasks;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          className={menuStyles.trigger}
          onClick={handleDismissOverlay}
        >
          Back
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className={menuStyles.trigger}
            onClick={() => setIsInfoOpen(true)}
          >
            Info
          </button>
          <ProjectOptionsMenu
            onEditDetails={() => setIsEditDialogOpen(true)}
            status={
              project.status as
                | "backlog"
                | "active"
                | "paused"
                | "complete"
                | "archived"
                | "cancelled"
            }
            onStatusChange={(status) => {
              if (status === "paused" || status === "cancelled") {
                setPendingStatus({ status });
                return;
              }
              updateProject.mutateAsync({ id, status });
            }}
          />
        </div>
      </div>

      {/* Project Info */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{project.title}</h1>
            <Badge variant={config.variant}>{config.label}</Badge>
          </div>
          {project.description && (
            <p className="text-muted-foreground max-w-2xl">
              {project.description}
            </p>
          )}
        </div>

        
      </div>

      {/* Tasks Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Tasks</h2>
          <Button size="sm" onClick={handleAddTask}>
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        </div>

        {nextTask ? (
          <Link
            href={`/tasks/${nextTask.id}${taskLinkSuffix}`}
            className={`${taskListStyles.item} ${styles.nextTask}`}
          >
            <input
              type="checkbox"
              className={taskListStyles.checkbox}
              checked={nextTask.status === "done" || nextTask.status === "cancel"}
              onChange={(event) => {
                event.preventDefault();
                handleToggleComplete(nextTask);
              }}
              onClick={(event) => event.stopPropagation()}
            />
            <span
              className={
                nextTask.status === "done" || nextTask.status === "cancel"
                  ? taskListStyles.titleDone
                  : taskListStyles.titleText
              }
            >
              {nextTask.title}
            </span>
          </Link>
        ) : (
          <div className={`${taskListStyles.item} ${styles.nextTask}`}>
            <input
              type="checkbox"
              className={taskListStyles.checkbox}
              checked={false}
              readOnly
              aria-hidden="true"
            />
            <span
              className={`${taskListStyles.titleText} ${styles.nextTaskPlaceholder}`}
            >
              No next task set
            </span>
          </div>
        )}

        <Separator />

        {/* Quick Add for this project */}
        <QuickAddInline
          defaultProjectId={id}
          defaultStatus="today"
          defaultLocation="project"
          placeholder="Quick add task to this project..."
        />

        <TaskList
          tasks={remainingTasks || []}
          onToggleComplete={handleToggleComplete}
          emptyText="No tasks yet."
          linkSuffix={taskLinkSuffix}
        />
      </div>

      <ProjectDetailModal
        open={isEditDialogOpen}
        mode="edit"
        initialTitle={project.title}
        initialOutcome={project.outcome}
        initialPurpose={project.purpose}
        initialDescription={project.description}
        onClose={() => setIsEditDialogOpen(false)}
        onSave={handleUpdateProject}
        isSaving={updateProject.isPending}
      />
      <ProjectStatusReasonModal
        open={!!pendingStatus}
        statusLabel={pendingStatus?.status === "paused" ? "Pause" : "Cancel"}
        onClose={() => setPendingStatus(null)}
        onSubmit={async (reason) => {
          if (!pendingStatus) return;
          await updateProjectWithReason.mutateAsync({
            projectId: id,
            status: pendingStatus.status,
            reason,
          });
          setPendingStatus(null);
        }}
        isSaving={updateProjectWithReason.isPending}
      />
      <ProjectInfoSheet
        open={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        project={project}
        tasks={tasks || []}
        activity={activity || []}
      />

    </div>
  );
}
