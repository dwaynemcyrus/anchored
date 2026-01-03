"use client";

import styles from "./schedule-habit-card.module.css";
import type {
  ScheduleHabitWithOccurrences,
  ScheduleOccurrence,
} from "@/lib/hooks/use-schedule-habits";
import {
  formatScheduledTime,
  getStatusDisplayText,
} from "@/lib/hooks/use-schedule-habits";

interface ScheduleHabitCardProps {
  habit: ScheduleHabitWithOccurrences;
  onMarkComplete: (
    habitId: string,
    scheduledAt: Date,
    localDate: string
  ) => void;
  onMarkSkipped: (
    habitId: string,
    scheduledAt: Date,
    localDate: string
  ) => void;
  isMarking?: boolean;
}

export function ScheduleHabitCard({
  habit,
  onMarkComplete,
  onMarkSkipped,
  isMarking,
}: ScheduleHabitCardProps) {
  const getStatusClass = (status: string) => {
    switch (status) {
      case "completed":
        return styles.statusCompleted;
      case "missed":
        return styles.statusMissed;
      case "skipped":
        return styles.statusSkipped;
      default:
        return "";
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>{habit.title}</h3>
        <p className={styles.patternLabel}>{habit.patternLabel}</p>
      </div>

      <div className={styles.occurrenceList}>
        {habit.todayOccurrences.length === 0 ? (
          <p className={styles.emptyOccurrences}>No occurrences today</p>
        ) : (
          habit.todayOccurrences.map((occurrence, idx) => (
            <OccurrenceRow
              key={occurrence.id || idx}
              occurrence={occurrence}
              habitId={habit.id}
              onMarkComplete={onMarkComplete}
              onMarkSkipped={onMarkSkipped}
              isMarking={isMarking}
              getStatusClass={getStatusClass}
            />
          ))
        )}
      </div>

      <div className={styles.stats}>
        <div className={styles.statsRow}>
          <span className={styles.statItem}>
            <span className={styles.statValue}>{habit.stats.completionRate}%</span>
            completion
          </span>
          <span className={styles.statItem}>
            <span className={styles.statValue}>{habit.stats.consistencyRun}</span>
            streak
          </span>
        </div>
      </div>
    </div>
  );
}

interface OccurrenceRowProps {
  occurrence: ScheduleOccurrence;
  habitId: string;
  onMarkComplete: (
    habitId: string,
    scheduledAt: Date,
    localDate: string
  ) => void;
  onMarkSkipped: (
    habitId: string,
    scheduledAt: Date,
    localDate: string
  ) => void;
  isMarking?: boolean;
  getStatusClass: (status: string) => string;
}

function OccurrenceRow({
  occurrence,
  habitId,
  onMarkComplete,
  onMarkSkipped,
  isMarking,
  getStatusClass,
}: OccurrenceRowProps) {
  const isPending = occurrence.status === "pending";
  const canAct = isPending && !isMarking;

  return (
    <div className={styles.occurrenceRow}>
      <div className={styles.occurrenceInfo}>
        <span className={styles.occurrenceTime}>
          {formatScheduledTime(occurrence.scheduledAt)}
        </span>
        <span
          className={`${styles.occurrenceStatus} ${getStatusClass(
            occurrence.status
          )}`}
        >
          {getStatusDisplayText(occurrence.status)}
        </span>
      </div>

      {isPending && (
        <div className={styles.occurrenceActions}>
          <button
            type="button"
            className={styles.actionButton}
            onClick={() =>
              onMarkComplete(habitId, occurrence.scheduledAt, occurrence.localDate)
            }
            disabled={!canAct}
          >
            Complete
          </button>
          <button
            type="button"
            className={styles.actionButton}
            onClick={() =>
              onMarkSkipped(habitId, occurrence.scheduledAt, occurrence.localDate)
            }
            disabled={!canAct}
          >
            Skip
          </button>
        </div>
      )}
    </div>
  );
}

// Compact version for Today view
interface ScheduleHabitCardCompactProps {
  habit: ScheduleHabitWithOccurrences;
  onMarkComplete: (
    habitId: string,
    scheduledAt: Date,
    localDate: string
  ) => void;
  onMarkSkipped: (
    habitId: string,
    scheduledAt: Date,
    localDate: string
  ) => void;
  isMarking?: boolean;
}

export function ScheduleHabitCardCompact({
  habit,
  onMarkComplete,
  onMarkSkipped,
  isMarking,
}: ScheduleHabitCardCompactProps) {
  const getStatusClass = (status: string) => {
    switch (status) {
      case "completed":
        return styles.statusCompleted;
      case "missed":
        return styles.statusMissed;
      case "skipped":
        return styles.statusSkipped;
      default:
        return "";
    }
  };

  return (
    <div className={styles.cardCompact}>
      <div className={styles.compactHeader}>
        <h3 className={styles.compactTitle}>{habit.title}</h3>
        <span className={styles.compactPattern}>{habit.patternLabel}</span>
      </div>

      <div className={styles.compactOccurrences}>
        {habit.todayOccurrences.length === 0 ? (
          <p className={styles.emptyOccurrences}>No occurrences today</p>
        ) : (
          habit.todayOccurrences.map((occurrence, idx) => {
            const isPending = occurrence.status === "pending";
            const canAct = isPending && !isMarking;

            return (
              <div key={occurrence.id || idx} className={styles.compactOccurrenceRow}>
                <div className={styles.compactOccurrenceInfo}>
                  <span className={styles.compactTime}>
                    {formatScheduledTime(occurrence.scheduledAt)}
                  </span>
                  <span
                    className={`${styles.compactStatus} ${getStatusClass(
                      occurrence.status
                    )}`}
                  >
                    {getStatusDisplayText(occurrence.status)}
                  </span>
                </div>

                {isPending && (
                  <div className={styles.compactActions}>
                    <button
                      type="button"
                      className={styles.compactActionButton}
                      onClick={() =>
                        onMarkComplete(
                          habit.id,
                          occurrence.scheduledAt,
                          occurrence.localDate
                        )
                      }
                      disabled={!canAct}
                    >
                      Complete
                    </button>
                    <button
                      type="button"
                      className={styles.compactActionButton}
                      onClick={() =>
                        onMarkSkipped(
                          habit.id,
                          occurrence.scheduledAt,
                          occurrence.localDate
                        )
                      }
                      disabled={!canAct}
                    >
                      Skip
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
