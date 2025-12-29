"use client";

import { Play, Square, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatTimerDisplay } from "@/lib/utils/formatting";
import { useActiveTimer, useTimerControls } from "@/lib/hooks/use-timer";

interface TimerDisplayProps {
  className?: string;
  compact?: boolean;
}

export function TimerDisplay({ className, compact = false }: TimerDisplayProps) {
  const { isTimerLoading } = useActiveTimer();
  const {
    activeTimer,
    elapsedSeconds,
    isStopping,
    stopTimer,
  } = useTimerControls();

  // Loading state
  if (isTimerLoading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 text-muted-foreground",
          className
        )}
      >
        <Clock className="h-4 w-4 animate-pulse" />
        {!compact && <span className="text-sm">Loading...</span>}
      </div>
    );
  }

  // No active timer
  if (!activeTimer) {
    return null;
  }

  const formattedTime = formatTimerDisplay(elapsedSeconds);

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="font-mono text-sm font-medium">{formattedTime}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={stopTimer}
          disabled={isStopping}
        >
          <Square className="h-3 w-3 fill-current" />
          <span className="sr-only">Stop timer</span>
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card p-3",
        className
      )}
    >
      {/* Pulsing indicator */}
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
      </span>

      {/* Timer info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{activeTimer.taskTitle}</p>
        {activeTimer.projectTitle && (
          <p className="text-xs text-muted-foreground truncate">
            {activeTimer.projectTitle}
          </p>
        )}
      </div>

      {/* Time display */}
      <span className="font-mono text-lg font-semibold tabular-nums">
        {formattedTime}
      </span>

      {/* Stop button */}
      <Button
        variant="outline"
        size="sm"
        onClick={stopTimer}
        disabled={isStopping}
        className="gap-1.5"
      >
        <Square className="h-3 w-3 fill-current" />
        Stop
      </Button>
    </div>
  );
}

// Mini timer for header
export function TimerMini({ className }: { className?: string }) {
  const { isTimerLoading } = useActiveTimer();
  const { activeTimer, elapsedSeconds, stopTimer, isStopping } =
    useTimerControls();

  if (isTimerLoading || !activeTimer) {
    return null;
  }

  const formattedTime = formatTimerDisplay(elapsedSeconds);

  return (
    <button
      type="button"
      onClick={stopTimer}
      disabled={isStopping}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors",
        "hover:bg-accent",
        className
      )}
      title={`${activeTimer.taskTitle} - Click to stop`}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
      </span>
      <span className="font-mono font-medium tabular-nums">{formattedTime}</span>
    </button>
  );
}
