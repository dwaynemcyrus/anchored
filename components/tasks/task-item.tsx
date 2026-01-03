"use client";

import { format, isToday, isTomorrow, isPast } from "date-fns";
import { Timer, MoreHorizontal, Pencil, Trash2, Calendar } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/utils/formatting";
import { TaskStatusBadge } from "./task-status-badge";
import { TimerButton } from "@/components/timer";
import type { TaskWithDetails } from "@/lib/hooks/use-tasks";

interface TaskItemProps {
  task: TaskWithDetails;
  onToggleComplete: (task: TaskWithDetails) => void;
  onClick?: (task: TaskWithDetails) => void;
  onEdit?: (task: TaskWithDetails) => void;
  onDelete?: (task: TaskWithDetails) => void;
  showProject?: boolean;
  showStatus?: boolean;
  showTimer?: boolean;
  compact?: boolean;
}

function formatDueDate(dateString: string): { text: string; isOverdue: boolean } {
  const date = new Date(dateString);

  if (isToday(date)) {
    return { text: "Today", isOverdue: false };
  }

  if (isTomorrow(date)) {
    return { text: "Tomorrow", isOverdue: false };
  }

  const isOverdue = isPast(date);
  return {
    text: format(date, "MMM d"),
    isOverdue,
  };
}

function formatStartDate(dateString: string): string {
  const date = new Date(dateString);
  return format(date, "MMM d");
}

export function TaskItem({
  task,
  onToggleComplete,
  onClick,
  onEdit,
  onDelete,
  showProject = false,
  showStatus = false,
  showTimer = true,
  compact = false,
}: TaskItemProps) {
  const isCompleted = task.status === "done";
  const dueDate = task.due_date ? formatDueDate(task.due_date) : null;
  const startDate =
    !task.due_date && task.start_date ? formatStartDate(task.start_date) : null;

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-lg border bg-card transition-colors",
        compact ? "p-2" : "p-3",
        onClick && "cursor-pointer hover:bg-accent/50",
        isCompleted && "opacity-60"
      )}
      onClick={() => onClick?.(task)}
    >
      {/* Checkbox */}
      <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
        <Checkbox
          checked={isCompleted}
          onCheckedChange={() => onToggleComplete(task)}
          className={cn("h-5 w-5", compact && "h-4 w-4")}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              "font-medium truncate",
              compact ? "text-sm" : "text-base",
              isCompleted && "line-through text-muted-foreground"
            )}
          >
            {task.title}
          </p>
          {showStatus && !isCompleted && (
            <TaskStatusBadge status={task.status} className="flex-shrink-0" />
          )}
        </div>

        {/* Metadata row */}
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {task.next_task && task.task_location === "anytime" && !isCompleted && (
            <span className="rounded border border-border px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Next
            </span>
          )}
          {showProject && task.project && (
            <span className="text-xs text-muted-foreground">
              {task.project.title}
            </span>
          )}

          {dueDate && (
            <span
              className={cn(
                "flex items-center gap-1 text-xs",
                dueDate.isOverdue && !isCompleted
                  ? "text-destructive"
                  : "text-muted-foreground"
              )}
            >
              <Calendar className="h-3 w-3" />
              {dueDate.text}
            </span>
          )}

          {startDate && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Starts {startDate}
            </span>
          )}

          {task.time_tracked_seconds > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Timer className="h-3 w-3" />
              {formatDuration(task.time_tracked_seconds)}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div
        className="flex items-center gap-1 flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Timer button - visible on hover when task is not completed */}
        {showTimer && !isCompleted && (
          <TimerButton
            taskId={task.id}
            className={cn(
              "h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity",
              compact && "h-7 w-7"
            )}
          />
        )}

        {/* More actions dropdown */}
        {(onEdit || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity",
                  compact && "h-7 w-7"
                )}
              >
                <MoreHorizontal className={cn("h-4 w-4", compact && "h-3.5 w-3.5")} />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(task)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {onEdit && onDelete && <DropdownMenuSeparator />}
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(task)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
