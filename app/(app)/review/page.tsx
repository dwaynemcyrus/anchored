"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck } from "lucide-react";
import { format, isSameDay } from "date-fns";
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
import { TaskListSkeleton } from "@/components/skeletons";
import { InboxProcessor } from "@/components/review/inbox-processor";
import { TodayReview } from "@/components/review/today-review";
import { ReviewSummary } from "@/components/review/review-summary";
import {
  useInboxTasks,
  useMoveTaskToTomorrow,
  useTasks,
  useUpdateTaskStatus,
  useDeleteTask,
  type TaskWithDetails,
} from "@/lib/hooks/use-tasks";
import { useHabits } from "@/lib/hooks/use-habits";
import { useTimeEntriesByDate } from "@/lib/hooks/use-timer";
import {
  useCreateDailyReviewSession,
  useDailyReviewSession,
  useUpdateReviewSession,
  type DailyReviewData,
} from "@/lib/hooks/use-reviews";

type ReviewStep = 1 | 2;

export default function ReviewPage() {
  const todayLabel = format(new Date(), "EEEE, MMMM d, yyyy");
  const [step, setStep] = useState<ReviewStep | null>(null);
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [localCompleted, setLocalCompleted] = useState(false);
  const [inboxStartCount, setInboxStartCount] = useState<number | null>(null);
  const [showSkipDialog, setShowSkipDialog] = useState(false);

  const { data: inboxTasks, isLoading: inboxLoading } = useInboxTasks();
  const { data: todayTasks, isLoading: todayLoading } = useTasks({
    status: "today",
  });
  const { data: doneTasks, isLoading: doneLoading } = useTasks({
    status: "done",
  });
  const { data: habits, isLoading: habitsLoading } = useHabits({
    active: true,
  });
  const { data: timeEntries, isLoading: timeLoading } =
    useTimeEntriesByDate(new Date());
  const { data: reviewSession, isLoading: reviewLoading } =
    useDailyReviewSession();

  const createReview = useCreateDailyReviewSession();
  const updateReview = useUpdateReviewSession();

  const updateTaskStatus = useUpdateTaskStatus();
  const deleteTask = useDeleteTask();
  const moveToTomorrow = useMoveTaskToTomorrow();

  useEffect(() => {
    if (!reviewSession) return;

    setActiveReviewId(reviewSession.id);
    setLocalCompleted(Boolean(reviewSession.completed_at));

    const sessionData = (reviewSession.data || {}) as DailyReviewData;
    if (sessionData.step) {
      setStep(sessionData.step);
    } else if (!reviewSession.completed_at) {
      setStep(1);
    }
    if (sessionData.inboxStartCount !== undefined) {
      setInboxStartCount(sessionData.inboxStartCount);
    }
  }, [reviewSession]);

  const inboxCount = inboxTasks?.length || 0;
  const todayRemaining = todayTasks?.length || 0;
  const todayCompleted =
    doneTasks?.filter(
      (task) =>
        task.completed_at && isSameDay(new Date(task.completed_at), new Date())
    ).length || 0;
  const habitsTotal = habits?.length || 0;
  const habitsCompleted =
    habits?.filter((habit) => habit.completedToday).length || 0;
  const totalTrackedSeconds =
    timeEntries?.reduce(
      (sum, entry) => sum + (entry.duration_seconds || 0),
      0
    ) || 0;

  const sessionData = (reviewSession?.data || {}) as DailyReviewData;
  const resolvedInboxStart =
    inboxStartCount ?? sessionData.inboxStartCount ?? inboxCount;

  const reviewData: DailyReviewData = useMemo(
    () => ({
      step: step ?? sessionData.step ?? 1,
      inboxStartCount: resolvedInboxStart,
      inboxRemaining: inboxCount,
      inboxProcessed: Math.max(0, resolvedInboxStart - inboxCount),
      todayCompleted,
      todayRemaining,
      habitsCompleted,
      habitsTotal,
      totalTrackedSeconds,
    }),
    [
      step,
      sessionData.step,
      resolvedInboxStart,
      inboxCount,
      todayRemaining,
      habitsCompleted,
      habitsTotal,
      totalTrackedSeconds,
    ]
  );

  const reviewId = reviewSession?.id ?? activeReviewId;
  const isCompleted = localCompleted || Boolean(reviewSession?.completed_at);
  const isLoading =
    inboxLoading ||
    todayLoading ||
    doneLoading ||
    habitsLoading ||
    timeLoading ||
    reviewLoading;

  const handleStartReview = async () => {
    if (reviewId || createReview.isPending) return;

    const session = await createReview.mutateAsync({
      step: 1,
      inboxStartCount: inboxCount,
    });
    setActiveReviewId(session.id);
    setInboxStartCount(inboxCount);
    setStep(1);
  };

  const handleContinue = async () => {
    if (!reviewId || updateReview.isPending) return;

    await updateReview.mutateAsync({
      id: reviewId,
      data: { ...reviewData, step: 2 },
    });
    setStep(2);
  };

  const handleSkip = async () => {
    if (!reviewId || updateReview.isPending) return;

    await updateReview.mutateAsync({
      id: reviewId,
      data: { ...reviewData, step: 2 },
    });
    setStep(2);
    setShowSkipDialog(false);
  };

  const handleComplete = async () => {
    if (!reviewId || updateReview.isPending) return;

    await updateReview.mutateAsync({
      id: reviewId,
      data: { ...reviewData, step: 2 },
      completed_at: new Date().toISOString(),
    });
    setLocalCompleted(true);
  };

  const handleMoveToToday = (task: TaskWithDetails) => {
    updateTaskStatus.mutate({ id: task.id, status: "today" });
  };

  const handleMoveToAnytime = (task: TaskWithDetails) => {
    updateTaskStatus.mutate({ id: task.id, status: "anytime" });
  };

  const handleDelete = (task: TaskWithDetails) => {
    deleteTask.mutate(task.id);
  };

  const handleMarkDone = (task: TaskWithDetails) => {
    updateTaskStatus.mutate({ id: task.id, status: "done" });
  };

  const handleMoveToTomorrow = (task: TaskWithDetails) => {
    moveToTomorrow.mutate(task);
  };

  const isProcessing =
    createReview.isPending ||
    updateReview.isPending ||
    updateTaskStatus.isPending ||
    deleteTask.isPending ||
    moveToTomorrow.isPending;

  const canContinue = inboxCount === 0;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Daily Review</h1>
        <p className="text-muted-foreground">{todayLabel}</p>
      </div>

      {isLoading ? (
        <TaskListSkeleton count={3} />
      ) : isCompleted ? (
        <div className="rounded-lg border bg-card p-8 text-center space-y-4">
          <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Review complete</h2>
            <p className="text-sm text-muted-foreground">
              Nice work wrapping up today.
            </p>
          </div>
          <ReviewSummary
            inboxStartCount={sessionData.inboxStartCount ?? resolvedInboxStart}
            inboxRemaining={sessionData.inboxRemaining ?? inboxCount}
            todayCompleted={sessionData.todayCompleted ?? todayCompleted}
            todayRemaining={sessionData.todayRemaining ?? todayRemaining}
            habitsCompleted={sessionData.habitsCompleted ?? habitsCompleted}
            habitsTotal={sessionData.habitsTotal ?? habitsTotal}
            totalTrackedSeconds={
              sessionData.totalTrackedSeconds ?? totalTrackedSeconds
            }
          />
        </div>
      ) : !reviewId ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground space-y-4">
          <ClipboardCheck className="mx-auto h-10 w-10 text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-medium text-foreground">
              End your day with intention.
            </p>
            <p className="text-sm text-muted-foreground">
              Process inbox and review today&apos;s tasks.
            </p>
          </div>
          <Button onClick={handleStartReview} disabled={isProcessing}>
            Start review
          </Button>
        </div>
      ) : (
        <>
          {step && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Step {step} of 2</span>
                <span>{step === 1 ? "Clear Inbox" : "Review Today"}</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: step === 1 ? "50%" : "100%" }}
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <InboxProcessor
                tasks={inboxTasks || []}
                onMoveToToday={handleMoveToToday}
                onMoveToAnytime={handleMoveToAnytime}
                onDelete={handleDelete}
                isProcessing={isProcessing}
              />
              {inboxCount > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Skipping now leaves {inboxCount}{" "}
                  {inboxCount === 1 ? "item" : "items"} in your inbox.
                </div>
              )}
              <div className="flex items-center justify-end gap-2">
                <Button
                  onClick={handleContinue}
                  disabled={!canContinue || isProcessing}
                >
                  Continue
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowSkipDialog(true)}
                  disabled={isProcessing}
                >
                  Skip for now
                </Button>
              </div>

              <AlertDialog
                open={showSkipDialog}
                onOpenChange={setShowSkipDialog}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Skip inbox processing?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You still have {inboxCount}{" "}
                      {inboxCount === 1 ? "item" : "items"} in your inbox. You
                      can come back and process them later.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleSkip}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Continue to Step 2
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <TodayReview
                tasks={todayTasks || []}
                onMoveToTomorrow={handleMoveToTomorrow}
                onMoveToAnytime={handleMoveToAnytime}
                onMarkDone={handleMarkDone}
                isProcessing={isProcessing}
              />

              <ReviewSummary
                inboxStartCount={resolvedInboxStart}
                inboxRemaining={inboxCount}
                todayCompleted={todayCompleted}
                todayRemaining={todayRemaining}
                habitsCompleted={habitsCompleted}
                habitsTotal={habitsTotal}
                totalTrackedSeconds={totalTrackedSeconds}
              />

              <div className="flex items-center justify-end gap-2">
                <Button onClick={handleComplete} disabled={isProcessing}>
                  Complete review
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
