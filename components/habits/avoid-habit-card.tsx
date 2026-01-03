"use client";

import { useState } from "react";
import { Flame, MoreHorizontal, Pencil, Archive, Loader2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { cn } from "@/lib/utils";
import type { AvoidHabitWithStatus } from "@/lib/hooks/use-avoid-habits";

interface AvoidHabitCardProps {
  habit: AvoidHabitWithStatus;
  onLogSlip: (habitId: string) => void;
  onUndoSlip: (slipId: string) => void;
  onExcludeToday: (habitId: string, excluded: boolean) => void;
  onEdit: (habit: AvoidHabitWithStatus) => void;
  onArchive: (habitId: string) => void;
  isLoggingSlip?: boolean;
  isUndoingSlip?: boolean;
  isArchiving?: boolean;
}

export function AvoidHabitCard({
  habit,
  onLogSlip,
  onUndoSlip,
  onExcludeToday,
  onEdit,
  onArchive,
  isLoggingSlip = false,
  isUndoingSlip = false,
  isArchiving = false,
}: AvoidHabitCardProps) {
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);

  const handleLogSlip = () => {
    if (!isLoggingSlip) {
      onLogSlip(habit.id);
    }
  };

  const handleUndoSlip = () => {
    if (!isUndoingSlip && habit.lastTodaySlipId) {
      onUndoSlip(habit.lastTodaySlipId);
    }
  };

  const handleArchive = () => {
    onArchive(habit.id);
    setShowArchiveDialog(false);
  };

  const isClean = habit.todayStatus === "clean";
  const isSlipped = habit.todayStatus === "slipped";
  const isExcluded = habit.todayStatus === "excluded";
  const isPending = isLoggingSlip || isUndoingSlip;

  return (
    <>
      <div
        className={cn(
          "group relative rounded-lg border bg-card p-4 transition-colors",
          "hover:border-primary/50",
          isClean && "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800",
          isSlipped && "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800",
          isExcluded && "bg-muted/50 border-muted"
        )}
      >
        <div className="flex items-start gap-4">
          {/* Status indicator */}
          <div
            className={cn(
              "flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center font-semibold text-sm",
              isClean && "bg-green-500 text-white",
              isSlipped && "bg-red-500 text-white",
              isExcluded && "bg-muted text-muted-foreground"
            )}
          >
            {isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isClean ? (
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : isSlipped ? (
              <span>!</span>
            ) : (
              <span>—</span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3
              className={cn(
                "font-medium text-base",
                isClean && "text-green-700 dark:text-green-300",
                isSlipped && "text-red-700 dark:text-red-300",
                isExcluded && "text-muted-foreground"
              )}
            >
              {habit.title}
            </h3>

            {/* Status text */}
            <p className={cn(
              "text-sm mt-0.5",
              isClean && "text-green-600 dark:text-green-400",
              isSlipped && "text-red-600 dark:text-red-400",
              isExcluded && "text-muted-foreground"
            )}>
              {isClean && "Clean today"}
              {isSlipped && `Slipped${habit.todaySlipCount > 1 ? ` (${habit.todaySlipCount}x)` : ""}`}
              {isExcluded && "Excluded"}
            </p>

            {/* Streak and last slip */}
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <Flame
                  className={cn(
                    "h-4 w-4",
                    habit.currentStreak > 0
                      ? "text-orange-500"
                      : "text-muted-foreground/50"
                  )}
                />
                <span
                  className={cn(
                    "text-sm font-medium",
                    habit.currentStreak > 0
                      ? "text-orange-600 dark:text-orange-400"
                      : "text-muted-foreground"
                  )}
                >
                  {habit.currentStreak} day{habit.currentStreak !== 1 && "s"} clean
                </span>
              </div>
              {habit.lastSlipDate && (
                <span className="text-xs text-muted-foreground">
                  Last slip: {habit.lastSlipDate}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Primary action button */}
            {!isExcluded && (
              isSlipped ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUndoSlip}
                  disabled={isUndoingSlip}
                  className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                >
                  {isUndoingSlip ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Undo2 className="mr-1 h-3 w-3" />
                  )}
                  Undo
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogSlip}
                  disabled={isLoggingSlip}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
                >
                  {isLoggingSlip && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                  Log Slip
                </Button>
              )
            )}

            {/* Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => onExcludeToday(habit.id, !isExcluded)}
                >
                  {isExcluded ? "Include today" : "Exclude today"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onEdit(habit)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowArchiveDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Archive Confirmation */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Habit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive &ldquo;{habit.title}&rdquo;? It
              will no longer appear in your daily view, but your history will be
              preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={isArchiving}
            >
              {isArchiving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Compact version for Today view
export function AvoidHabitCardCompact({
  habit,
  onLogSlip,
  onUndoSlip,
  isLoggingSlip = false,
  isUndoingSlip = false,
}: {
  habit: AvoidHabitWithStatus;
  onLogSlip: (habitId: string) => void;
  onUndoSlip: (slipId: string) => void;
  isLoggingSlip?: boolean;
  isUndoingSlip?: boolean;
}) {
  const isClean = habit.todayStatus === "clean";
  const isSlipped = habit.todayStatus === "slipped";
  const isExcluded = habit.todayStatus === "excluded";
  const isPending = isLoggingSlip || isUndoingSlip;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors",
        isClean && "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800",
        isSlipped && "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800",
        isExcluded && "bg-muted/50 border-muted"
      )}
    >
      {/* Status indicator */}
      <div
        className={cn(
          "flex-shrink-0 h-6 w-6 rounded flex items-center justify-center text-xs font-semibold",
          isClean && "bg-green-500 text-white",
          isSlipped && "bg-red-500 text-white",
          isExcluded && "bg-muted text-muted-foreground"
        )}
      >
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : isClean ? (
          "✓"
        ) : isSlipped ? (
          "!"
        ) : (
          "—"
        )}
      </div>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "font-medium text-sm truncate",
            isClean && "text-green-700 dark:text-green-300",
            isSlipped && "text-red-700 dark:text-red-300",
            isExcluded && "text-muted-foreground"
          )}
        >
          {habit.title}
        </p>
      </div>

      {/* Streak */}
      <div className="flex items-center gap-1">
        <Flame
          className={cn(
            "h-3.5 w-3.5",
            habit.currentStreak > 0 ? "text-orange-500" : "text-muted-foreground/50"
          )}
        />
        <span className="text-xs font-medium text-muted-foreground">
          {habit.currentStreak}
        </span>
      </div>

      {/* Quick action */}
      {!isExcluded && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (isSlipped && habit.lastTodaySlipId) {
              onUndoSlip(habit.lastTodaySlipId);
            } else if (!isSlipped) {
              onLogSlip(habit.id);
            }
          }}
          disabled={isPending}
          className={cn(
            "h-7 px-2 text-xs",
            isSlipped
              ? "text-red-600 hover:text-red-700"
              : "text-muted-foreground hover:text-red-600"
          )}
        >
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : isSlipped ? (
            "Undo"
          ) : (
            "Slip"
          )}
        </Button>
      )}
    </div>
  );
}
