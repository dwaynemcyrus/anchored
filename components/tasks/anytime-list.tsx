"use client";

import { SortableTaskList } from "./sortable-task-list";
import type { TaskWithDetails } from "@/lib/hooks/use-tasks";

interface AnytimeTaskListProps {
  tasks: TaskWithDetails[];
  onToggleComplete: (task: TaskWithDetails) => void;
  onTaskClick?: (task: TaskWithDetails) => void;
  emptyMessage?: string;
}

type Group = {
  id: string;
  title: string;
  tasks: TaskWithDetails[];
};

function sortByTitle(a: Group, b: Group): number {
  return a.title.localeCompare(b.title);
}

function sortByOrder(a: TaskWithDetails, b: TaskWithDetails): number {
  return (a.sort_order || 0) - (b.sort_order || 0);
}

export function AnytimeTaskList({
  tasks,
  onToggleComplete,
  onTaskClick,
  emptyMessage = "No Anytime tasks",
}: AnytimeTaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const noProject: TaskWithDetails[] = [];
  const grouped = new Map<string, Group>();

  tasks.forEach((task) => {
    if (!task.project) {
      noProject.push(task);
      return;
    }

    const existing = grouped.get(task.project.id);
    if (existing) {
      existing.tasks.push(task);
    } else {
      grouped.set(task.project.id, {
        id: task.project.id,
        title: task.project.title,
        tasks: [task],
      });
    }
  });

  const groups = Array.from(grouped.values()).sort(sortByTitle);
  if (noProject.length > 0) {
    groups.unshift({
      id: "no-project",
      title: "No Project",
      tasks: noProject,
    });
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const groupTasks = [...group.tasks].sort(sortByOrder);
        return (
          <section key={group.id} className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              {group.title} ({groupTasks.length})
            </h3>
            <SortableTaskList
              tasks={groupTasks}
              onToggleComplete={onToggleComplete}
              onTaskClick={onTaskClick}
              showProject={false}
            />
          </section>
        );
      })}
    </div>
  );
}
