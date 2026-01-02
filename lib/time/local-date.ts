/**
 * Local date utilities for timezone-aware date handling
 *
 * These utilities ensure that "today" and date boundaries are always
 * calculated relative to the user's timezone, never UTC.
 */

import { TZDate } from "@date-fns/tz";
import { format, startOfDay, subDays, addDays } from "date-fns";

/**
 * Get a YYYY-MM-DD string for a date in a specific timezone
 */
export function getLocalDateString(date: Date, timezone: string): string {
  const tzDate = new TZDate(date, timezone);
  return format(tzDate, "yyyy-MM-dd");
}

/**
 * Get today's date as YYYY-MM-DD in a specific timezone
 */
export function getTodayLocalDateString(timezone: string): string {
  return getLocalDateString(new Date(), timezone);
}

/**
 * Get the start of today in a specific timezone
 */
export function getStartOfToday(timezone: string): Date {
  const tzDate = new TZDate(new Date(), timezone);
  return startOfDay(tzDate);
}

/**
 * Get yesterday's date as YYYY-MM-DD in a specific timezone
 */
export function getYesterdayLocalDateString(timezone: string): string {
  const today = new TZDate(new Date(), timezone);
  const yesterday = subDays(today, 1);
  return format(yesterday, "yyyy-MM-dd");
}

/**
 * Get a date N days ago as YYYY-MM-DD in a specific timezone
 */
export function getDaysAgoLocalDateString(
  daysAgo: number,
  timezone: string
): string {
  const today = new TZDate(new Date(), timezone);
  const pastDate = subDays(today, daysAgo);
  return format(pastDate, "yyyy-MM-dd");
}

/**
 * Get a date N days from now as YYYY-MM-DD in a specific timezone
 */
export function getDaysFromNowLocalDateString(
  daysFromNow: number,
  timezone: string
): string {
  const today = new TZDate(new Date(), timezone);
  const futureDate = addDays(today, daysFromNow);
  return format(futureDate, "yyyy-MM-dd");
}

/**
 * Check if a date string (YYYY-MM-DD) is today in a specific timezone
 */
export function isToday(dateString: string, timezone: string): boolean {
  return dateString === getTodayLocalDateString(timezone);
}

/**
 * Check if a date string (YYYY-MM-DD) is yesterday in a specific timezone
 */
export function isYesterday(dateString: string, timezone: string): boolean {
  return dateString === getYesterdayLocalDateString(timezone);
}

/**
 * Parse a local date string (YYYY-MM-DD) into a Date object at start of day in timezone
 */
export function parseLocalDate(dateString: string, timezone: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new TZDate(year, month - 1, day, 0, 0, 0, timezone);
}

/**
 * Get an array of date strings for the last N days (including today)
 */
export function getLastNDays(n: number, timezone: string): string[] {
  const dates: string[] = [];
  for (let i = 0; i < n; i++) {
    dates.push(getDaysAgoLocalDateString(i, timezone));
  }
  return dates;
}

/**
 * Get the user's browser timezone
 */
export function getBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
