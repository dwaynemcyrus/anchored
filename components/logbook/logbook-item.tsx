"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  RotateCcw,
  MoreHorizontal,
  Trash2,
  CheckCircle2,
  FolderKanban,
  Target,
} from "lucide-react";
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
import type {
  LogbookItem as LogbookItemType,
  LogbookState,
} from "@/lib/hooks/use-logbook";

interface LogbookItemProps {
  item: LogbookItemType;
  state: LogbookState;
  onRestore: () => void;
  onPermanentDelete: () => void;
  isRestoring?: boolean;
  isDeleting?: boolean;
}

function getEntityIcon(entityType: LogbookItemType["entityType"]) {
  switch (entityType) {
    case "project":
      return FolderKanban;
    case "habit":
      return Target;
    default:
      return CheckCircle2;
  }
}

function getEntityPrefix(entityType: LogbookItemType["entityType"]): string {
  switch (entityType) {
    case "project":
      return "Project: ";
    case "habit":
      return "Habit: ";
    default:
      return "";
  }
}

function formatSubtext(item: LogbookItemType, state: LogbookState): string {
  const date = new Date(item.logbookDate);
  const dateStr = format(date, "EEE, MMM d");

  if (state === "completed") {
    return `Completed ${dateStr}`;
  } else {
    const purgeText =
      item.daysUntilPurge !== undefined
        ? item.daysUntilPurge === 0
          ? " · Purges today"
          : item.daysUntilPurge === 1
            ? " · Purges tomorrow"
            : ` · Purges in ${item.daysUntilPurge} days`
        : "";
    return `Deleted ${dateStr}${purgeText}`;
  }
}

export function LogbookItem({
  item,
  state,
  onRestore,
  onPermanentDelete,
  isRestoring,
  isDeleting,
}: LogbookItemProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const Icon = getEntityIcon(item.entityType);
  const prefix = getEntityPrefix(item.entityType);
  const subtext = formatSubtext(item, state);

  const handlePermanentDelete = () => {
    onPermanentDelete();
    setShowDeleteDialog(false);
  };

  return (
    <>
      <div className="group flex items-start gap-3 rounded-md px-3 py-2 hover:bg-accent/50">
        {/* Icon */}
        <div className="mt-0.5 text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">
            {prefix}
            {item.title}
          </p>
          <p className="text-xs text-muted-foreground">{subtext}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={onRestore}
            disabled={isRestoring}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Restore
          </Button>

          {state === "deleted" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete permanently
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Permanent delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete &quot;
              {item.title}&quot; and remove it from your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
