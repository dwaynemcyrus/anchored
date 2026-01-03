/**
 * Period calculation utilities for quota habits
 * Handles day/week/month period boundaries in user's timezone
 */

import { TZDate } from "@date-fns/tz";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  format,
  isSameDay,
  isSameWeek,
  isSameMonth,
} from "date-fns";

export type QuotaPeriod = "day" | "week" | "month";

export interface PeriodBounds {
  start: Date;
  end: Date;
  localStartDate: string; // yyyy-MM-dd format
  localEndDate: string; // yyyy-MM-dd format
}

/**
 * Get the current period bounds for a given timezone and period type
 */
export function getCurrentPeriod(
  timezone: string,
  period: QuotaPeriod
): PeriodBounds {
  const now = new TZDate(new Date(), timezone);
  return getPeriodForDate(now, timezone, period);
}

/**
 * Get the period bounds for a specific date
 */
export function getPeriodForDate(
  date: Date,
  timezone: string,
  period: QuotaPeriod
): PeriodBounds {
  const tzDate = new TZDate(date, timezone);

  let start: Date;
  let end: Date;

  switch (period) {
    case "day":
      start = startOfDay(tzDate);
      end = endOfDay(tzDate);
      break;
    case "week":
      // Sunday is the start of week (weekStartsOn: 0)
      start = startOfWeek(tzDate, { weekStartsOn: 0 });
      end = endOfWeek(tzDate, { weekStartsOn: 0 });
      break;
    case "month":
      start = startOfMonth(tzDate);
      end = endOfMonth(tzDate);
      break;
  }

  return {
    start,
    end,
    localStartDate: format(start, "yyyy-MM-dd"),
    localEndDate: format(end, "yyyy-MM-dd"),
  };
}

/**
 * Check if two dates are in the same period
 */
export function isSamePeriod(
  a: Date,
  b: Date,
  timezone: string,
  period: QuotaPeriod
): boolean {
  const tzA = new TZDate(a, timezone);
  const tzB = new TZDate(b, timezone);

  switch (period) {
    case "day":
      return isSameDay(tzA, tzB);
    case "week":
      return isSameWeek(tzA, tzB, { weekStartsOn: 0 });
    case "month":
      return isSameMonth(tzA, tzB);
  }
}

/**
 * Get a human-readable label for a period
 */
export function getPeriodLabel(
  periodStart: string,
  period: QuotaPeriod
): string {
  const date = new Date(periodStart + "T00:00:00");

  switch (period) {
    case "day":
      return format(date, "EEE, MMM d");
    case "week":
      return `Week of ${format(date, "MMM d")}`;
    case "month":
      return format(date, "MMMM yyyy");
  }
}

/**
 * Get the period label for the current period
 */
export function getCurrentPeriodLabel(
  timezone: string,
  period: QuotaPeriod
): string {
  const current = getCurrentPeriod(timezone, period);
  return getPeriodLabel(current.localStartDate, period);
}

/**
 * Format remaining time in period for display
 */
export function formatPeriodRemaining(
  periodEnd: Date,
  timezone: string
): string {
  const now = new TZDate(new Date(), timezone);
  const diffMs = periodEnd.getTime() - now.getTime();

  if (diffMs <= 0) {
    return "Period ended";
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days !== 1 ? "s" : ""} left`;
  }

  if (hours > 0) {
    return `${hours} hour${hours !== 1 ? "s" : ""} left`;
  }

  const minutes = Math.floor(diffMs / (1000 * 60));
  return `${minutes} minute${minutes !== 1 ? "s" : ""} left`;
}
