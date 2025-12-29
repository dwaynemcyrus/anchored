"use client";

import { CalendarDays, CheckCircle2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TaskWithDetails } from "@/lib/hooks/use-tasks";

interface TodayReviewProps {
  tasks: TaskWithDetails[];
  onMoveToTomorrow: (task: TaskWithDetails) => void;
  onMoveToAnytime: (task: TaskWithDetails) => void;
  onMarkDone: (task: TaskWithDetails) => void;
  isProcessing?: boolean;
}

export function TodayReview({
  tasks,
  onMoveToTomorrow,
  onMoveToAnytime,
  onMarkDone,
  isProcessing = false,
}: TodayReviewProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        No remaining Today tasks.
      </div>
    );
  }

  return (
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
              onClick={() => onMoveToTomorrow(task)}
              disabled={isProcessing}
            >
              <CalendarDays className="mr-2 h-4 w-4 text-blue-500" />
              Tomorrow
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
              variant="outline"
              size="sm"
              onClick={() => onMarkDone(task)}
              disabled={isProcessing}
            >
              <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
              Done
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
