"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { addDays, format, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import styles from "./page.module.css";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useInboxTasks,
  useNowTasks,
  useTasks,
  useSetNowSlot,
  useSwapNowSlots,
  useUpdateTask,
  useUpdateTaskStatus,
} from "@/lib/hooks/use-tasks";
import { useLatestDocument } from "@/lib/hooks/use-documents";
import {
  useActiveTimer,
  useTimerControls,
  useDailyTotalsByDate,
  useTodayTimeEntries,
} from "@/lib/hooks/use-timer";
import { formatDuration, formatTimerDisplay } from "@/lib/utils/formatting";
import {
  useActiveAvoidHabits,
  useLogSlip,
  useUndoSlip,
  useSetDayExcluded,
} from "@/lib/hooks/use-avoid-habits";
import {
  useActiveQuotaHabits,
  useLogUsage,
  useUndoUsage,
} from "@/lib/hooks/use-quota-habits";
import {
  useActiveBuildHabits,
  useLogProgress,
  useUndoProgress,
} from "@/lib/hooks/use-build-habits";
import {
  useActiveScheduleHabits,
  useMarkOccurrence,
} from "@/lib/hooks/use-schedule-habits";
import { AvoidHabitCardCompact, QuotaHabitCardCompact, BuildHabitCardCompact, ScheduleHabitCardCompact } from "@/components/habits";

