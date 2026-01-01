"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  useInboxTasks,
  useNowTasks,
  useTasks,
  useSetNowTask,
  useUpdateTaskStatus,
} from "@/lib/hooks/use-tasks";
import { useLatestDocument } from "@/lib/hooks/use-documents";
import {
  useActiveTimer,
  useTimerControls,
  useStartTimer,
} from "@/lib/hooks/use-timer";
import { formatTimerDisplay } from "@/lib/utils/formatting";

export default function TodayPage() {
  const dateLabel = format(new Date(), "EEE · d MMM");
  const { data: todayTasks, isLoading: todayLoading } = useTasks({
    status: "today",
  });
  const { data: inboxTasks, isLoading: inboxLoading } = useInboxTasks();
  const { data: nowTasks, isLoading: nowLoading } = useNowTasks();
  const { data: latestDoc, isLoading: docLoading } = useLatestDocument();
  const { isTimerLoading } = useActiveTimer();
  const { activeTimer, elapsedSeconds, stopTimer, isStopping } =
    useTimerControls();
  const startTimer = useStartTimer();
  const setNowTask = useSetNowTask();
  const updateTaskStatus = useUpdateTaskStatus();

  const nowTask = nowTasks?.[0] ?? null;
  const inboxCount = inboxTasks?.length || 0;
  const nextTasks =
    todayTasks?.filter((task) => task.id !== nowTask?.id) || [];
  const nowTime = formatTimerDisplay(elapsedSeconds);
  const isEnding = updateTaskStatus.isPending;
  const isStarting = startTimer.isPending || setNowTask.isPending;

  const handleEndNow = () => {
    if (!nowTask) return;
    stopTimer();
    updateTaskStatus.mutate({ id: nowTask.id, status: "done" });
  };

  const handleStartNow = () => {
    if (!nowTask) return;
    setNowTask.mutate({ taskId: nowTask.id });
    startTimer.mutate(nowTask.id);
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
        ) : nowTask ? (
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="space-y-1">
              <div className="text-lg font-medium">
                {nowTask.title}
              </div>
              {nowTask.project?.title && (
                <div className="text-sm text-muted-foreground">
                  {nowTask.project.title}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="font-mono text-lg tabular-nums">
                {activeTimer?.taskId === nowTask.id
                  ? `${nowTime} active`
                  : "Not running"}
              </div>
              <div className="flex items-center gap-2">
                {activeTimer?.taskId === nowTask.id ? (
                  <Button
                    variant="outline"
                    onClick={stopTimer}
                    disabled={isStopping}
                  >
                    Pause
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handleStartNow}
                    disabled={isStarting}
                  >
                    Start
                  </Button>
                )}
                <Button
                  onClick={handleEndNow}
                  disabled={isStopping || isEnding || isStarting}
                >
                  End
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-4 space-y-2">
            <p className="text-sm font-medium">Nothing is claimed.</p>
            <p className="text-sm text-muted-foreground">
              Decide what you will command next (below).
            </p>
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
              <div key={task.id} className="text-sm">
                • {task.title}
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
    </div>
  );
}
