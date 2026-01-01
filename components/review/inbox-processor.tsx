"use client";

import { useState } from "react";
import { Layers, Sun, Trash2 } from "lucide-react";
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
import type { TaskWithDetails } from "@/lib/hooks/use-tasks";

interface InboxProcessorProps {
  tasks: TaskWithDetails[];
  onMoveToToday: (task: TaskWithDetails) => void;
  onMoveToAnytime: (task: TaskWithDetails) => void;
  onDelete: (task: TaskWithDetails) => void;
  isProcessing?: boolean;
}

export function InboxProcessor({
  tasks,
  onMoveToToday,
  onMoveToAnytime,
  onDelete,
  isProcessing = false,
}: InboxProcessorProps) {
  const [taskToDelete, setTaskToDelete] = useState<TaskWithDetails | null>(
    null
  );

  const handleConfirmDelete = () => {
    if (taskToDelete) {
      onDelete(taskToDelete);
      setTaskToDelete(null);
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Inbox is clear. Nice work.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{task.title}</p>
                {task.project && (
                  <p className="text-sm text-muted-foreground truncate">
                    {task.project.title}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onMoveToToday(task)}
                  disabled={isProcessing}
                >
                  <Sun className="mr-2 h-4 w-4 text-blue-500" />
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onMoveToAnytime(task)}
                  disabled={isProcessing}
                >
                  <Layers className="mr-2 h-4 w-4 text-teal-500" />
                  Anytime
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTaskToDelete(task)}
                  disabled={isProcessing}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="text-sm text-muted-foreground">
          {tasks.length} {tasks.length === 1 ? "item" : "items"} remaining
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!taskToDelete}
        onOpenChange={(open) => !open && setTaskToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              This task will be moved to the Logbook and permanently deleted
              after 60 days. You can restore it from the Logbook at any time
              before then.
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
