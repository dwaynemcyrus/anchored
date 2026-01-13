"use client";

import { useMemo } from "react";
import {
  calculateStats,
  formatReadingTime,
  formatNumber,
} from "@/lib/utils/document-stats";
import styles from "./DocumentStats.module.css";

type DocumentStatsProps = {
  text: string;
};

export function DocumentStats({ text }: DocumentStatsProps) {
  const stats = useMemo(() => calculateStats(text), [text]);

  return (
    <div className={styles.container}>
      <div className={styles.stat}>
        <span className={styles.value}>{formatNumber(stats.wordCount)}</span>
        <span className={styles.label}>words</span>
      </div>
      <div className={styles.divider} />
      <div className={styles.stat}>
        <span className={styles.value}>{formatNumber(stats.characterCount)}</span>
        <span className={styles.label}>characters</span>
      </div>
      <div className={styles.divider} />
      <div className={styles.stat}>
        <span className={styles.value}>{stats.paragraphCount}</span>
        <span className={styles.label}>{stats.paragraphCount === 1 ? "paragraph" : "paragraphs"}</span>
      </div>
      <div className={styles.divider} />
      <div className={styles.stat}>
        <span className={styles.value}>{formatReadingTime(stats.readingTimeMinutes)}</span>
      </div>
    </div>
  );
}

type DocumentStatsCompactProps = {
  text: string;
};

export function DocumentStatsCompact({ text }: DocumentStatsCompactProps) {
  const stats = useMemo(() => calculateStats(text), [text]);

  return (
    <div className={styles.compact}>
      <span>{formatNumber(stats.wordCount)} words</span>
      <span className={styles.compactDivider}>·</span>
      <span>{formatReadingTime(stats.readingTimeMinutes)}</span>
    </div>
  );
}
