"use client";

import { useState } from "react";
import { Inbox, Sun, Trash2, CheckCircle2 } from "lucide-react";
import { QuickAdd } from "@/components/tasks/quick-add";
import { SortableInboxList } from "@/components/tasks/sortable-inbox-list";
import { TaskListSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useInboxTasks,
  useUpdateTaskStatus,
  useUpdateTaskLocation,
  useAssignTaskToProject,
  useDeleteTask,
  useBulkUpdateTaskStatus,
  useBulkDeleteTasks,
  type TaskWithDetails,
} from "@/lib/hooks/use-tasks";
import { useProjects } from "@/lib/hooks/use-projects";

export default function InboxPage() {
  const [deletingTask, setDeletingTask] = useState<TaskWithDetails | null>(null);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearAction, setClearAction] = useState<"today" | "delete" | null>(null);

  // Fetch inbox tasks and projects
  const { data: tasks, isLoading } = useInboxTasks();
  const { data: projects } = useProjects();

  // Mutations
  const updateTaskStatus = useUpdateTaskStatus();
  const updateTaskLocation = useUpdateTaskLocation();
  const assignTaskToProject = useAssignTaskToProject();
  const deleteTask = useDeleteTask();
  const bulkUpdateStatus = useBulkUpdateTaskStatus();
  const bulkDelete = useBulkDeleteTasks();

  const projectList = projects?.map((p) => ({ id: p.id, title: p.title })) || [];
  const taskCount = tasks?.length || 0;

  // Individual task handlers
  const handleMoveToToday = (task: TaskWithDetails) => {
    updateTaskStatus.mutate({ id: task.id, status: "today" });
  };

  const handleMoveToAnytime = (task: TaskWithDetails) => {
    updateTaskLocation.mutate({ id: task.id, task_location: "anytime" });
  };

  const handleAssignProject = (task: TaskWithDetails, projectId: string | null) => {
    assignTaskToProject.mutate({ taskId: task.id, projectId });
  };

  const handleComplete = (task: TaskWithDetails) => {
    updateTaskStatus.mutate({ id: task.id, status: "done" });
  };

  const handleDelete = (task: TaskWithDetails) => {
    setDeletingTask(task);
  };

  const handleConfirmDelete = async () => {
    if (deletingTask) {
      await deleteTask.mutateAsync(deletingTask.id);
      setDeletingTask(null);
    }
  };

  // Bulk action handlers
  const handleClearToToday = () => {
    setClearAction("today");
    setShowClearDialog(true);
  };

  const handleClearAll = () => {
    setClearAction("delete");
    setShowClearDialog(true);
  };

  const handleConfirmClear = async () => {
    if (!tasks || tasks.length === 0) return;

    const taskIds = tasks.map((t) => t.id);

    if (clearAction === "today") {
      await bulkUpdateStatus.mutateAsync({ taskIds, status: "today" });
    } else if (clearAction === "delete") {
      await bulkDelete.mutateAsync(taskIds);
    }

    setShowClearDialog(false);
    setClearAction(null);
  };

  const isAnyProcessing =
    updateTaskStatus.isPending ||
    updateTaskLocation.isPending ||
    assignTaskToProject.isPending ||
    deleteTask.isPending ||
    bulkUpdateStatus.isPending ||
    bulkDelete.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-muted p-2">
            <Inbox className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">Inbox</h1>
              {taskCount > 0 && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                  {taskCount}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Process tasks to zero. Move them to Today, Anytime, or a project.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Add */}
      <QuickAdd
        defaultLocation="inbox"
        placeholder="Capture a task... (# for project, @ for status)"
      />

      {/* Tasks List */}
      {isLoading ? (
        <TaskListSkeleton count={3} />
      ) : tasks && tasks.length > 0 ? (
        <SortableInboxList
          tasks={[...tasks].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))}
          projects={projectList}
          onMoveToToday={handleMoveToToday}
          onMoveToAnytime={handleMoveToAnytime}
          onAssignProject={handleAssignProject}
          onDelete={handleDelete}
          onComplete={handleComplete}
          isProcessing={isAnyProcessing}
        />
      ) : (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
          <h3 className="mt-4 text-lg font-medium">Inbox Zero!</h3>
          <p className="mt-1 text-muted-foreground">
            All tasks have been processed. Great job!
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Add new tasks above or use{" "}
            <kbd className="rounded border bg-muted px-1 py-0.5 text-xs">
              Cmd+K
            </kbd>{" "}
            to quick add
          </p>
        </div>
      )}

      {/* Bulk Actions Footer */}
      {tasks && tasks.length > 0 && (
        <div className="sticky bottom-0 rounded-lg border bg-card p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{taskCount}</span>{" "}
              {taskCount === 1 ? "item" : "items"} remaining
            </p>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isAnyProcessing}>
                    Clear Inbox
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleClearToToday}>
                    <Sun className="mr-2 h-4 w-4 text-blue-500" />
                    Move all to Today
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleClearAll}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete all
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Task Confirmation */}
      <AlertDialog
        open={!!deletingTask}
        onOpenChange={(open) => !open && setDeletingTask(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deletingTask?.title}
              &rdquo;? This action cannot be undone.
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

      {/* Bulk Clear Confirmation */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {clearAction === "today" ? "Move All to Today" : "Delete All Tasks"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {clearAction === "today" ? (
                <>
                  This will move all {taskCount} inbox{" "}
                  {taskCount === 1 ? "task" : "tasks"} to your Today list.
                </>
              ) : (
                <>
                  This will permanently delete all {taskCount} inbox{" "}
                  {taskCount === 1 ? "task" : "tasks"}. This action cannot be
                  undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmClear}
              className={
                clearAction === "delete"
                  ? "bg-destructive text-white hover:bg-destructive/90"
                  : ""
              }
            >
              {clearAction === "today" ? "Move to Today" : "Delete All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
