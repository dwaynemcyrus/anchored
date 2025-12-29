"use client";

import { Play, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTimerControls } from "@/lib/hooks/use-timer";

interface TimerButtonProps {
  taskId: string;
  className?: string;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "default" | "ghost" | "outline";
  showLabel?: boolean;
}

export function TimerButton({
  taskId,
  className,
  size = "icon",
  variant = "ghost",
  showLabel = false,
}: TimerButtonProps) {
  const {
    isTimerRunningForTask,
    isStarting,
    isStopping,
    toggleTimer,
  } = useTimerControls();

  const isRunning = isTimerRunningForTask(taskId);
  const isLoading = isStarting || isStopping;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleTimer(taskId);
  };

  if (isLoading) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        disabled
      >
        <Loader2 className={cn("animate-spin", size === "icon" ? "h-4 w-4" : "h-4 w-4 mr-1")} />
        {showLabel && <span>Loading...</span>}
      </Button>
    );
  }

  if (isRunning) {
    return (
      <Button
        variant={variant}
        size={size}
        className={cn(
          "text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950",
          className
        )}
        onClick={handleClick}
        title="Stop timer"
      >
        <Square className={cn("fill-current", size === "icon" ? "h-4 w-4" : "h-4 w-4 mr-1")} />
        {showLabel && <span>Stop</span>}
        <span className="sr-only">Stop timer</span>
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
      title="Start timer"
    >
      <Play className={cn(size === "icon" ? "h-4 w-4" : "h-4 w-4 mr-1")} />
      {showLabel && <span>Start</span>}
      <span className="sr-only">Start timer</span>
    </Button>
  );
}

// Inline timer button with elapsed time shown when running
interface TimerButtonInlineProps {
  taskId: string;
  className?: string;
}

export function TimerButtonInline({
  taskId,
  className,
}: TimerButtonInlineProps) {
  const {
    activeTimer,
    elapsedSeconds,
    isTimerRunningForTask,
    isStarting,
    isStopping,
    toggleTimer,
  } = useTimerControls();

  const isRunning = isTimerRunningForTask(taskId);
  const isLoading = isStarting || isStopping;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleTimer(taskId);
  };

  // Format elapsed time as MM:SS
  const formatShortTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isRunning) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
          "bg-green-100 text-green-700 hover:bg-green-200",
          "dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800",
          isLoading && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-600 dark:bg-green-400" />
        </span>
        <span className="font-mono">{formatShortTime(elapsedSeconds)}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
        "text-muted-foreground hover:text-foreground hover:bg-muted",
        isLoading && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <Play className="h-3 w-3" />
      <span>Start</span>
    </button>
  );
}
