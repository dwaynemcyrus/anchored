"use client";

import { TaskItem } from "./task-item";
import type { TaskWithDetails } from "@/lib/hooks/use-tasks";
import type { TaskStatus } from "@/types/database";

interface TaskListProps {
  tasks: TaskWithDetails[];
  onToggleComplete: (task: TaskWithDetails) => void;
  onTaskClick?: (task: TaskWithDetails) => void;
  showProject?: boolean;
  showTimer?: boolean;
  groupByStatus?: boolean;
  emptyMessage?: string;
}

const statusOrder: TaskStatus[] = ["today", "anytime", "inbox", "done"];

const statusLabels: Record<TaskStatus, string> = {
  inbox: "Inbox",
  today: "Today",
  anytime: "Anytime",
  done: "Completed",
};

export function TaskList({
  tasks,
  onToggleComplete,
  onTaskClick,
  showProject = false,
  showTimer = true,
  groupByStatus = false,
  emptyMessage = "No tasks",
}: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  if (!groupByStatus) {
    return (
      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggleComplete={onToggleComplete}
            onClick={onTaskClick}
            showProject={showProject}
            showTimer={showTimer}
          />
        ))}
      </div>
    );
  }

  // Group tasks by status
  const groupedTasks = statusOrder.reduce(
    (acc, status) => {
      const statusTasks = tasks.filter((t) => t.status === status);
      if (statusTasks.length > 0) {
        acc[status] = statusTasks;
      }
      return acc;
    },
    {} as Record<TaskStatus, TaskWithDetails[]>
  );

  return (
    <div className="space-y-6">
      {statusOrder.map((status) => {
        const statusTasks = groupedTasks[status];
        if (!statusTasks || statusTasks.length === 0) return null;

        return (
          <section key={status}>
            <h3 className="mb-3 text-sm font-medium text-muted-foreground">
              {statusLabels[status]} ({statusTasks.length})
            </h3>
            <div className="space-y-2">
              {statusTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggleComplete={onToggleComplete}
                  onClick={onTaskClick}
                  showProject={showProject}
                  showTimer={showTimer && task.status !== "done"}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// Variant for project detail page - shows only active statuses
interface ProjectTaskListProps {
  tasks: TaskWithDetails[];
  onToggleComplete: (task: TaskWithDetails) => void;
  onTaskClick?: (task: TaskWithDetails) => void;
  onEdit?: (task: TaskWithDetails) => void;
  onDelete?: (task: TaskWithDetails) => void;
}

export function ProjectTaskList({
  tasks,
  onToggleComplete,
  onTaskClick,
  onEdit,
  onDelete,
}: ProjectTaskListProps) {
  const todayTasks = tasks.filter((t) => t.status === "today");
  const anytimeTasks = tasks.filter((t) => t.status === "anytime");
  const inboxTasks = tasks.filter((t) => t.status === "inbox");
  const doneTasks = tasks.filter((t) => t.status === "done");

  const hasActiveTasks =
    todayTasks.length > 0 ||
    anytimeTasks.length > 0 ||
    inboxTasks.length > 0;

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        No tasks in this project
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Today */}
      {todayTasks.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Today ({todayTasks.length})
          </h3>
          <div className="space-y-2">
            {todayTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggleComplete={onToggleComplete}
                onClick={onTaskClick}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </section>
      )}

      {/* Anytime */}
      {anytimeTasks.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Anytime ({anytimeTasks.length})
          </h3>
          <div className="space-y-2">
            {anytimeTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggleComplete={onToggleComplete}
                onClick={onTaskClick}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </section>
      )}

      {/* Inbox (tasks in project but not scheduled) */}
      {inboxTasks.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Inbox ({inboxTasks.length})
          </h3>
          <div className="space-y-2">
            {inboxTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggleComplete={onToggleComplete}
                onClick={onTaskClick}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty active state */}
      {!hasActiveTasks && doneTasks.length > 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
          All tasks completed!
        </div>
      )}

      {/* Completed */}
      {doneTasks.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Completed ({doneTasks.length})
          </h3>
          <div className="space-y-2">
            {doneTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggleComplete={onToggleComplete}
                onClick={onTaskClick}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
