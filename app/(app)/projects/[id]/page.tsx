"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProjectDetailSkeleton } from "@/components/skeletons";
import { InlineError } from "@/components/error-boundary";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ProjectDetailModal } from "@/components/projects/project-detail-modal";
import { ProjectOptionsMenu } from "@/components/projects/project-options-menu";
import { ProjectStatusReasonModal } from "@/components/projects/project-status-reason-modal";
import { ProjectInfoSheet } from "@/components/projects/project-info-sheet";
import menuStyles from "@/components/projects/project-options-menu.module.css";
import styles from "./page.module.css";
import { TaskForm, type TaskFormValues } from "@/components/tasks/task-form";
import { QuickAddInline } from "@/components/tasks/quick-add";
import { SortableProjectTaskList } from "@/components/tasks/sortable-task-list";
import {
  useProject,
  useUpdateProject,
  useUpdateProjectStatusWithReason,
} from "@/lib/hooks/use-projects";
import {
  useProjectActivity,
} from "@/lib/hooks/use-project-activity";
import {
  useTasksByProject,
  useToggleTaskComplete,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
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

const activityLabels: Record<string, string> = {
  created: "Created",
  active: "Activated",
  paused: "Paused",
  cancelled: "Cancelled",
  complete: "Completed",
  archived: "Archived",
  task_completed: "Task completed",
  task_cancelled: "Task cancelled",
};

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithDetails | null>(null);
  const [deletingTask, setDeletingTask] = useState<TaskWithDetails | null>(null);

  const { data: project, isLoading: projectLoading, error: projectError } = useProject(id);
  const { data: tasks, isLoading: tasksLoading } = useTasksByProject(id);
  const { data: activity } = useProjectActivity(id);

  const updateProject = useUpdateProject();
  const updateProjectWithReason = useUpdateProjectStatusWithReason();
  const toggleComplete = useToggleTaskComplete();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [pendingStatus, setPendingStatus] = useState<{
    status: "paused" | "cancelled";
  } | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        router.push("/projects");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

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

  const handleTaskClick = (task: TaskWithDetails) => {
    setEditingTask(task);
    setIsTaskDialogOpen(true);
  };

  const handleEditTask = (task: TaskWithDetails) => {
    setEditingTask(task);
    setIsTaskDialogOpen(true);
  };

  const handleDeleteTask = (task: TaskWithDetails) => {
    setDeletingTask(task);
  };

  const handleConfirmDelete = async () => {
    if (deletingTask) {
      await deleteTask.mutateAsync(deletingTask.id);
      setDeletingTask(null);
    }
  };

  const handleAddTask = () => {
    setEditingTask(null);
    setIsTaskDialogOpen(true);
  };

  const handleTaskSubmit = async (values: TaskFormValues) => {
    const taskLocation = values.project_id ? "project" : values.task_location;
    if (editingTask) {
      await updateTask.mutateAsync({
        id: editingTask.id,
        title: values.title,
        notes: values.notes || null,
        project_id: values.project_id,
        task_location: taskLocation,
        start_date: values.start_date?.toISOString() || null,
        due_date: values.due_date?.toISOString() || null,
      });
    } else {
      await createTask.mutateAsync({
        title: values.title,
        notes: values.notes || null,
        project_id: id,
        task_location: "project",
        start_date: values.start_date?.toISOString() || null,
        due_date: values.due_date?.toISOString() || null,
      });
    }
    setIsTaskDialogOpen(false);
    setEditingTask(null);
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
          onClick={() => router.back()}
        >
          Back
        </button>
        <InlineError message={projectError?.message || "Project not found"} />
      </div>
    );
  }

  const config = statusConfig[project.status as keyof typeof statusConfig] ?? statusConfig.active;
  const taskCount = tasks?.length || 0;
  const activeTaskCount =
    tasks?.filter(
      (t) => !["done", "cancel", "waiting"].includes(t.status)
    ).length || 0;

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onClick={() => router.push("/projects")}
    >
      <div
        className={styles.panel}
        role="presentation"
        onClick={(event) => event.stopPropagation()}
      >
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          className={menuStyles.trigger}
          onClick={() => router.push("/projects")}
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
          <p className="text-sm text-muted-foreground">
            {activeTaskCount} active {activeTaskCount === 1 ? "task" : "tasks"}
            {taskCount > activeTaskCount && ` · ${taskCount - activeTaskCount} completed`}
          </p>
        </div>

        
      </div>

      {activity && activity.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Activity</h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            {activity.map((item) => (
              <div key={item.id}>
                {activityLabels[item.action] ?? item.action}
                {item.reason ? `: ${item.reason}` : ""}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tasks Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Tasks</h2>
          <Button size="sm" onClick={handleAddTask}>
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        </div>

        {/* Quick Add for this project */}
        <QuickAddInline
          defaultProjectId={id}
          defaultStatus="today"
          defaultLocation="project"
          placeholder="Quick add task to this project..."
        />

        <SortableProjectTaskList
          tasks={tasks || []}
          onToggleComplete={handleToggleComplete}
          onTaskClick={handleTaskClick}
          onEdit={handleEditTask}
          onDelete={handleDeleteTask}
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

      {/* Task Create/Edit Dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={(open) => {
        setIsTaskDialogOpen(open);
        if (!open) setEditingTask(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "Add Task"}</DialogTitle>
          </DialogHeader>
          <TaskForm
            task={editingTask || undefined}
            defaultProjectId={id}
            defaultLocation="project"
            onSubmit={handleTaskSubmit}
            onCancel={() => {
              setIsTaskDialogOpen(false);
              setEditingTask(null);
            }}
            isLoading={createTask.isPending || updateTask.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Task Confirmation Dialog */}
      <AlertDialog open={!!deletingTask} onOpenChange={(open) => !open && setDeletingTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deletingTask?.title}&rdquo;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}
