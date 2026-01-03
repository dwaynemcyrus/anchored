/**
 * Schedule habit statistics
 * Pure functions for calculating schedule habit stats
 */

import type { OccurrenceStatus } from "@/lib/time/schedule";

// ============================================
// TYPES
// ============================================

export interface ScheduleOccurrenceRecord {
  id: string;
  status: OccurrenceStatus;
  scheduledAt: Date;
  localDate: string;
}

export interface ScheduleStats {
  completionRate: number; // 0-100
  completedLast7: number;
  missedLast7: number;
  skippedLast7: number;
  consistencyRun: number; // consecutive completed, ignoring skipped
  totalOccurrences: number;
  totalCompleted: number;
  totalMissed: number;
}

// ============================================
// STAT CALCULATIONS
// ============================================

/**
 * Calculate completion rate as percentage
 * Skipped occurrences are excluded from the calculation
 */
export function calculateCompletionRate(
  occurrences: ScheduleOccurrenceRecord[]
): number {
  const evaluated = occurrences.filter(
    (o) => o.status === "completed" || o.status === "missed"
  );

  if (evaluated.length === 0) return 0;

  const completed = evaluated.filter((o) => o.status === "completed").length;
  return Math.round((completed / evaluated.length) * 100);
}

/**
 * Count occurrences by status in last N occurrences
 */
export function countRecentByStatus(
  occurrences: ScheduleOccurrenceRecord[],
  status: OccurrenceStatus,
  count: number = 7
): number {
  // Sort by scheduled time descending (most recent first)
  const sorted = [...occurrences].sort(
    (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
  );

  const recent = sorted.slice(0, count);
  return recent.filter((o) => o.status === status).length;
}

/**
 * Calculate current consistency run
 * Counts consecutive completed occurrences, ignoring skipped
 * Stops at first missed occurrence
 */
export function calculateConsistencyRun(
  occurrences: ScheduleOccurrenceRecord[]
): number {
  // Sort by scheduled time descending (most recent first)
  const sorted = [...occurrences].sort(
    (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
  );

  // Filter out pending occurrences (only count past ones)
  const evaluated = sorted.filter((o) => o.status !== "pending");

  let run = 0;
  for (const occurrence of evaluated) {
    if (occurrence.status === "completed") {
      run++;
    } else if (occurrence.status === "skipped") {
      // Skipped doesn't break the run, just skip it
      continue;
    } else {
      // Missed breaks the run
      break;
    }
  }

  return run;
}

/**
 * Calculate all stats for a schedule habit
 */
export function calculateScheduleStats(
  occurrences: ScheduleOccurrenceRecord[]
): ScheduleStats {
  const evaluated = occurrences.filter((o) => o.status !== "pending");

  return {
    completionRate: calculateCompletionRate(occurrences),
    completedLast7: countRecentByStatus(occurrences, "completed", 7),
    missedLast7: countRecentByStatus(occurrences, "missed", 7),
    skippedLast7: countRecentByStatus(occurrences, "skipped", 7),
    consistencyRun: calculateConsistencyRun(occurrences),
    totalOccurrences: evaluated.length,
    totalCompleted: evaluated.filter((o) => o.status === "completed").length,
    totalMissed: evaluated.filter((o) => o.status === "missed").length,
  };
}

/**
 * Format completion rate for display
 */
export function formatCompletionRate(rate: number): string {
  return `${rate}%`;
}

/**
 * Get status display text
 */
export function getStatusDisplayText(status: OccurrenceStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "completed":
      return "Completed";
    case "missed":
      return "Missed";
    case "skipped":
      return "Skipped";
  }
}
