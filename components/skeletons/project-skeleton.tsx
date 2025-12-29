"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface ProjectSkeletonProps {
  count?: number;
}

export function ProjectCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-3/4" />
        </div>
        <Skeleton className="h-8 w-8 rounded" />
      </div>

      {/* Footer */}
      <div className="flex items-center gap-4 pt-2 border-t">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

export function ProjectListSkeleton({ count = 3 }: ProjectSkeletonProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <ProjectCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProjectDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Back button */}
      <Skeleton className="h-8 w-24" />

      {/* Project info */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Tasks section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-9 w-24" />
        </div>

        {/* Task groups */}
        <div className="space-y-6">
          <section>
            <Skeleton className="h-4 w-24 mb-3" />
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                  <Skeleton className="h-5 w-5 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
