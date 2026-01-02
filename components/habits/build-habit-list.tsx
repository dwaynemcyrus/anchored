"use client";

import { BuildHabitCard, BuildHabitCardCompact } from "./build-habit-card";
import type { BuildHabitWithStatus } from "@/lib/hooks/use-build-habits";

interface BuildHabitListProps {
  habits: BuildHabitWithStatus[];
  onLogProgress: (habitId: string, amount: number) => void;
  onUndoProgress: (eventId: string) => void;
  loggingHabitId?: string | null;
  undoingEventId?: string | null;
  emptyMessage?: string;
  compact?: boolean;
}

export function BuildHabitList({
  habits,
  onLogProgress,
  onUndoProgress,
  loggingHabitId,
  undoingEventId,
  emptyMessage = "No build habits yet.",
  compact = false,
}: BuildHabitListProps) {
  if (habits.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "2rem", color: "var(--muted-foreground)" }}>
        {emptyMessage}
      </div>
    );
  }

  if (compact) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {habits.map((habit) => (
          <BuildHabitCardCompact
            key={habit.id}
            habit={habit}
            onLogProgress={onLogProgress}
            onUndoProgress={onUndoProgress}
            isLogging={loggingHabitId === habit.id}
            isUndoing={undoingEventId === habit.lastEventId}
          />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {habits.map((habit) => (
        <BuildHabitCard
          key={habit.id}
          habit={habit}
          onLogProgress={onLogProgress}
          onUndoProgress={onUndoProgress}
          isLogging={loggingHabitId === habit.id}
          isUndoing={undoingEventId === habit.lastEventId}
        />
      ))}
    </div>
  );
}
