"use client";

import { AvoidHabitCard, AvoidHabitCardCompact } from "./avoid-habit-card";
import type { AvoidHabitWithStatus } from "@/lib/hooks/use-avoid-habits";

interface AvoidHabitListProps {
  habits: AvoidHabitWithStatus[];
  onLogSlip: (habitId: string) => void;
  onUndoSlip: (habitId: string) => void;
  onExcludeToday: (habitId: string, excluded: boolean) => void;
  onEdit: (habit: AvoidHabitWithStatus) => void;
  onArchive: (habitId: string) => void;
  loggingSlipId?: string | null;
  undoingSlipId?: string | null;
  archivingId?: string | null;
  emptyMessage?: string;
  compact?: boolean;
}

export function AvoidHabitList({
  habits,
  onLogSlip,
  onUndoSlip,
  onExcludeToday,
  onEdit,
  onArchive,
  loggingSlipId,
  undoingSlipId,
  archivingId,
  emptyMessage = "No avoid habits yet.",
  compact = false,
}: AvoidHabitListProps) {
  if (habits.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {habits.map((habit) => (
          <AvoidHabitCardCompact
            key={habit.id}
            habit={habit}
            onLogSlip={onLogSlip}
            onUndoSlip={onUndoSlip}
            isLoggingSlip={loggingSlipId === habit.id}
            isUndoingSlip={undoingSlipId === habit.id}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {habits.map((habit) => (
        <AvoidHabitCard
          key={habit.id}
          habit={habit}
          onLogSlip={onLogSlip}
          onUndoSlip={onUndoSlip}
          onExcludeToday={onExcludeToday}
          onEdit={onEdit}
          onArchive={onArchive}
          isLoggingSlip={loggingSlipId === habit.id}
          isUndoingSlip={undoingSlipId === habit.id}
          isArchiving={archivingId === habit.id}
        />
      ))}
    </div>
  );
}
