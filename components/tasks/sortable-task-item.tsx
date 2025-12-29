"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskItem } from "./task-item";
import type { TaskWithDetails } from "@/lib/hooks/use-tasks";

interface SortableTaskItemProps {
  task: TaskWithDetails;
  onToggleComplete: (task: TaskWithDetails) => void;
  onClick?: (task: TaskWithDetails) => void;
  onEdit?: (task: TaskWithDetails) => void;
  onDelete?: (task: TaskWithDetails) => void;
  showProject?: boolean;
  showStatus?: boolean;
  showTimer?: boolean;
  compact?: boolean;
  disabled?: boolean;
}

export function SortableTaskItem({
  task,
  onToggleComplete,
  onClick,
  onEdit,
  onDelete,
  showProject = false,
  showStatus = false,
  showTimer = true,
  compact = false,
  disabled = false,
}: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled,
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
      {!disabled && (
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
          <GripVertical className={cn("h-5 w-5", compact && "h-4 w-4")} />
        </button>
      )}

      <div
        className={cn(
          isDragging && "ring-2 ring-primary ring-offset-2 rounded-lg"
        )}
      >
        <TaskItem
          task={task}
          onToggleComplete={onToggleComplete}
          onClick={onClick}
          onEdit={onEdit}
          onDelete={onDelete}
          showProject={showProject}
          showStatus={showStatus}
          showTimer={showTimer}
          compact={compact}
        />
      </div>
    </div>
  );
}
