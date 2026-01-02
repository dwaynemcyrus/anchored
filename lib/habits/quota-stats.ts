/**
 * Quota habit statistics calculations
 * Pure functions for computing streaks and stats from period data
 */

import type { HabitPeriod } from "@/types/database";

export interface QuotaStats {
  /** Current consecutive winning periods */
  currentWinStreak: number;
  /** Number of winning periods in last 7 periods */
  winsLast7: number;
  /** Number of winning periods in last 30 periods */
  winsLast30: number;
  /** Total number of periods where status was 'over' */
  breachCount: number;
}

/**
 * Calculate quota habit statistics from period history
 * Periods should be sorted by local_period_start descending (most recent first)
 */
export function calculateQuotaStats(
  periods: Pick<HabitPeriod, "status" | "local_period_start">[],
  allowSoftOver: boolean
): QuotaStats {
  // A winning period is one with status 'under'
  // A failed period is 'over' when allow_soft_over is false
  const isWin = (status: string) => status === "under";
  const isBreach = (status: string) => status === "over" && !allowSoftOver;

  // Calculate current winning streak (consecutive 'under' from most recent)
  let currentWinStreak = 0;
  for (const period of periods) {
    if (isWin(period.status)) {
      currentWinStreak++;
    } else {
      break;
    }
  }

  // Calculate wins in last 7 periods
  const last7 = periods.slice(0, 7);
  const winsLast7 = last7.filter((p) => isWin(p.status)).length;

  // Calculate wins in last 30 periods
  const last30 = periods.slice(0, 30);
  const winsLast30 = last30.filter((p) => isWin(p.status)).length;

  // Calculate total breach count
  const breachCount = periods.filter((p) => isBreach(p.status)).length;

  return {
    currentWinStreak,
    winsLast7,
    winsLast30,
    breachCount,
  };
}

/**
 * Determine the status for a period based on usage
 */
export function calculatePeriodStatus(
  totalUsed: number,
  quotaAmount: number,
  nearThresholdPercent: number
): "under" | "near" | "over" {
  const nearThreshold = quotaAmount * (nearThresholdPercent / 100);

  if (totalUsed >= quotaAmount) {
    return "over";
  }

  if (totalUsed >= nearThreshold) {
    return "near";
  }

  return "under";
}

/**
 * Calculate remaining quota for a period
 */
export function calculateRemaining(
  totalUsed: number,
  quotaAmount: number
): number {
  return Math.max(0, quotaAmount - totalUsed);
}

/**
 * Format amount with unit for display
 */
export function formatQuotaAmount(
  amount: number,
  unit: string
): string {
  // Handle decimal display based on unit
  const displayAmount = unit === "currency"
    ? amount.toFixed(2)
    : Number.isInteger(amount)
      ? amount.toString()
      : amount.toFixed(1);

  switch (unit) {
    case "minutes":
      if (amount >= 60) {
        const hours = Math.floor(amount / 60);
        const mins = amount % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
      }
      return `${displayAmount}m`;
    case "count":
      return displayAmount;
    case "grams":
      return `${displayAmount}g`;
    case "units":
      return displayAmount;
    case "currency":
      return `$${displayAmount}`;
    default:
      return displayAmount;
  }
}

/**
 * Get quick add presets for a quota habit
 * Returns small, medium, large amounts based on the quota
 */
export function getQuickAddAmounts(
  quotaAmount: number,
  unit: string
): { small: number; medium: number; large: number } {
  // Default ratios: small = 10%, medium = 25%, large = 50%
  let small = Math.round(quotaAmount * 0.1);
  let medium = Math.round(quotaAmount * 0.25);
  let large = Math.round(quotaAmount * 0.5);

  // Ensure minimums based on unit
  switch (unit) {
    case "minutes":
      small = Math.max(5, small);
      medium = Math.max(15, medium);
      large = Math.max(30, large);
      break;
    case "count":
      small = Math.max(1, small);
      medium = Math.max(1, medium);
      large = Math.max(1, large);
      break;
    case "grams":
      small = Math.max(5, small);
      medium = Math.max(10, medium);
      large = Math.max(25, large);
      break;
    case "currency":
      small = Math.max(1, small);
      medium = Math.max(5, medium);
      large = Math.max(10, large);
      break;
    default:
      small = Math.max(1, small);
      medium = Math.max(1, medium);
      large = Math.max(1, large);
  }

  return { small, medium, large };
}
