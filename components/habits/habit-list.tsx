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
import { SortableHabitCard } from "./sortable-habit-card";
import { HabitCard } from "./habit-card";
import {
  useReorderHabits,
  useToggleHabitToday,
  useArchiveHabit,
  type HabitWithStreak,
} from "@/lib/hooks/use-habits";

interface HabitListProps {
  habits: HabitWithStreak[];
  onEdit: (habit: HabitWithStreak) => void;
  emptyMessage?: string;
  disabled?: boolean;
}

export function HabitList({
  habits,
  onEdit,
  emptyMessage = "No habits yet. Create one to get started!",
  disabled = false,
}: HabitListProps) {
  const [activeHabit, setActiveHabit] = useState<HabitWithStreak | null>(null);
  const [togglingHabits, setTogglingHabits] = useState<Set<string>>(new Set());
  const [archivingHabits, setArchivingHabits] = useState<Set<string>>(new Set());

  const reorderHabits = useReorderHabits();
  const toggleHabit = useToggleHabitToday();
  const archiveHabit = useArchiveHabit();

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
      const habit = habits.find((h) => h.id === active.id);
      setActiveHabit(habit || null);
    },
    [habits]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveHabit(null);

      if (!over || active.id === over.id) {
        return;
      }

      const oldIndex = habits.findIndex((h) => h.id === active.id);
      const newIndex = habits.findIndex((h) => h.id === over.id);

      if (oldIndex === -1 || newIndex === -1) {
        return;
      }

      // Reorder the array
      const reorderedHabits = arrayMove(habits, oldIndex, newIndex);

      // Calculate new sort_order values
      const habitOrders = reorderedHabits.map((habit, index) => ({
        id: habit.id,
        sort_order: index * 10,
      }));

      // Update in database
      reorderHabits.mutate(habitOrders);
    },
    [habits, reorderHabits]
  );

  const handleToggle = useCallback(
    (habitId: string, completed: boolean) => {
      setTogglingHabits((prev) => new Set(prev).add(habitId));
      toggleHabit.mutate(
        { habitId, completed },
        {
          onSettled: () => {
            setTogglingHabits((prev) => {
              const next = new Set(prev);
              next.delete(habitId);
              return next;
            });
          },
        }
      );
    },
    [toggleHabit]
  );

  const handleArchive = useCallback(
    (habitId: string) => {
      setArchivingHabits((prev) => new Set(prev).add(habitId));
      archiveHabit.mutate(habitId, {
        onSettled: () => {
          setArchivingHabits((prev) => {
            const next = new Set(prev);
            next.delete(habitId);
            return next;
          });
        },
      });
    },
    [archiveHabit]
  );

  if (habits.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const habitIds = habits.map((h) => h.id);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={habitIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 pl-6">
          {habits.map((habit) => (
            <SortableHabitCard
              key={habit.id}
              habit={habit}
              onToggle={handleToggle}
              onEdit={onEdit}
              onArchive={handleArchive}
              isToggling={togglingHabits.has(habit.id)}
              isArchiving={archivingHabits.has(habit.id)}
              disabled={disabled}
            />
          ))}
        </div>
      </SortableContext>

      {/* Drag Overlay - shows the dragged item */}
      <DragOverlay>
        {activeHabit ? (
          <div className="opacity-90 shadow-lg">
            <HabitCard
              habit={activeHabit}
              onToggle={() => {}}
              onEdit={() => {}}
              onArchive={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
