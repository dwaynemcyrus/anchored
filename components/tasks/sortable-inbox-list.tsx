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
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { InboxTaskItem } from "./inbox-task-item";
import { useReorderTasks, type TaskWithDetails } from "@/lib/hooks/use-tasks";
import type { Project } from "@/types/database";

interface SortableInboxItemProps {
  task: TaskWithDetails;
  projects: Pick<Project, "id" | "title">[];
  onMoveToToday: (task: TaskWithDetails) => void;
  onMoveToAnytime: (task: TaskWithDetails) => void;
  onAssignProject: (task: TaskWithDetails, projectId: string | null) => void;
  onDelete: (task: TaskWithDetails) => void;
  onComplete: (task: TaskWithDetails) => void;
  isProcessing?: boolean;
}

function SortableInboxItem({
  task,
  projects,
  onMoveToToday,
  onMoveToAnytime,
  onAssignProject,
  onDelete,
  onComplete,
  isProcessing = false,
}: SortableInboxItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: isProcessing,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group/sortable",
        isDragging && "z-50 opacity-90"
      )}
    >
      {/* Drag Handle */}
      {!isProcessing && (
        <button
          type="button"
          className={cn(
            "absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-1",
            "opacity-0 group-hover/sortable:opacity-100 transition-opacity",
            "cursor-grab active:cursor-grabbing touch-none",
            "text-muted-foreground hover:text-foreground",
            isDragging && "opacity-100"
          )}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>
      )}

      <div
        className={cn(
          isDragging && "ring-2 ring-primary ring-offset-2 rounded-lg"
        )}
      >
        <InboxTaskItem
          task={task}
          projects={projects}
          onMoveToToday={onMoveToToday}
          onMoveToAnytime={onMoveToAnytime}
          onAssignProject={onAssignProject}
          onDelete={onDelete}
          onComplete={onComplete}
          isProcessing={isProcessing}
        />
      </div>
    </div>
  );
}

interface SortableInboxListProps {
  tasks: TaskWithDetails[];
  projects: Pick<Project, "id" | "title">[];
  onMoveToToday: (task: TaskWithDetails) => void;
  onMoveToAnytime: (task: TaskWithDetails) => void;
  onAssignProject: (task: TaskWithDetails, projectId: string | null) => void;
  onDelete: (task: TaskWithDetails) => void;
  onComplete: (task: TaskWithDetails) => void;
  isProcessing?: boolean;
}

export function SortableInboxList({
  tasks,
  projects,
  onMoveToToday,
  onMoveToAnytime,
  onAssignProject,
  onDelete,
  onComplete,
  isProcessing = false,
}: SortableInboxListProps) {
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
        sort_order: index * 10,
      }));

      // Update in database
      reorderTasks.mutate(taskOrders);
    },
    [tasks, reorderTasks]
  );

  if (tasks.length === 0) {
    return null;
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
        <div className="space-y-3 pl-6">
          {tasks.map((task) => (
            <SortableInboxItem
              key={task.id}
              task={task}
              projects={projects}
              onMoveToToday={onMoveToToday}
              onMoveToAnytime={onMoveToAnytime}
              onAssignProject={onAssignProject}
              onDelete={onDelete}
              onComplete={onComplete}
              isProcessing={isProcessing}
            />
          ))}
        </div>
      </SortableContext>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeTask ? (
          <div className="opacity-90 shadow-lg">
            <InboxTaskItem
              task={activeTask}
              projects={projects}
              onMoveToToday={() => {}}
              onMoveToAnytime={() => {}}
              onAssignProject={() => {}}
              onDelete={() => {}}
              onComplete={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
