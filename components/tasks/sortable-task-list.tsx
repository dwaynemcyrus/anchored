"use client";

import { useCallback, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableTaskItem } from "./sortable-task-item";
import { TaskItem } from "./task-item";
import { useReorderTasks, type TaskWithDetails } from "@/lib/hooks/use-tasks";
import type { TaskStatus } from "@/types/database";

interface SortableTaskListProps {
  tasks: TaskWithDetails[];
  onToggleComplete: (task: TaskWithDetails) => void;
  onTaskClick?: (task: TaskWithDetails) => void;
  onEdit?: (task: TaskWithDetails) => void;
  onDelete?: (task: TaskWithDetails) => void;
  showProject?: boolean;
  showStatus?: boolean;
  showTimer?: boolean;
  compact?: boolean;
  emptyMessage?: string;
  disabled?: boolean;
}

export function SortableTaskList({
  tasks,
  onToggleComplete,
  onTaskClick,
  onEdit,
  onDelete,
  showProject = false,
  showStatus = false,
  showTimer = true,
  compact = false,
  emptyMessage = "No tasks",
  disabled = false,
}: SortableTaskListProps) {
  const [activeTask, setActiveTask] = useState<TaskWithDetails | null>(null);
  const reorderTasks = useReorderTasks();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const task = tasks.find((t) => t.id === active.id);
      setActiveTask(task || null);
    },
    [tasks]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);

      if (!over || active.id === over.id) {
        return;
      }

      const oldIndex = tasks.findIndex((t) => t.id === active.id);
      const newIndex = tasks.findIndex((t) => t.id === over.id);

      if (oldIndex === -1 || newIndex === -1) {
        return;
      }

      // Reorder the array
      const reorderedTasks = arrayMove(tasks, oldIndex, newIndex);

      // Calculate new sort_order values
      const taskOrders = reorderedTasks.map((task, index) => ({
        id: task.id,
        sort_order: index * 10, // Use increments of 10 for future insertions
      }));

      // Update in database
      reorderTasks.mutate(taskOrders);
    },
    [tasks, reorderTasks]
  );

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const taskIds = tasks.map((t) => t.id);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 pl-6">
          {tasks.map((task) => (
            <SortableTaskItem
              key={task.id}
              task={task}
              onToggleComplete={onToggleComplete}
              onClick={onTaskClick}
              onEdit={onEdit}
              onDelete={onDelete}
              showProject={showProject}
              showStatus={showStatus}
              showTimer={showTimer}
              compact={compact}
              disabled={disabled}
            />
          ))}
        </div>
      </SortableContext>

      {/* Drag Overlay - shows the dragged item */}
      <DragOverlay>
        {activeTask ? (
          <div className="opacity-90 shadow-lg">
            <TaskItem
              task={activeTask}
              onToggleComplete={() => {}}
              showProject={showProject}
              showStatus={showStatus}
              compact={compact}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// Grouped sortable list for status sections
interface SortableTaskListGroupedProps {
  tasks: TaskWithDetails[];
  onToggleComplete: (task: TaskWithDetails) => void;
  onTaskClick?: (task: TaskWithDetails) => void;
  onEdit?: (task: TaskWithDetails) => void;
  onDelete?: (task: TaskWithDetails) => void;
  showProject?: boolean;
  disabled?: boolean;
}

const statusOrder: TaskStatus[] = ["today", "anytime", "inbox", "done"];
const statusLabels: Record<TaskStatus, string> = {
  inbox: "Inbox",
  today: "Today",
  anytime: "Anytime",
  done: "Completed",
};

export function SortableTaskListGrouped({
  tasks,
  onToggleComplete,
  onTaskClick,
  onEdit,
  onDelete,
  showProject = false,
  disabled = false,
}: SortableTaskListGroupedProps) {
  // Group tasks by status
  const groupedTasks = statusOrder.reduce(
    (acc, status) => {
      const statusTasks = tasks
        .filter((t) => t.status === status)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      if (statusTasks.length > 0) {
        acc[status] = statusTasks;
      }
      return acc;
    },
    {} as Record<TaskStatus, TaskWithDetails[]>
  );

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        No tasks
      </div>
    );
  }

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
            <SortableTaskList
              tasks={statusTasks}
              onToggleComplete={onToggleComplete}
              onTaskClick={onTaskClick}
              onEdit={onEdit}
              onDelete={onDelete}
              showProject={showProject}
              showTimer={status !== "done"}
              disabled={disabled}
            />
          </section>
        );
      })}
    </div>
  );
}

// Project detail variant - similar to ProjectTaskList but with sorting
interface SortableProjectTaskListProps {
  tasks: TaskWithDetails[];
  onToggleComplete: (task: TaskWithDetails) => void;
  onTaskClick?: (task: TaskWithDetails) => void;
  onEdit?: (task: TaskWithDetails) => void;
  onDelete?: (task: TaskWithDetails) => void;
}

export function SortableProjectTaskList({
  tasks,
  onToggleComplete,
  onTaskClick,
  onEdit,
  onDelete,
}: SortableProjectTaskListProps) {
  const todayTasks = tasks
    .filter((t) => t.status === "today")
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const anytimeTasks = tasks
    .filter((t) => t.status === "anytime")
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const inboxTasks = tasks
    .filter((t) => t.status === "inbox")
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const doneTasks = tasks
    .filter((t) => t.status === "done")
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

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
          <SortableTaskList
            tasks={todayTasks}
            onToggleComplete={onToggleComplete}
            onTaskClick={onTaskClick}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </section>
      )}

      {/* Anytime */}
      {anytimeTasks.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Anytime ({anytimeTasks.length})
          </h3>
          <SortableTaskList
            tasks={anytimeTasks}
            onToggleComplete={onToggleComplete}
            onTaskClick={onTaskClick}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </section>
      )}

      {/* Inbox (tasks in project but not scheduled) */}
      {inboxTasks.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Inbox ({inboxTasks.length})
          </h3>
          <SortableTaskList
            tasks={inboxTasks}
            onToggleComplete={onToggleComplete}
            onTaskClick={onTaskClick}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </section>
      )}

      {/* Empty active state */}
      {!hasActiveTasks && doneTasks.length > 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
          All tasks completed!
        </div>
      )}

      {/* Completed - no drag handle */}
      {doneTasks.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Completed ({doneTasks.length})
          </h3>
          <SortableTaskList
            tasks={doneTasks}
            onToggleComplete={onToggleComplete}
            onTaskClick={onTaskClick}
            onEdit={onEdit}
            onDelete={onDelete}
            disabled
          />
        </section>
      )}
    </div>
  );
}
