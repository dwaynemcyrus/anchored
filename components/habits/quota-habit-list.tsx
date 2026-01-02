"use client";

import { QuotaHabitCard, QuotaHabitCardCompact } from "./quota-habit-card";
import type { QuotaHabitWithStatus } from "@/lib/hooks/use-quota-habits";

interface QuotaHabitListProps {
  habits: QuotaHabitWithStatus[];
  onLogUsage: (habitId: string, amount: number) => void;
  onUndoUsage: (eventId: string) => void;
  loggingHabitId?: string | null;
  undoingEventId?: string | null;
  emptyMessage?: string;
  compact?: boolean;
}

export function QuotaHabitList({
  habits,
  onLogUsage,
  onUndoUsage,
  loggingHabitId,
  undoingEventId,
  emptyMessage = "No quota habits yet.",
  compact = false,
}: QuotaHabitListProps) {
  if (habits.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--muted-foreground)" }}>
        {emptyMessage}
      </div>
    );
  }

  if (compact) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {habits.map((habit) => (
          <QuotaHabitCardCompact
            key={habit.id}
            habit={habit}
            onLogUsage={onLogUsage}
            onUndoUsage={onUndoUsage}
            isLogging={loggingHabitId === habit.id}
            isUndoing={undoingEventId === habit.lastUsageEventId}
          />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {habits.map((habit) => (
        <QuotaHabitCard
          key={habit.id}
          habit={habit}
          onLogUsage={onLogUsage}
          onUndoUsage={onUndoUsage}
          isLogging={loggingHabitId === habit.id}
          isUndoing={undoingEventId === habit.lastUsageEventId}
        />
      ))}
    </div>
  );
}
