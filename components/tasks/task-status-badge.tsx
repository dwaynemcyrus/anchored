"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/types/database";

const statusConfig: Record<
  TaskStatus,
  { label: string; className: string }
> = {
  inbox: {
    label: "Inbox",
    className: "bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300",
  },
  today: {
    label: "Today",
    className: "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300",
  },
  anytime: {
    label: "Anytime",
    className: "bg-teal-100 text-teal-700 hover:bg-teal-100 dark:bg-teal-900 dark:text-teal-300",
  },
  done: {
    label: "Done",
    className: "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900 dark:text-green-300",
  },
};

interface TaskStatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

export function TaskStatusBadge({ status, className }: TaskStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge
      variant="secondary"
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
