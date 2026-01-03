/**
 * Schedule utilities for ritual/schedule habits
 * Handles occurrence generation and time calculations
 */

import { TZDate } from "@date-fns/tz";
import {
  startOfDay,
  endOfDay,
  addDays,
  setHours,
  setMinutes,
  format,
  isBefore,
  isAfter,
  isSameDay,
  getDay,
} from "date-fns";

// ============================================
// TYPES
// ============================================

export type DayOfWeek = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

export interface DailySchedulePattern {
  type: "daily";
  time: string; // "HH:mm" format
}

export interface WeeklySchedulePattern {
  type: "weekly";
  days: DayOfWeek[];
  time: string; // "HH:mm" format
}

export type SchedulePattern = DailySchedulePattern | WeeklySchedulePattern;

export type OccurrenceStatus = "pending" | "completed" | "missed" | "skipped";

export interface ScheduleOccurrence {
  scheduledAt: Date;
  localDate: string; // yyyy-MM-dd
  status: OccurrenceStatus;
}

// ============================================
// CONSTANTS
// ============================================

const DAY_MAP: Record<DayOfWeek, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

const DAY_NAMES: DayOfWeek[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Parse time string "HH:mm" into hours and minutes
 */
function parseTime(time: string): { hours: number; minutes: number } {
  const [hours, minutes] = time.split(":").map(Number);
  return { hours, minutes };
}

/**
 * Get day of week abbreviation from date
 */
function getDayOfWeek(date: Date): DayOfWeek {
  return DAY_NAMES[getDay(date)];
}

/**
 * Check if a day is in the schedule pattern
 */
function isDayInPattern(date: Date, pattern: SchedulePattern): boolean {
  if (pattern.type === "daily") {
    return true;
  }
  const dayOfWeek = getDayOfWeek(date);
  return pattern.days.includes(dayOfWeek);
}

/**
 * Create scheduled timestamp for a given date and time in timezone
 */
function createScheduledTime(
  date: Date,
  time: string,
  timezone: string
): Date {
  const { hours, minutes } = parseTime(time);
  const tzDate = new TZDate(date, timezone);
  const dayStart = startOfDay(tzDate);
  return setMinutes(setHours(dayStart, hours), minutes);
}

// ============================================
// OCCURRENCE GENERATION
// ============================================

/**
 * Generate occurrences for a schedule habit within a date range
 * Returns occurrences that should exist but may not be in database yet
 */
export function generateOccurrences(
  pattern: SchedulePattern,
  timezone: string,
  rangeStart: Date,
  rangeEnd: Date
): ScheduleOccurrence[] {
  const occurrences: ScheduleOccurrence[] = [];
  const now = new TZDate(new Date(), timezone);
  const today = startOfDay(now);

  let current = startOfDay(new TZDate(rangeStart, timezone));
  const end = endOfDay(new TZDate(rangeEnd, timezone));

  while (isBefore(current, end) || isSameDay(current, end)) {
    if (isDayInPattern(current, pattern)) {
      const scheduledAt = createScheduledTime(current, pattern.time, timezone);
      const localDate = format(current, "yyyy-MM-dd");

      // Determine default status
      let status: OccurrenceStatus;
      if (isBefore(current, today)) {
        // Past occurrences default to missed
        status = "missed";
      } else {
        // Today and future default to pending
        status = "pending";
      }

      occurrences.push({
        scheduledAt,
        localDate,
        status,
      });
    }
    current = addDays(current, 1);
  }

  return occurrences;
}

/**
 * Get today's occurrences for a schedule habit
 */
export function getTodayOccurrences(
  pattern: SchedulePattern,
  timezone: string
): ScheduleOccurrence[] {
  const now = new TZDate(new Date(), timezone);
  const today = startOfDay(now);
  return generateOccurrences(pattern, timezone, today, today);
}

/**
 * Check if an occurrence is past its scheduled time
 */
export function isOccurrencePast(
  scheduledAt: Date,
  timezone: string
): boolean {
  const now = new TZDate(new Date(), timezone);
  return isAfter(now, scheduledAt);
}

/**
 * Format scheduled time for display
 */
export function formatScheduledTime(scheduledAt: Date): string {
  return format(scheduledAt, "h:mm a");
}

/**
 * Format schedule pattern for display
 */
export function formatSchedulePattern(pattern: SchedulePattern): string {
  const { hours, minutes } = parseTime(pattern.time);
  const timeStr = format(setMinutes(setHours(new Date(), hours), minutes), "h:mm a");

  if (pattern.type === "daily") {
    return `Daily at ${timeStr}`;
  }

  if (pattern.days.length === 7) {
    return `Daily at ${timeStr}`;
  }

  if (pattern.days.length === 1) {
    const dayName = pattern.days[0].charAt(0).toUpperCase() + pattern.days[0].slice(1);
    return `${dayName} at ${timeStr}`;
  }

  const dayNames = pattern.days
    .map((d) => d.charAt(0).toUpperCase() + d.slice(1))
    .join(", ");
  return `${dayNames} at ${timeStr}`;
}

/**
 * Get next occurrence date for a schedule pattern
 */
export function getNextOccurrence(
  pattern: SchedulePattern,
  timezone: string
): Date | null {
  const now = new TZDate(new Date(), timezone);
  const today = startOfDay(now);

  // Check today first
  if (isDayInPattern(today, pattern)) {
    const todayScheduled = createScheduledTime(today, pattern.time, timezone);
    if (isAfter(todayScheduled, now)) {
      return todayScheduled;
    }
  }

  // Check next 7 days
  for (let i = 1; i <= 7; i++) {
    const day = addDays(today, i);
    if (isDayInPattern(day, pattern)) {
      return createScheduledTime(day, pattern.time, timezone);
    }
  }

  return null;
}

export { DAY_NAMES, DAY_MAP };
