/**
 * Build habit statistics - pure functions
 */

export type BuildStatus = "incomplete" | "complete";

export interface BuildPeriodData {
  localPeriodStart: string;
  localPeriodEnd: string;
  totalDone: number;
  status: BuildStatus;
}

export interface BuildStats {
  totalDone: number;
  target: number;
  remaining: number;
  status: BuildStatus;
  percentComplete: number;
}

/**
 * Calculate build habit stats for current period
 */
export function calculateBuildStats(
  totalDone: number,
  target: number
): BuildStats {
  const remaining = Math.max(0, target - totalDone);
  const status: BuildStatus = totalDone >= target ? "complete" : "incomplete";
  const percentComplete = Math.min(100, Math.round((totalDone / target) * 100));

  return {
    totalDone,
    target,
    remaining,
    status,
    percentComplete,
  };
}

/**
 * Calculate win streak from period history
 * Counts consecutive complete periods ending at the last completed period
 */
export function calculateWinStreak(periods: BuildPeriodData[]): number {
  if (periods.length === 0) return 0;

  // Sort by period start descending (most recent first)
  const sorted = [...periods].sort(
    (a, b) => b.localPeriodStart.localeCompare(a.localPeriodStart)
  );

  let streak = 0;
  for (const period of sorted) {
    if (period.status === "complete") {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Calculate wins in last N periods
 */
export function calculateWinsInPeriods(
  periods: BuildPeriodData[],
  n: number
): number {
  const sorted = [...periods].sort(
    (a, b) => b.localPeriodStart.localeCompare(a.localPeriodStart)
  );

  const recent = sorted.slice(0, n);
  return recent.filter((p) => p.status === "complete").length;
}

/**
 * Calculate completion rate as percentage
 */
export function calculateCompletionRate(periods: BuildPeriodData[]): number {
  if (periods.length === 0) return 0;
  const wins = periods.filter((p) => p.status === "complete").length;
  return Math.round((wins / periods.length) * 100);
}

/**
 * Format build amount with unit
 */
export function formatBuildAmount(amount: number, unit: string): string {
  const plural = amount !== 1;
  switch (unit) {
    case "minutes":
      return plural ? `${amount} minutes` : `${amount} minute`;
    case "count":
      return plural ? `${amount} times` : `${amount} time`;
    case "pages":
      return plural ? `${amount} pages` : `${amount} page`;
    case "steps":
      return `${amount.toLocaleString()} steps`;
    case "reps":
      return plural ? `${amount} reps` : `${amount} rep`;
    case "sessions":
      return plural ? `${amount} sessions` : `${amount} session`;
    default:
      return `${amount} ${unit}`;
  }
}

/**
 * Get quick add amounts based on target
 */
export function getBuildQuickAmounts(target: number): { small: number; medium: number; large: number } {
  if (target <= 5) {
    return { small: 1, medium: 2, large: target };
  } else if (target <= 20) {
    return { small: 1, medium: 5, large: 10 };
  } else if (target <= 100) {
    return { small: 5, medium: 10, large: 25 };
  } else {
    return { small: 10, medium: 50, large: 100 };
  }
}
