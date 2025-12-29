"use client";

import { addDays, isSameDay, startOfDay } from "date-fns";
import { TaskItem } from "./task-item";
import type { TaskWithDetails } from "@/lib/hooks/use-tasks";

type ScheduledSection = "tomorrow" | "thisWeek" | "later";

const sectionLabels: Record<ScheduledSection, string> = {
  tomorrow: "Tomorrow",
  thisWeek: "This Week",
  later: "Later",
};

interface ScheduledTaskListProps {
  tasks: TaskWithDetails[];
  onToggleComplete: (task: TaskWithDetails) => void;
  onTaskClick?: (task: TaskWithDetails) => void;
  showProject?: boolean;
  showStatus?: boolean;
  emptyMessage?: string;
}

function parseDueDate(dueDate: string): Date {
  return startOfDay(new Date(dueDate));
}

function sortByDueDate(a: TaskWithDetails, b: TaskWithDetails): number {
  if (!a.due_date && !b.due_date) return 0;
  if (!a.due_date) return 1;
  if (!b.due_date) return -1;

  const aDate = parseDueDate(a.due_date);
  const bDate = parseDueDate(b.due_date);
  const diff = aDate.getTime() - bDate.getTime();

  if (diff !== 0) return diff;

  return (a.sort_order || 0) - (b.sort_order || 0);
}

export function ScheduledTaskList({
  tasks,
  onToggleComplete,
  onTaskClick,
  showProject = false,
  showStatus = true,
  emptyMessage = "No scheduled tasks",
}: ScheduledTaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const thisWeekCutoff = addDays(today, 7);

  const grouped: Record<ScheduledSection, TaskWithDetails[]> = {
    tomorrow: [],
    thisWeek: [],
    later: [],
  };

  const sortedTasks = [...tasks].sort(sortByDueDate);

  sortedTasks.forEach((task) => {
    if (!task.due_date) {
      grouped.later.push(task);
      return;
    }

    const dueDate = parseDueDate(task.due_date);

    if (isSameDay(dueDate, tomorrow)) {
      grouped.tomorrow.push(task);
    } else if (dueDate.getTime() <= thisWeekCutoff.getTime()) {
      grouped.thisWeek.push(task);
    } else {
      grouped.later.push(task);
    }
  });

  return (
    <div className="space-y-6">
      {(Object.keys(grouped) as ScheduledSection[]).map((section) => {
        const sectionTasks = grouped[section];
        if (sectionTasks.length === 0) return null;

        return (
          <section key={section}>
            <h3 className="mb-3 text-sm font-medium text-muted-foreground">
              {sectionLabels[section]} ({sectionTasks.length})
            </h3>
            <div className="space-y-2">
              {sectionTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggleComplete={onToggleComplete}
                  onClick={onTaskClick}
                  showProject={showProject}
                  showStatus={showStatus}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
