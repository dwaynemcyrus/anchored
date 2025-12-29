"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Calendar,
  Clock,
  Folder,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  Circle,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TimerButton, TimeEntryList } from "@/components/timer";
import { TaskForm, type TaskFormValues } from "./task-form";
import { TaskStatusBadge } from "./task-status-badge";
import { formatDuration } from "@/lib/utils/formatting";
import {
  useTask,
  useUpdateTask,
  useDeleteTask,
  useToggleTaskComplete,
  type TaskWithDetails,
} from "@/lib/hooks/use-tasks";
import { useProjects } from "@/lib/hooks/use-projects";

interface TaskDetailDrawerProps {
  taskId: string | null;
  onClose: () => void;
}

export function TaskDetailDrawer({ taskId, onClose }: TaskDetailDrawerProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { data: task, isLoading } = useTask(taskId || "");
  const { data: projects } = useProjects();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const toggleComplete = useToggleTaskComplete();

  const projectList =
    projects?.map((p) => ({ id: p.id, title: p.title })) || [];

  const handleToggleComplete = () => {
    if (task) {
      toggleComplete.mutate(task);
    }
  };

  const handleEdit = () => {
    setIsEditDialogOpen(true);
  };

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (task) {
      await deleteTask.mutateAsync(task.id);
      setIsDeleteDialogOpen(false);
      onClose();
    }
  };

  const handleTaskSubmit = async (values: TaskFormValues) => {
    if (task) {
      await updateTask.mutateAsync({
        id: task.id,
        title: values.title,
        notes: values.notes || null,
        project_id: values.project_id,
        status: values.status,
        start_date: values.start_date?.toISOString() || null,
        due_date: values.due_date?.toISOString() || null,
      });
    }
    setIsEditDialogOpen(false);
  };

  const isCompleted = task?.status === "done";

  return (
    <>
      <Sheet open={!!taskId} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
          <SheetHeader className="px-6 py-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg font-semibold">
                Task Details
              </SheetTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="p-6 space-y-4">
                <div className="h-6 w-3/4 bg-muted animate-pulse rounded" />
                <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
                <div className="h-20 w-full bg-muted animate-pulse rounded" />
              </div>
            ) : task ? (
              <div className="p-6 space-y-6">
                {/* Task Header */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={handleToggleComplete}
                      className="flex-shrink-0 mt-0.5"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                      ) : (
                        <Circle className="h-6 w-6 text-muted-foreground hover:text-foreground transition-colors" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <h2
                        className={`text-xl font-semibold ${
                          isCompleted ? "line-through text-muted-foreground" : ""
                        }`}
                      >
                        {task.title}
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        <TaskStatusBadge status={task.status} />
                      </div>
                    </div>
                  </div>

                  {/* Timer button */}
                  {!isCompleted && (
                    <div className="flex items-center gap-2">
                      <TimerButton
                        taskId={task.id}
                        size="default"
                        variant="outline"
                        showLabel
                      />
                    </div>
                  )}
                </div>

                <Separator />

                {/* Task Metadata */}
                <div className="space-y-3">
                  {/* Project */}
                  {task.project && (
                    <div className="flex items-center gap-3">
                      <Folder className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{task.project.title}</span>
                    </div>
                  )}

                  {/* Start Date */}
                  {task.start_date && (
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Starts{" "}
                        {format(new Date(task.start_date), "EEEE, MMMM d, yyyy")}
                      </span>
                    </div>
                  )}

                  {/* Due Date */}
                  {task.due_date && (
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {format(new Date(task.due_date), "EEEE, MMMM d, yyyy")}
                      </span>
                    </div>
                  )}

                  {/* Time Tracked */}
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {task.time_tracked_seconds > 0
                        ? formatDuration(task.time_tracked_seconds)
                        : "No time tracked"}
                    </span>
                  </div>
                </div>

                {/* Notes */}
                {task.notes && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">
                        Notes
                      </h3>
                      <p className="text-sm whitespace-pre-wrap">{task.notes}</p>
                    </div>
                  </>
                )}

                {/* Time Entries */}
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Time Entries
                  </h3>
                  <TimeEntryList taskId={task.id} />
                </div>

                {/* Timestamps */}
                <Separator />
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>
                    Created {format(new Date(task.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                  {task.completed_at && (
                    <p>
                      Completed{" "}
                      {format(
                        new Date(task.completed_at),
                        "MMM d, yyyy 'at' h:mm a"
                      )}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                Task not found
              </div>
            )}
          </ScrollArea>

          {/* Footer Actions */}
          {task && (
            <div className="px-6 py-4 border-t flex items-center gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          {task && (
            <TaskForm
              task={task}
              projects={projectList}
              onSubmit={handleTaskSubmit}
              onCancel={() => setIsEditDialogOpen(false)}
              isLoading={updateTask.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{task?.title}&rdquo;? This
              action cannot be undone. All time entries for this task will also
              be deleted.
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
    </>
  );
}