export default function TodayPage() {
  const [showSwapDialog, setShowSwapDialog] = useState(false);
  const [showReleaseDialog, setShowReleaseDialog] = useState(false);
  const [releaseTaskId, setReleaseTaskId] = useState<string | null>(null);
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [promoteTaskId, setPromoteTaskId] = useState<string | null>(null);
  const [promoteSlot, setPromoteSlot] = useState<"primary" | "secondary" | null>(
    null
  );
  const [showQuickStopDialog, setShowQuickStopDialog] = useState(false);
  const [quickStopAction, setQuickStopAction] = useState<
    "promote" | "swap" | null
  >(null);
  const [quickStopNotes, setQuickStopNotes] = useState("");
  const [showTimerDialog, setShowTimerDialog] = useState(false);
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);
  const [focusNotesByTask, setFocusNotesByTask] = useState<
    Record<string, string>
  >({});

  const dateLabel = format(new Date(), "EEE · d MMM");
  const todayDate = useMemo(() => new Date(), []);
  const { data: todayTasks, isLoading: todayLoading } = useTasks({
    status: "today",
  });
  const { data: inboxTasks, isLoading: inboxLoading } = useInboxTasks();
  const { data: nowTasks, isLoading: nowLoading } = useNowTasks();
  const { data: latestDoc, isLoading: docLoading } = useLatestDocument();
  const { data: avoidHabits, isLoading: avoidHabitsLoading } =
    useActiveAvoidHabits();
  const logSlip = useLogSlip();
  const undoSlip = useUndoSlip();
  const { data: quotaHabits, isLoading: quotaHabitsLoading } =
    useActiveQuotaHabits();
  const logUsage = useLogUsage();
  const undoUsage = useUndoUsage();
  const { data: buildHabits, isLoading: buildHabitsLoading } =
    useActiveBuildHabits();
  const logProgress = useLogProgress();
  const undoProgress = useUndoProgress();
  const { data: scheduleHabits, isLoading: scheduleHabitsLoading } =
    useActiveScheduleHabits();
  const markOccurrence = useMarkOccurrence();
  const { data: dailyTotals, isLoading: entriesLoading } =
    useDailyTotalsByDate(todayDate);
  const { data: todayEntries, isLoading: todayEntriesLoading } =
    useTodayTimeEntries();
  const { isTimerLoading } = useActiveTimer();
  const {
    activeTimer,
    elapsedSeconds,
    stopTimer,
    stopTimerWithNotes,
    pauseTimer,
    resumeTimer,
    startTimer,
    isStopping,
    isPausing,
    isResuming,
    isStarting: isStartingTimer,
  } = useTimerControls();
  const setNowSlot = useSetNowSlot();
  const swapNowSlots = useSwapNowSlots();
  const updateTask = useUpdateTask();
  const updateTaskStatus = useUpdateTaskStatus();

  const nowPrimary =
    nowTasks?.find((task) => task.now_slot === "primary") ?? null;
  const nowSecondary =
    nowTasks?.find((task) => task.now_slot === "secondary") ?? null;
  const inboxCount = inboxTasks?.length || 0;
  const nextTasks =
    todayTasks?.filter(
      (task) => task.id !== nowPrimary?.id && task.id !== nowSecondary?.id
    ) || [];
  const nowTime = formatTimerDisplay(elapsedSeconds);
  const isEnding = updateTaskStatus.isPending;
  const isStarting = isStartingTimer || isResuming || setNowSlot.isPending;
  const isPrimaryRunning =
    activeTimer?.taskId === nowPrimary?.id && !activeTimer?.isPaused;
  const isPrimaryPaused =
    activeTimer?.taskId === nowPrimary?.id && activeTimer?.isPaused;

  // Focus dialog: selected task (defaults to active timer's task, or nowPrimary, or first today task)
  const effectiveFocusTaskId =
    focusTaskId ||
    activeTimer?.taskId ||
    nowPrimary?.id ||
    todayTasks?.[0]?.id ||
    null;
  const focusTask = todayTasks?.find((t) => t.id === effectiveFocusTaskId) || null;
  const isFocusTaskRunning =
    activeTimer?.taskId === effectiveFocusTaskId && !activeTimer?.isPaused;
  const isFocusTaskPaused =
    activeTimer?.taskId === effectiveFocusTaskId && activeTimer?.isPaused;

  const timeByTaskId = useMemo(() => {
    const now = Date.now();
    const dayStart = startOfDay(todayDate).getTime();
    const totals = dailyTotals || [];
    const timeMap = new Map<string, number>();

    for (const total of totals) {
      timeMap.set(total.task_id, total.total_seconds);
    }

    if (activeTimer && !activeTimer.isPaused) {
      const startedAtMs = activeTimer.startedAt.getTime();
      const overlapStart = Math.max(startedAtMs, dayStart);
      const overlapSeconds = Math.max(
        0,
        Math.floor((now - overlapStart) / 1000)
      );
      const runningSeconds =
        startedAtMs >= dayStart ? elapsedSeconds : overlapSeconds;
      const previous = timeMap.get(activeTimer.taskId) || 0;
      timeMap.set(activeTimer.taskId, previous + runningSeconds);
    }

    return timeMap;
  }, [dailyTotals, todayDate, elapsedSeconds, activeTimer]);


  // Reset focusTaskId when dialog closes
  useEffect(() => {
    if (!showTimerDialog) {
      setFocusTaskId(null);
    }
  }, [showTimerDialog]);

  const handleEndNow = () => {
    if (!nowPrimary) return;
    stopTimer();
    updateTaskStatus.mutate(
      { id: nowPrimary.id, status: "done" },
      {
        onSuccess: () => {
          // Promote secondary to primary if it exists
          if (nowSecondary) {
            setNowSlot.mutate({ taskId: nowSecondary.id, slot: "primary" });
          }
        },
      }
    );
  };

  const handleStartNow = () => {
    if (!nowPrimary) return;
    if (isPrimaryPaused) {
      resumeTimer();
      return;
    }
    startTimer(nowPrimary.id);
  };

  // Focus dialog handlers
  const handleFocusStart = () => {
    if (!effectiveFocusTaskId) return;
    if (isFocusTaskPaused) {
      resumeTimer();
      return;
    }
    startTimer(effectiveFocusTaskId);
  };

  const handleFocusPause = () => {
    pauseTimer();
  };

  const handleFocusEnd = async () => {
    const notes =
      (effectiveFocusTaskId && focusNotesByTask[effectiveFocusTaskId]) || "";
    const trimmedNotes = notes.trim();
    try {
      await stopTimerWithNotes(trimmedNotes.length > 0 ? trimmedNotes : null);
      if (effectiveFocusTaskId) {
        setFocusNotesByTask((prev) => {
          const next = { ...prev };
          delete next[effectiveFocusTaskId];
          return next;
        });
      }
    } catch (error) {
      console.error("Failed to stop timer from focus dialog:", error);
    }
  };

  const handlePauseNow = () => {
    if (!nowPrimary) return;
    pauseTimer();
  };

  const handleSwapNow = () => {
    if (!nowSecondary) return;
    if (activeTimer) {
      setQuickStopAction("swap");
      setShowQuickStopDialog(true);
      return;
    }
    setShowSwapDialog(true);
  };

  const handleConfirmSwap = () => {
    if (!nowSecondary) return;
    stopTimer();
    swapNowSlots.mutate({
      primaryId: nowPrimary?.id ?? null,
      secondaryId: nowSecondary.id,
    });
    setShowSwapDialog(false);
  };

  const handleRemoveSecondary = () => {
    if (!nowSecondary) return;
    setReleaseTaskId(nowSecondary.id);
    setShowReleaseDialog(true);
  };

  const handleRemovePrimary = () => {
    if (!nowPrimary) return;
    setReleaseTaskId(nowPrimary.id);
    setShowReleaseDialog(true);
  };

  const handlePromoteToSlot = (taskId: string, slot: "primary" | "secondary") => {
    if (activeTimer) {
      setPromoteTaskId(taskId);
      setPromoteSlot(slot);
      setQuickStopAction("promote");
      setShowQuickStopDialog(true);
      return;
    }

    setNowSlot.mutate({ taskId, slot });
  };

  const handlePromoteClick = (taskId: string) => {
    if (nowPrimary && nowSecondary) {
      setPromoteTaskId(taskId);
      setShowPromoteDialog(true);
      return;
    }

    handlePromoteToSlot(taskId, nowPrimary ? "secondary" : "primary");
  };

  const handleSelectPromoteSlot = (slot: "primary" | "secondary") => {
    if (!promoteTaskId) return;
    setShowPromoteDialog(false);
    handlePromoteToSlot(promoteTaskId, slot);
  };

  const handleConfirmQuickStop = async () => {
    const notes = quickStopNotes.trim();

    try {
      await stopTimerWithNotes(notes.length > 0 ? notes : null);

      if (quickStopAction === "promote" && promoteTaskId && promoteSlot) {
        setNowSlot.mutate({ taskId: promoteTaskId, slot: promoteSlot });
      }

      if (quickStopAction === "swap" && nowSecondary) {
        swapNowSlots.mutate({
          primaryId: nowPrimary?.id ?? null,
          secondaryId: nowSecondary.id,
        });
      }

      setShowQuickStopDialog(false);
      setPromoteTaskId(null);
      setPromoteSlot(null);
      setQuickStopAction(null);
      setQuickStopNotes("");
    } catch (error) {
      console.error("Failed to stop timer before promoting:", error);
    }
  };

  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <div className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
          Voyagers
        </div>
        <div className="h-px bg-border" />
        <div>
          <h1 className="text-2xl font-semibold">Today</h1>
          <p className="text-sm text-muted-foreground">{dateLabel}</p>
        </div>
      </div>

      <section className="space-y-3">
        <div className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
          Now
        </div>
        <div className="h-px bg-border" />
        {nowLoading || isTimerLoading ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Loading active task...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
              Primary
            </div>
            {nowPrimary ? (
              <div className="space-y-2">
                <div className="text-sm">• {nowPrimary.title}</div>
                <div className="flex items-center gap-2">
                  {isPrimaryRunning ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePauseNow}
                      disabled={isPausing}
                    >
                      Pause
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTimerDialog(true)}
                    >
                      Focus
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={handleEndNow}
                    disabled={isStopping || isEnding || isStarting}
                  >
                    Complete
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemovePrimary}
                    disabled={updateTaskStatus.isPending || updateTask.isPending}
                  >
                    Remove
                  </Button>
                </div>
                {(isPrimaryRunning || isPrimaryPaused) && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setShowTimerDialog(true)}
                  >
                    {nowTime} {isPrimaryPaused ? "paused" : "active"}
                  </button>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-4 space-y-2">
                <p className="text-sm font-medium">Nothing is claimed.</p>
                <p className="text-sm text-muted-foreground">
                  Decide what you will command next (below).
                </p>
                {todayTasks && todayTasks.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTimerDialog(true)}
                  >
                    Focus
                  </Button>
                )}
              </div>
            )}

            <div className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
              Secondary
            </div>
            {nowPrimary ? (
              nowSecondary ? (
                <div className="space-y-2">
                  <div className="text-sm">• {nowSecondary.title}</div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSwapNow}
                      disabled={swapNowSlots.isPending}
                    >
                      Swap
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveSecondary}
                      disabled={
                        updateTaskStatus.isPending || updateTask.isPending
                      }
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : nextTasks.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No secondary tasks.
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Choose a task from Next to set as secondary.
                </div>
              )
            ) : null}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
          Next
        </div>
        <div className="h-px bg-border" />
        {todayLoading ? (
          <div className="text-sm text-muted-foreground">
            Loading today tasks...
          </div>
        ) : nextTasks.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Nothing queued in Today.
          </div>
        ) : (
          <div className="space-y-2">
            {nextTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-3">
                <div className="text-sm">• {task.title}</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePromoteClick(task.id)}
                  disabled={setNowSlot.isPending}
                >
                  Promote to Now
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
          Inbox
        </div>
        <div className="h-px bg-border" />
        {inboxLoading ? (
          <div className="text-sm text-muted-foreground">Loading inbox...</div>
        ) : (
          <Link
            href="/inbox"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {inboxCount} unclarified {inboxCount === 1 ? "item" : "items"}{" "}
            {"->"}
          </Link>
        )}
      </section>

      <section className="space-y-3">
        <div className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
          Knowledge
        </div>
        <div className="h-px bg-border" />
        {docLoading ? (
          <div className="text-sm text-muted-foreground">
            Loading knowledge...
          </div>
        ) : latestDoc ? (
          <div className="space-y-1">
            <div className="text-sm font-medium">Continue Writing {"->"}</div>
            <div className="text-sm text-muted-foreground">
              Last active: {latestDoc.title}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            No recent documents.
          </div>
        )}
      </section>

      {/* Avoid Habits Section */}
      {avoidHabits && avoidHabits.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
              Avoid
            </div>
            <Link
              href="/habits"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Manage →
            </Link>
          </div>
          <div className="h-px bg-border" />
          {avoidHabitsLoading ? (
            <div className="text-sm text-muted-foreground">
              Loading habits...
            </div>
          ) : (
            <div className="space-y-2">
              {avoidHabits.map((habit) => (
                <AvoidHabitCardCompact
                  key={habit.id}
                  habit={habit}
                  onLogSlip={(habitId) => logSlip.mutate({ habitId })}
                  onUndoSlip={(habitId) => {
                    const habit = avoidHabits?.find(h => h.id === habitId);
                    if (habit?.lastTodaySlipId) {
                      undoSlip.mutate(habit.lastTodaySlipId);
                    }
                  }}
                  isLoggingSlip={logSlip.isPending}
                  isUndoingSlip={undoSlip.isPending}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Quota Habits Section */}
      {quotaHabits && quotaHabits.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
              Limits
            </div>
            <Link
              href="/habits"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Manage →
            </Link>
          </div>
          <div className="h-px bg-border" />
          {quotaHabitsLoading ? (
            <div className="text-sm text-muted-foreground">
              Loading habits...
            </div>
          ) : (
            <div className="space-y-2">
              {quotaHabits.map((habit) => (
                <QuotaHabitCardCompact
                  key={habit.id}
                  habit={habit}
                  onLogUsage={(habitId, amount) =>
                    logUsage.mutate({ habitId, amount })
                  }
                  onUndoUsage={(eventId) => undoUsage.mutate(eventId)}
                  isLogging={logUsage.isPending}
                  isUndoing={undoUsage.isPending}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Build Habits Section */}
      {buildHabits && buildHabits.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
              Build
            </div>
            <Link
              href="/habits"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Manage →
            </Link>
          </div>
          <div className="h-px bg-border" />
          {buildHabitsLoading ? (
            <div className="text-sm text-muted-foreground">
              Loading habits...
            </div>
          ) : (
            <div className="space-y-2">
              {buildHabits.map((habit) => (
                <BuildHabitCardCompact
                  key={habit.id}
                  habit={habit}
                  onLogProgress={(habitId, amount) =>
                    logProgress.mutate({ habitId, amount })
                  }
                  onUndoProgress={(eventId) => undoProgress.mutate(eventId)}
                  isLogging={logProgress.isPending}
                  isUndoing={undoProgress.isPending}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Schedule Habits Section */}
      {scheduleHabits && scheduleHabits.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
              Rituals
            </div>
            <Link
              href="/habits"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Manage →
            </Link>
          </div>
          <div className="h-px bg-border" />
          {scheduleHabitsLoading ? (
            <div className="text-sm text-muted-foreground">
              Loading habits...
            </div>
          ) : (
            <div className="space-y-2">
              {scheduleHabits.map((habit) => (
                <ScheduleHabitCardCompact
                  key={habit.id}
                  habit={habit}
                  onMarkComplete={(habitId, scheduledAt, localDate) =>
                    markOccurrence.mutate({ habitId, scheduledAt, localDate, status: "completed" })
                  }
                  onMarkSkipped={(habitId, scheduledAt, localDate) =>
                    markOccurrence.mutate({ habitId, scheduledAt, localDate, status: "skipped" })
                  }
                  isMarking={markOccurrence.isPending}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <Dialog open={showSwapDialog} onOpenChange={setShowSwapDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm swap?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Swapping the primary task will stop and log any focus time first.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleConfirmSwap}
              disabled={swapNowSlots.isPending || isStopping}
            >
              Stop and Swap
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showPromoteDialog}
        onOpenChange={(open) => {
          setShowPromoteDialog(open);
          if (!open) {
            setPromoteTaskId(null);
            setPromoteSlot(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Now is full.</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Replace which?</p>
          <DialogFooter className="flex gap-2 sm:justify-start">
            <Button
              variant="outline"
              onClick={() => handleSelectPromoteSlot("primary")}
              disabled={setNowSlot.isPending || isStopping}
            >
              Primary
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSelectPromoteSlot("secondary")}
              disabled={setNowSlot.isPending || isStopping}
            >
              Secondary
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showQuickStopDialog}
        onOpenChange={(open) => {
          setShowQuickStopDialog(open);
          if (!open) {
            setQuickStopNotes("");
            setPromoteSlot(null);
            setPromoteTaskId(null);
            setQuickStopAction(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>End focus and log notes</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm">
              <div className="font-medium">
                {activeTimer?.taskTitle || "Active focus session"}
              </div>
              <div className="text-xs text-muted-foreground">
                {nowTime} elapsed
              </div>
            </div>
            <Textarea
              value={quickStopNotes}
              onChange={(event) => setQuickStopNotes(event.target.value)}
              placeholder="Add a short note about this focus session..."
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setShowQuickStopDialog(false)}
              disabled={isStopping}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmQuickStop} disabled={isStopping}>
              Stop & Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTimerDialog} onOpenChange={setShowTimerDialog}>
        <DialogContent className="h-[100dvh] w-[100dvw] max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-6 top-0 left-0 sm:max-w-none overflow-y-auto">
          <div className="space-y-6">
            <DialogHeader className="text-left">
              <DialogTitle>Focus</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Today&apos;s focus and time tracked.
              </p>
            </DialogHeader>

            <div className="space-y-4">
              {todayTasks && todayTasks.length > 0 ? (
                <>
                  <Select
                    value={effectiveFocusTaskId || ""}
                    onValueChange={(value) => setFocusTaskId(value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a task..." />
                    </SelectTrigger>
                    <SelectContent>
                      {nowPrimary && (
                        <SelectGroup>
                          <SelectLabel>Now · Primary</SelectLabel>
                          <SelectItem value={nowPrimary.id}>
                            {nowPrimary.title}
                          </SelectItem>
                        </SelectGroup>
                      )}
                      {nowSecondary && (
                        <SelectGroup>
                          <SelectLabel>Now · Secondary</SelectLabel>
                          <SelectItem value={nowSecondary.id}>
                            {nowSecondary.title}
                          </SelectItem>
                        </SelectGroup>
                      )}
                      {nextTasks.length > 0 && (
                        <SelectGroup>
                          <SelectLabel>Next</SelectLabel>
                          {nextTasks.map((task) => (
                            <SelectItem key={task.id} value={task.id}>
                              {task.title}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                    </SelectContent>
                  </Select>
                  <div className="text-center py-8">
                    <div className="font-mono text-5xl tabular-nums">
                      {nowTime}
                    </div>
                    {isFocusTaskPaused && (
                      <div className="text-sm text-muted-foreground mt-2">
                        Paused
                      </div>
                    )}
                  </div>
                  <DialogFooter className="justify-center sm:justify-center gap-2">
                    {!isFocusTaskRunning && !isFocusTaskPaused && (
                      <Button
                        onClick={handleFocusStart}
                        disabled={isStarting || !effectiveFocusTaskId}
                      >
                        Start
                      </Button>
                    )}
                    {isFocusTaskRunning && (
                      <Button
                        variant="outline"
                        onClick={handleFocusPause}
                        disabled={isPausing}
                      >
                        Pause
                      </Button>
                    )}
                    {isFocusTaskPaused && (
                      <>
                        <Button
                          onClick={handleFocusStart}
                          disabled={isStarting}
                        >
                          Continue
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleFocusEnd}
                          disabled={isStopping}
                        >
                          End
                        </Button>
                      </>
                    )}
                  </DialogFooter>
                  <div className={styles.focusNotes}>
                    <label className={styles.focusNotesLabel} htmlFor="focus-notes">
                      Focus notes
                    </label>
                    <textarea
                      id="focus-notes"
                      rows={3}
                      value={
                        (effectiveFocusTaskId &&
                          focusNotesByTask[effectiveFocusTaskId]) ||
                        ""
                      }
                      onChange={(event) => {
                        if (!effectiveFocusTaskId) return;
                        setFocusNotesByTask((prev) => ({
                          ...prev,
                          [effectiveFocusTaskId]: event.target.value,
                        }));
                      }}
                      placeholder="Add a short note for this focus session..."
                      className={styles.focusNotesTextarea}
                    />
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No tasks in Today. Add tasks to Today first.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
                Today
              </div>
              <div className="h-px bg-border" />
              {todayLoading || entriesLoading ? (
                <div className="text-sm text-muted-foreground">
                  Loading today&apos;s tasks...
                </div>
              ) : todayTasks && todayTasks.some((task) => (timeByTaskId.get(task.id) ?? 0) > 0) ? (
                <div className="space-y-3">
                  {todayTasks.filter((task) => (timeByTaskId.get(task.id) ?? 0) > 0).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between gap-4 text-sm"
                    >
                      <div className="min-w-0 truncate">• {task.title}</div>
                      <div className="font-mono tabular-nums text-muted-foreground">
                        {formatDuration(timeByTaskId.get(task.id) || 0)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No time tracked today.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
                Focus Record
              </div>
              <div className="h-px bg-border" />
              {todayEntriesLoading ? (
                <div className="text-sm text-muted-foreground">
                  Loading focus history...
                </div>
              ) : todayEntries && todayEntries.length > 0 ? (
                <div className="space-y-2">
                  {todayEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-4 text-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {format(new Date(entry.started_at), "HH:mm")}
                          {" - "}
                          {entry.ended_at
                            ? format(new Date(entry.ended_at), "HH:mm")
                            : "now"}
                        </span>
                        <span className="truncate">
                          {entry.task?.title || "Unknown task"}
                        </span>
                      </div>
                      <div className="font-mono tabular-nums text-muted-foreground">
                        {formatDuration(entry.duration_seconds || 0)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No focus sessions today.
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showReleaseDialog}
        onOpenChange={(open) => {
          setShowReleaseDialog(open);
          if (!open) {
            setReleaseTaskId(null);
          }
        }}
      >
        <DialogContent>
          <DialogClose className="absolute right-4 top-4 h-auto border-0 p-0 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">
            Close
          </DialogClose>
          <DialogHeader>
            <DialogTitle>Why are you releasing this?</DialogTitle>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 sm:flex-col">
            <Button
              onClick={() => {
                if (!releaseTaskId) return;
                updateTask.mutate({
                  id: releaseTaskId,
                  now_slot: null,
                  status: "today",
                });
                setShowReleaseDialog(false);
              }}
              className="flex w-full items-center justify-between"
            >
              <span>I still intend to do this soon</span>
              <span>{"->"} NEXT</span>
            </Button>
            <Button
              onClick={() => {
                if (!releaseTaskId) return;
                updateTask.mutate({
                  id: releaseTaskId,
                  now_slot: null,
                  status: "anytime",
                  task_location: "anytime",
                });
                setShowReleaseDialog(false);
              }}
              className="flex w-full items-center justify-between"
            >
              <span>This isn't for this season</span>
              <span>{"->"} LATER</span>
            </Button>
            <Button
              onClick={() => {
                if (!releaseTaskId) return;
                updateTask.mutate({
                  id: releaseTaskId,
                  now_slot: null,
                  status: "inbox",
                  task_location: "inbox",
                });
                setShowReleaseDialog(false);
              }}
              className="flex w-full items-center justify-between"
            >
              <span>This was premature / unclear</span>
              <span>{"->"} INBOX</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
