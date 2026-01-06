"use client";

import { useState } from "react";
import { Layers } from "lucide-react";
import { QuickAdd } from "@/components/tasks/quick-add";
import { AnytimeTaskList } from "@/components/tasks/anytime-list";
import { TaskDetailDrawer } from "@/components/tasks/task-detail-drawer";
import { TaskListSkeleton } from "@/components/skeletons";
import {
  useAnytimeTasks,
  useToggleTaskComplete,
  type TaskWithDetails,
} from "@/lib/hooks/use-tasks";

export default function AnytimePage() {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const { data: tasks, isLoading } = useAnytimeTasks();
  const toggleComplete = useToggleTaskComplete();

  const handleToggleComplete = (task: TaskWithDetails) => {
    toggleComplete.mutate(task);
  };

  const handleTaskClick = (task: TaskWithDetails) => {
    setSelectedTaskId(task.id);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-start gap-3 px-4 pt-4 md:px-6 md:pt-6">
        <div className="rounded-lg bg-muted p-2">
          <Layers className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Anytime</h1>
          <p className="text-sm text-muted-foreground">
            Tasks without due dates, grouped by project.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 md:px-6">
        <div className="space-y-6 pt-6">
          <QuickAdd
            defaultLocation="anytime"
            placeholder="Add an anytime task... (# for project, @ for status)"
          />

          {isLoading ? (
            <TaskListSkeleton count={4} />
          ) : (
            <AnytimeTaskList
              tasks={tasks || []}
              onToggleComplete={handleToggleComplete}
              onTaskClick={handleTaskClick}
            />
          )}
        </div>
      </div>

      <TaskDetailDrawer
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
      />
    </div>
  );
}
