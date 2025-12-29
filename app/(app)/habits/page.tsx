"use client";

import { useState } from "react";
import { Plus, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HabitForm, HabitList } from "@/components/habits";
import {
  useHabits,
  useCreateHabit,
  useUpdateHabit,
  type HabitWithStreak,
} from "@/lib/hooks/use-habits";
import { Skeleton } from "@/components/ui/skeleton";
import type { HabitFormValues } from "@/components/habits/habit-form";

export default function HabitsPage() {
  const [showArchived, setShowArchived] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitWithStreak | null>(null);

  const { data: habits, isLoading } = useHabits(
    showArchived ? undefined : { active: true }
  );
  const createHabit = useCreateHabit();
  const updateHabit = useUpdateHabit();

  const handleCreateHabit = async (values: HabitFormValues) => {
    await createHabit.mutateAsync(values);
    setIsFormOpen(false);
  };

  const handleUpdateHabit = async (values: HabitFormValues) => {
    if (!editingHabit) return;
    await updateHabit.mutateAsync({
      id: editingHabit.id,
      ...values,
    });
    setEditingHabit(null);
  };

  const handleEdit = (habit: HabitWithStreak) => {
    setEditingHabit(habit);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingHabit(null);
  };

  // Separate active and archived habits
  const activeHabits = habits?.filter((h) => h.active) || [];
  const archivedHabits = habits?.filter((h) => !h.active) || [];

  // Calculate completion stats
  const completedCount = activeHabits.filter((h) => h.completedToday).length;
  const totalActive = activeHabits.length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Habits</h1>
          <p className="text-muted-foreground">
            Track your daily habits and build streaks.
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Habit
        </Button>
      </div>

      {/* Stats */}
      {!isLoading && totalActive > 0 && (
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{completedCount}</span>
            {" / "}
            {totalActive} completed today
          </div>
          {completedCount === totalActive && totalActive > 0 && (
            <span className="text-sm font-medium text-green-600 dark:text-green-400">
              All done!
            </span>
          )}
        </div>
      )}

      {/* Toggle Archived */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowArchived(!showArchived)}
        >
          {showArchived ? (
            <>
              <EyeOff className="mr-2 h-4 w-4" />
              Hide Archived
            </>
          ) : (
            <>
              <Eye className="mr-2 h-4 w-4" />
              Show Archived
            </>
          )}
        </Button>
      </div>

      {/* Habit List */}
      {isLoading ? (
        <HabitListSkeleton count={3} />
      ) : (
        <div className="space-y-8">
          {/* Active Habits */}
          <HabitList
            habits={activeHabits}
            onEdit={handleEdit}
            emptyMessage="No habits yet. Click 'Add Habit' to create your first one!"
          />

          {/* Archived Habits */}
          {showArchived && archivedHabits.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-medium text-muted-foreground">
                Archived ({archivedHabits.length})
              </h2>
              <HabitList
                habits={archivedHabits}
                onEdit={handleEdit}
                disabled
                emptyMessage="No archived habits"
              />
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={isFormOpen || !!editingHabit}
        onOpenChange={(open) => {
          if (!open) handleCloseForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingHabit ? "Edit Habit" : "Create Habit"}
            </DialogTitle>
          </DialogHeader>
          <HabitForm
            habit={editingHabit || undefined}
            onSubmit={editingHabit ? handleUpdateHabit : handleCreateHabit}
            onCancel={handleCloseForm}
            isLoading={createHabit.isPending || updateHabit.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Loading skeleton for habits
function HabitListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3 pl-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border bg-card p-4"
        >
          <div className="flex items-start gap-4">
            <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
              <div className="flex items-center gap-1.5 mt-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
