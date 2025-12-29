"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { HabitCard } from "./habit-card";
import type { HabitWithStreak } from "@/lib/hooks/use-habits";

interface SortableHabitCardProps {
  habit: HabitWithStreak;
  onToggle: (habitId: string, completed: boolean) => void;
  onEdit: (habit: HabitWithStreak) => void;
  onArchive: (habitId: string) => void;
  isToggling?: boolean;
  isArchiving?: boolean;
  disabled?: boolean;
}

export function SortableHabitCard({
  habit,
  onToggle,
  onEdit,
  onArchive,
  isToggling = false,
  isArchiving = false,
  disabled = false,
}: SortableHabitCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: habit.id,
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
          <GripVertical className="h-5 w-5" />
        </button>
      )}

      <div
        className={cn(
          isDragging && "ring-2 ring-primary ring-offset-2 rounded-lg"
        )}
      >
        <HabitCard
          habit={habit}
          onToggle={onToggle}
          onEdit={onEdit}
          onArchive={onArchive}
          isToggling={isToggling}
          isArchiving={isArchiving}
        />
      </div>
    </div>
  );
}
