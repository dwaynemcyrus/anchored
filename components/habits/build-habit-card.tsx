"use client";

import styles from "./build-habit-card.module.css";
import type { BuildHabitWithStatus } from "@/lib/hooks/use-build-habits";
import { formatBuildAmount } from "@/lib/habits/build-stats";

interface BuildHabitCardProps {
  habit: BuildHabitWithStatus;
  onLogProgress: (habitId: string, amount: number) => void;
  onUndoProgress: (eventId: string) => void;
  isLogging?: boolean;
  isUndoing?: boolean;
}

export function BuildHabitCard({
  habit,
  onLogProgress,
  onUndoProgress,
  isLogging,
  isUndoing,
}: BuildHabitCardProps) {
  const { quickAddAmounts, unit } = habit;

  return (
    <div
      className={`${styles.card} ${
        habit.status === "complete" ? styles.statusComplete : ""
      }`}
    >
      <div className={styles.header}>
        <h3 className={styles.title}>{habit.title}</h3>
        <p className={styles.periodLabel}>{habit.periodLabel}</p>
      </div>

      <div className={styles.progress}>
        <span className={styles.progressText}>
          {habit.totalDone} / {habit.target}
        </span>
        <p className={styles.remaining}>
          {habit.status === "complete"
            ? "Complete"
            : `${habit.remaining} ${unit} to go`}
        </p>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => onLogProgress(habit.id, quickAddAmounts.small)}
          disabled={isLogging}
        >
          +{quickAddAmounts.small}
        </button>
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => onLogProgress(habit.id, quickAddAmounts.medium)}
          disabled={isLogging}
        >
          +{quickAddAmounts.medium}
        </button>
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => onLogProgress(habit.id, quickAddAmounts.large)}
          disabled={isLogging}
        >
          +{quickAddAmounts.large}
        </button>
        {habit.lastEventId && (
          <button
            type="button"
            className={`${styles.actionButton} ${styles.undoButton}`}
            onClick={() => onUndoProgress(habit.lastEventId!)}
            disabled={isUndoing}
          >
            Undo last
          </button>
        )}
      </div>
    </div>
  );
}

interface BuildHabitCardCompactProps {
  habit: BuildHabitWithStatus;
  onLogProgress: (habitId: string, amount: number) => void;
  onUndoProgress: (eventId: string) => void;
  isLogging?: boolean;
  isUndoing?: boolean;
}

export function BuildHabitCardCompact({
  habit,
  onLogProgress,
  onUndoProgress,
  isLogging,
  isUndoing,
}: BuildHabitCardCompactProps) {
  const { quickAddAmounts } = habit;

  return (
    <div
      className={`${styles.cardCompact} ${
        habit.status === "complete" ? styles.compactStatusComplete : ""
      }`}
    >
      <div className={styles.compactHeader}>
        <h3 className={styles.compactTitle}>{habit.title}</h3>
        <span className={styles.compactProgress}>
          {habit.totalDone} / {habit.target}
        </span>
      </div>

      <div className={styles.compactActions}>
        <button
          type="button"
          className={styles.compactActionButton}
          onClick={() => onLogProgress(habit.id, quickAddAmounts.small)}
          disabled={isLogging}
        >
          +{quickAddAmounts.small}
        </button>
        <button
          type="button"
          className={styles.compactActionButton}
          onClick={() => onLogProgress(habit.id, quickAddAmounts.medium)}
          disabled={isLogging}
        >
          +{quickAddAmounts.medium}
        </button>
        <button
          type="button"
          className={styles.compactActionButton}
          onClick={() => onLogProgress(habit.id, quickAddAmounts.large)}
          disabled={isLogging}
        >
          +{quickAddAmounts.large}
        </button>
        {habit.lastEventId && (
          <button
            type="button"
            className={styles.compactUndoButton}
            onClick={() => onUndoProgress(habit.lastEventId!)}
            disabled={isUndoing}
          >
            Undo
          </button>
        )}
      </div>
    </div>
  );
}
