"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface TaskSkeletonProps {
  count?: number;
  compact?: boolean;
}

export function TaskSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card",
        compact ? "p-2" : "p-3"
      )}
    >
      {/* Checkbox */}
      <Skeleton className={cn("rounded", compact ? "h-4 w-4" : "h-5 w-5")} />

      {/* Content */}
      <div className="flex-1 space-y-2">
        <Skeleton className={cn("h-4", compact ? "w-3/4" : "w-2/3")} />
        <div className="flex items-center gap-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>

      {/* Actions */}
      <Skeleton className={cn("rounded", compact ? "h-7 w-7" : "h-8 w-8")} />
    </div>
  );
}

export function TaskListSkeleton({ count = 3, compact = false }: TaskSkeletonProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <TaskSkeleton key={i} compact={compact} />
      ))}
    </div>
  );
}

export function TaskListGroupedSkeleton() {
  return (
    <div className="space-y-6">
      {/* Today section */}
      <section>
        <Skeleton className="h-4 w-24 mb-3" />
        <TaskListSkeleton count={2} />
      </section>

      {/* Anytime section */}
      <section>
        <Skeleton className="h-4 w-20 mb-3" />
        <TaskListSkeleton count={2} />
      </section>

      {/* Inbox section */}
      <section>
        <Skeleton className="h-4 w-16 mb-3" />
        <TaskListSkeleton count={1} />
      </section>
    </div>
  );
}
