"use client";

import { ScheduleHabitCard, ScheduleHabitCardCompact } from "./schedule-habit-card";
import type { ScheduleHabitWithOccurrences } from "@/lib/hooks/use-schedule-habits";

interface ScheduleHabitListProps {
  habits: ScheduleHabitWithOccurrences[];
  onMarkComplete: (
    habitId: string,
    scheduledAt: Date,
    localDate: string
  ) => void;
  onMarkSkipped: (
    habitId: string,
    scheduledAt: Date,
    localDate: string
  ) => void;
  isMarking?: boolean;
  compact?: boolean;
}

export function ScheduleHabitList({
  habits,
  onMarkComplete,
  onMarkSkipped,
  isMarking,
  compact = false,
}: ScheduleHabitListProps) {
  if (habits.length === 0) {
    return null;
  }

  const CardComponent = compact ? ScheduleHabitCardCompact : ScheduleHabitCard;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {habits.map((habit) => (
        <CardComponent
          key={habit.id}
          habit={habit}
          onMarkComplete={onMarkComplete}
          onMarkSkipped={onMarkSkipped}
          isMarking={isMarking}
        />
      ))}
    </div>
  );
}
