"use client";

import { useState } from "react";
import { Flame, MoreHorizontal, Pencil, Archive, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import type { HabitWithStreak } from "@/lib/hooks/use-habits";

interface HabitCardProps {
  habit: HabitWithStreak;
  onToggle: (habitId: string, completed: boolean) => void;
  onEdit: (habit: HabitWithStreak) => void;
  onArchive: (habitId: string) => void;
  isToggling?: boolean;
  isArchiving?: boolean;
}

export function HabitCard({
  habit,
  onToggle,
  onEdit,
  onArchive,
  isToggling = false,
  isArchiving = false,
}: HabitCardProps) {
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);

  const handleToggle = () => {
    if (!isToggling) {
      onToggle(habit.id, !habit.completedToday);
    }
  };

  const handleArchive = () => {
    onArchive(habit.id);
    setShowArchiveDialog(false);
  };

  return (
    <>
      <div
        className={cn(
          "group relative rounded-lg border bg-card p-4 transition-colors",
          "hover:border-primary/50",
          habit.completedToday && "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
        )}
      >
        <div className="flex items-start gap-4">
          {/* Large checkbox */}
          <button
            type="button"
            onClick={handleToggle}
            disabled={isToggling}
            className={cn(
              "flex-shrink-0 h-10 w-10 rounded-lg border-2 flex items-center justify-center transition-all",
              habit.completedToday
                ? "bg-green-500 border-green-500 text-white"
                : "border-muted-foreground/30 hover:border-primary",
              isToggling && "opacity-50 cursor-not-allowed"
            )}
          >
            {isToggling ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : habit.completedToday ? (
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
            ) : null}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3
              className={cn(
                "font-medium text-base",
                habit.completedToday && "text-green-700 dark:text-green-300"
              )}
            >
              {habit.title}
            </h3>
            {habit.description && (
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                {habit.description}
              </p>
            )}

            {/* Streak */}
            <div className="flex items-center gap-1.5 mt-2">
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
                {habit.currentStreak} day{habit.currentStreak !== 1 && "s"}
              </span>
            </div>
          </div>

          {/* Actions */}
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
              {isArchiving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Compact version for mobile
export function HabitCardCompact({
  habit,
  onToggle,
  isToggling = false,
}: {
  habit: HabitWithStreak;
  onToggle: (habitId: string, completed: boolean) => void;
  isToggling?: boolean;
}) {
  const handleToggle = () => {
    if (!isToggling) {
      onToggle(habit.id, !habit.completedToday);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors",
        habit.completedToday && "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
      )}
    >
      <Checkbox
        checked={habit.completedToday}
        onCheckedChange={() => handleToggle()}
        disabled={isToggling}
        className="h-6 w-6"
      />
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "font-medium text-sm truncate",
            habit.completedToday && "text-green-700 dark:text-green-300"
          )}
        >
          {habit.title}
        </p>
      </div>
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
    </div>
  );
}
