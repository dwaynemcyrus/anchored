"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";
import { TaskDetailDrawer } from "@/components/tasks/task-detail-drawer";
import { ScheduledTaskList } from "@/components/tasks/scheduled-list";
import { TaskListSkeleton } from "@/components/skeletons";
import {
  useScheduledTasks,
  useToggleTaskComplete,
  type TaskWithDetails,
} from "@/lib/hooks/use-tasks";

export default function ScheduledPage() {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const { data: tasks, isLoading } = useScheduledTasks();
  const toggleComplete = useToggleTaskComplete();

  const handleToggleComplete = (task: TaskWithDetails) => {
    toggleComplete.mutate(task);
  };

  const handleTaskClick = (task: TaskWithDetails) => {
    setSelectedTaskId(task.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-muted p-2">
          <Calendar className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Scheduled</h1>
          <p className="text-sm text-muted-foreground">
            Upcoming tasks with due dates.
          </p>
        </div>
      </div>

      {isLoading ? (
        <TaskListSkeleton count={4} />
      ) : (
        <ScheduledTaskList
          tasks={tasks || []}
          onToggleComplete={handleToggleComplete}
          onTaskClick={handleTaskClick}
          showProject
          showStatus
        />
      )}

      <TaskDetailDrawer
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
      />
    </div>
  );
}
