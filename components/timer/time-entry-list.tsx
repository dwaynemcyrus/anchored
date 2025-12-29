"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Clock, Trash2, MoreHorizontal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/utils/formatting";
import {
  useTimeEntriesByTask,
  useDeleteTimeEntry,
  type TimeEntry,
} from "@/lib/hooks/use-timer";

interface TimeEntryListProps {
  taskId: string;
  className?: string;
}

function formatTimeRange(startedAt: string, endedAt: string | null): string {
  const start = new Date(startedAt);
  const end = endedAt ? new Date(endedAt) : new Date();

  const dateStr = format(start, "MMM d");
  const startTime = format(start, "h:mm a");
  const endTime = format(end, "h:mm a");

  return `${dateStr}, ${startTime} - ${endTime}`;
}

function TimeEntrySkeleton() {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-b-0">
      <div className="space-y-1">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-8 w-8 rounded" />
    </div>
  );
}

interface TimeEntryItemProps {
  entry: TimeEntry;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

function TimeEntryItem({ entry, onDelete, isDeleting }: TimeEntryItemProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const timeRange = formatTimeRange(entry.started_at, entry.ended_at);
  const duration = entry.duration_seconds
    ? formatDuration(entry.duration_seconds)
    : "In progress";

  const handleDelete = () => {
    onDelete(entry.id);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <div className="flex items-center justify-between py-3 border-b last:border-b-0 group">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="text-sm text-foreground">{timeRange}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {duration}
            </span>
            {entry.notes && (
              <span className="text-xs text-muted-foreground truncate">
                - {entry.notes}
              </span>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MoreHorizontal className="h-4 w-4" />
              )}
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => setShowDeleteDialog(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete entry
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Time Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this time entry? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function TimeEntryList({ taskId, className }: TimeEntryListProps) {
  const { data: entries, isLoading, error } = useTimeEntriesByTask(taskId);
  const deleteEntry = useDeleteTimeEntry();

  const handleDelete = (entryId: string) => {
    deleteEntry.mutate(entryId);
  };

  // Calculate total time
  const totalSeconds =
    entries?.reduce((sum, entry) => sum + (entry.duration_seconds || 0), 0) ||
    0;

  if (isLoading) {
    return (
      <div className={cn("space-y-0", className)}>
        <TimeEntrySkeleton />
        <TimeEntrySkeleton />
        <TimeEntrySkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("text-sm text-destructive", className)}>
        Failed to load time entries
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-8 text-center",
          className
        )}
      >
        <Clock className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">No time entries yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Start a timer to track time on this task
        </p>
      </div>
    );
  }

  // Filter out entries without ended_at (running timers)
  const completedEntries = entries.filter((e) => e.ended_at !== null);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Time entries list */}
      <div className="divide-y">
        {completedEntries.map((entry) => (
          <TimeEntryItem
            key={entry.id}
            entry={entry}
            onDelete={handleDelete}
            isDeleting={deleteEntry.isPending}
          />
        ))}
      </div>

      {/* Total time */}
      {completedEntries.length > 0 && (
        <div className="flex items-center justify-between pt-3 border-t">
          <span className="text-sm font-medium text-muted-foreground">
            Total time
          </span>
          <span className="text-sm font-semibold">
            {formatDuration(totalSeconds)}
          </span>
        </div>
      )}
    </div>
  );
}

// Compact version for inline display
export function TimeEntryListCompact({
  taskId,
  className,
}: TimeEntryListProps) {
  const { data: entries, isLoading } = useTimeEntriesByTask(taskId);

  const totalSeconds =
    entries?.reduce((sum, entry) => sum + (entry.duration_seconds || 0), 0) ||
    0;
  const entryCount = entries?.filter((e) => e.ended_at !== null).length || 0;

  if (isLoading) {
    return <Skeleton className="h-4 w-20" />;
  }

  if (entryCount === 0) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-1 text-xs text-muted-foreground", className)}>
      <Clock className="h-3 w-3" />
      <span>{formatDuration(totalSeconds)}</span>
      <span>({entryCount} {entryCount === 1 ? "entry" : "entries"})</span>
    </div>
  );
}
