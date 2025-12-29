"use client";

import { CheckCircle2, Clock, Inbox, Target } from "lucide-react";
import { formatDuration } from "@/lib/utils/formatting";

interface ReviewSummaryProps {
  inboxStartCount: number;
  inboxRemaining: number;
  todayCompleted: number;
  todayRemaining: number;
  habitsCompleted: number;
  habitsTotal: number;
  totalTrackedSeconds: number;
}

export function ReviewSummary({
  inboxStartCount,
  inboxRemaining,
  todayCompleted,
  todayRemaining,
  habitsCompleted,
  habitsTotal,
  totalTrackedSeconds,
}: ReviewSummaryProps) {
  const inboxProcessed = Math.max(0, inboxStartCount - inboxRemaining);

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">
        Today Summary
      </h3>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-2 text-sm">
          <Inbox className="h-4 w-4 text-muted-foreground" />
          <span>
            {inboxProcessed} processed · {inboxRemaining} remaining
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Target className="h-4 w-4 text-muted-foreground" />
          <span>
            {habitsCompleted} / {habitsTotal} habits done
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>{formatDuration(totalTrackedSeconds)} tracked</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        <span>
          {todayCompleted} task{todayCompleted === 1 ? "" : "s"} completed
          today
        </span>
      </div>

      <div className="text-xs text-muted-foreground">
        {todayRemaining} Today tasks still open
      </div>
    </div>
  );
}
