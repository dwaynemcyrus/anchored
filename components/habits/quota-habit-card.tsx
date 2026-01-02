"use client";

import { useState } from "react";
import styles from "./quota-habit-card.module.css";
import type { QuotaHabitWithStatus } from "@/lib/hooks/use-quota-habits";
import { formatQuotaAmount } from "@/lib/habits/quota-stats";

interface QuotaHabitCardProps {
  habit: QuotaHabitWithStatus;
  onLogUsage: (habitId: string, amount: number) => void;
  onUndoUsage: (eventId: string) => void;
  isLogging?: boolean;
  isUndoing?: boolean;
  compact?: boolean;
}

export function QuotaHabitCard({
  habit,
  onLogUsage,
  onUndoUsage,
  isLogging = false,
  isUndoing = false,
  compact = false,
}: QuotaHabitCardProps) {
  const unit = habit.quota_unit ?? "count";
  const quotaAmount = habit.quota_amount ?? 0;
  const { small, medium, large } = habit.quickAddAmounts;

  const isPending = isLogging || isUndoing;

  const getCardClass = () => {
    const base = compact ? `${styles.card} ${styles.compact}` : styles.card;
    switch (habit.status) {
      case "near":
        return `${base} ${styles.cardNear}`;
      case "over":
        return `${base} ${styles.cardOver}`;
      default:
        return `${base} ${styles.cardUnder}`;
    }
  };

  const getStatusClass = () => {
    switch (habit.status) {
      case "near":
        return `${styles.status} ${styles.statusNear}`;
      case "over":
        return `${styles.status} ${styles.statusOver}`;
      default:
        return `${styles.status} ${styles.statusUnder}`;
    }
  };

  const getStatusLabel = () => {
    switch (habit.status) {
      case "near":
        return "Near limit";
      case "over":
        return "Over limit";
      default:
        return "Under";
    }
  };

  const handleQuickAdd = (amount: number) => {
    if (!isPending) {
      onLogUsage(habit.id, amount);
    }
  };

  const handleUndo = () => {
    if (!isPending && habit.lastUsageEventId) {
      onUndoUsage(habit.lastUsageEventId);
    }
  };

  return (
    <div className={getCardClass()}>
      <div className={styles.header}>
        <h3 className={styles.title}>{habit.title}</h3>
        <span className={getStatusClass()}>{getStatusLabel()}</span>
      </div>

      <div className={styles.remaining}>
        {formatQuotaAmount(habit.remaining, unit)} left
      </div>

      <div className={styles.usage}>
        {formatQuotaAmount(habit.used, unit)} / {formatQuotaAmount(quotaAmount, unit)}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => handleQuickAdd(small)}
          disabled={isPending}
        >
          +{formatQuotaAmount(small, unit)}
        </button>
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => handleQuickAdd(medium)}
          disabled={isPending}
        >
          +{formatQuotaAmount(medium, unit)}
        </button>
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => handleQuickAdd(large)}
          disabled={isPending}
        >
          +{formatQuotaAmount(large, unit)}
        </button>
        {habit.lastUsageEventId && (
          <button
            type="button"
            className={`${styles.actionButton} ${styles.undoButton}`}
            onClick={handleUndo}
            disabled={isPending}
          >
            Undo last
          </button>
        )}
      </div>

      {!compact && (
        <div className={styles.periodLabel}>{habit.periodLabel}</div>
      )}
    </div>
  );
}

// Compact version export for Today view
export function QuotaHabitCardCompact(props: Omit<QuotaHabitCardProps, "compact">) {
  return <QuotaHabitCard {...props} compact />;
}
