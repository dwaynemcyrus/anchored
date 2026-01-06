"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HabitForm, HabitList, AvoidHabitList, QuotaHabitList, BuildHabitList, ScheduleHabitList } from "@/components/habits";
import {
  useHabits,
  useCreateHabit,
  useUpdateHabit,
  type HabitWithStreak,
} from "@/lib/hooks/use-habits";
import {
  useAvoidHabits,
  useLogSlip,
  useUndoSlip,
  useSetDayExcluded,
} from "@/lib/hooks/use-avoid-habits";
import {
  useQuotaHabits,
  useLogUsage,
  useUndoUsage,
} from "@/lib/hooks/use-quota-habits";
import {
  useBuildHabits,
  useLogProgress,
  useUndoProgress,
} from "@/lib/hooks/use-build-habits";
import {
  useScheduleHabits,
  useMarkOccurrence,
} from "@/lib/hooks/use-schedule-habits";
import { Skeleton } from "@/components/ui/skeleton";
import { getTodayLocalDateString, getBrowserTimezone } from "@/lib/time/local-date";
import type { HabitFormValues } from "@/components/habits/habit-form";

export default function HabitsPage() {
  const [showArchived, setShowArchived] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitWithStreak | null>(null);

  // Build habits (positive habits)
  const { data: habits, isLoading: habitsLoading } = useHabits(
    showArchived ? undefined : { active: true }
  );
  const updateHabit = useUpdateHabit();

  // Avoid habits
  const { data: avoidHabits, isLoading: avoidLoading } = useAvoidHabits(
    showArchived ? undefined : { active: true }
  );
  const logSlip = useLogSlip();
  const undoSlip = useUndoSlip();
  const setDayExcluded = useSetDayExcluded();

  // Quota habits
  const { data: quotaHabits, isLoading: quotaLoading } = useQuotaHabits(
    showArchived ? undefined : { active: true }
  );
  const logUsage = useLogUsage();
  const undoUsage = useUndoUsage();

  // Build habits (new type system)
  const { data: buildHabits, isLoading: buildLoading, isError: buildError } = useBuildHabits(
    showArchived ? undefined : { active: true }
  );
  const logProgress = useLogProgress();
  const undoProgress = useUndoProgress();

  // Schedule habits
  const { data: scheduleHabits, isLoading: scheduleLoading, isError: scheduleError } = useScheduleHabits(
    showArchived ? undefined : { active: true }
  );
  const markOccurrence = useMarkOccurrence();

  // Don't block page load if new habit type queries fail (new tables may not exist yet)
  const isLoading = habitsLoading || avoidLoading || quotaLoading || (buildLoading && !buildError) || (scheduleLoading && !scheduleError);

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
    setEditingHabit(null);
  };

  // Separate active and archived build habits
  const activeHabits = habits?.filter((h) => h.active) || [];
  const archivedHabits = habits?.filter((h) => !h.active) || [];

  // Separate active and archived avoid habits
  const activeAvoidHabits = avoidHabits?.filter((h) => h.active) || [];
  const archivedAvoidHabits = avoidHabits?.filter((h) => !h.active) || [];

  // Separate active and archived quota habits
  const activeQuotaHabits = quotaHabits?.filter((h) => h.active) || [];
  const archivedQuotaHabits = quotaHabits?.filter((h) => !h.active) || [];

  // Separate active and archived build habits (new type system)
  const activeBuildHabits = buildHabits?.filter((h) => h.active) || [];
  const archivedBuildHabits = buildHabits?.filter((h) => !h.active) || [];

  // Separate active and archived schedule habits
  const activeScheduleHabits = scheduleHabits?.filter((h) => h.active) || [];
  const archivedScheduleHabits = scheduleHabits?.filter((h) => !h.active) || [];

  // Calculate completion stats for legacy build habits
  const completedCount = activeHabits.filter((h) => h.completedToday).length;
  const totalActive = activeHabits.length;

  // Calculate completion stats for new build habits
  const buildCompletedCount = activeBuildHabits.filter((h) => h.status === "complete").length;
  const buildTotalActive = activeBuildHabits.length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-4 md:px-6 md:pt-6">
        <div>
          <h1 className="text-2xl font-semibold">Habits</h1>
          <p className="text-muted-foreground">
            Track your daily habits and build streaks.
          </p>
        </div>
        <Button asChild>
          <Link href="/habits/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Habit
          </Link>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 md:px-6">
        <div className="space-y-8 pt-6">
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

      {/* Loading */}
      {isLoading ? (
        <HabitListSkeleton count={3} />
      ) : (
        <div className="space-y-10">
          {/* Avoid Habits Section */}
          {(activeAvoidHabits.length > 0 || (showArchived && archivedAvoidHabits.length > 0)) && (
            <section className="space-y-4">
              <h2 className="text-lg font-medium">Avoid</h2>
              <AvoidHabitList
                habits={activeAvoidHabits}
                onLogSlip={(habitId) => logSlip.mutate({ habitId })}
                onUndoSlip={(slipId) => undoSlip.mutate(slipId)}
                onExcludeToday={(id, excluded) => setDayExcluded.mutate({
                  habitId: id,
                  localDate: getTodayLocalDateString(getBrowserTimezone()),
                  excluded
                })}
                onEdit={() => {}}
                onArchive={() => {}}
              />
              {showArchived && archivedAvoidHabits.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Archived ({archivedAvoidHabits.length})
                  </h3>
                  <AvoidHabitList
                    habits={archivedAvoidHabits}
                    onLogSlip={() => {}}
                    onUndoSlip={() => {}}
                    onExcludeToday={() => {}}
                    onEdit={() => {}}
                    onArchive={() => {}}
                  />
                </div>
              )}
            </section>
          )}

          {/* Quota Habits Section */}
          {(activeQuotaHabits.length > 0 || (showArchived && archivedQuotaHabits.length > 0)) && (
            <section className="space-y-4">
              <h2 className="text-lg font-medium">Limit</h2>
              <QuotaHabitList
                habits={activeQuotaHabits}
                onLogUsage={(habitId, amount) => logUsage.mutate({ habitId, amount })}
                onUndoUsage={(eventId) => undoUsage.mutate(eventId)}
              />
              {showArchived && archivedQuotaHabits.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Archived ({archivedQuotaHabits.length})
                  </h3>
                  <QuotaHabitList
                    habits={archivedQuotaHabits}
                    onLogUsage={() => {}}
                    onUndoUsage={() => {}}
                  />
                </div>
              )}
            </section>
          )}

          {/* Build Habits Section */}
          {(activeBuildHabits.length > 0 || (showArchived && archivedBuildHabits.length > 0)) && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">Build</h2>
                {buildTotalActive > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{buildCompletedCount}</span>
                    {" / "}
                    {buildTotalActive} complete
                    {buildCompletedCount === buildTotalActive && buildTotalActive > 0 && (
                      <span className="font-medium text-green-600 dark:text-green-400 ml-2">
                        All done!
                      </span>
                    )}
                  </div>
                )}
              </div>
              <BuildHabitList
                habits={activeBuildHabits}
                onLogProgress={(habitId, amount) => logProgress.mutate({ habitId, amount })}
                onUndoProgress={(eventId) => undoProgress.mutate(eventId)}
              />

              {showArchived && archivedBuildHabits.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Archived ({archivedBuildHabits.length})
                  </h3>
                  <BuildHabitList
                    habits={archivedBuildHabits}
                    onLogProgress={() => {}}
                    onUndoProgress={() => {}}
                  />
                </div>
              )}
            </section>
          )}

          {/* Schedule Habits Section */}
          {(activeScheduleHabits.length > 0 || (showArchived && archivedScheduleHabits.length > 0)) && (
            <section className="space-y-4">
              <h2 className="text-lg font-medium">Schedule</h2>
              <ScheduleHabitList
                habits={activeScheduleHabits}
                onMarkComplete={(habitId, scheduledAt, localDate) =>
                  markOccurrence.mutate({ habitId, scheduledAt, localDate, status: "completed" })
                }
                onMarkSkipped={(habitId, scheduledAt, localDate) =>
                  markOccurrence.mutate({ habitId, scheduledAt, localDate, status: "skipped" })
                }
                isMarking={markOccurrence.isPending}
              />
              {showArchived && archivedScheduleHabits.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Archived ({archivedScheduleHabits.length})
                  </h3>
                  <ScheduleHabitList
                    habits={archivedScheduleHabits}
                    onMarkComplete={() => {}}
                    onMarkSkipped={() => {}}
                  />
                </div>
              )}
            </section>
          )}

          {/* Empty state */}
          {activeAvoidHabits.length === 0 && activeQuotaHabits.length === 0 && activeBuildHabits.length === 0 && activeScheduleHabits.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No habits yet.</p>
              <p className="mt-1">
                <Link href="/habits/new" className="text-primary hover:underline">
                  Create your first habit
                </Link>
              </p>
            </div>
          )}
        </div>
      )}
        </div>
      </div>

      {/* Edit Build Habit Dialog */}
      <Dialog
        open={!!editingHabit}
        onOpenChange={(open) => {
          if (!open) handleCloseForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Habit</DialogTitle>
          </DialogHeader>
          <HabitForm
            habit={editingHabit || undefined}
            onSubmit={handleUpdateHabit}
            onCancel={handleCloseForm}
            isLoading={updateHabit.isPending}
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
