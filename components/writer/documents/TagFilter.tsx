"use client";

import { useMemo } from "react";
import styles from "./TagFilter.module.css";

export type TagWithCount = {
  tag: string;
  count: number;
};

export type TagFilterProps = {
  tags: TagWithCount[];
  activeTags: string[];
  onTagToggle: (tag: string) => void;
  onClearAll?: () => void;
};

export function TagFilter({
  tags,
  activeTags,
  onTagToggle,
  onClearAll,
}: TagFilterProps) {
  const sortedTags = useMemo(() => {
    return [...tags].sort((a, b) => b.count - a.count);
  }, [tags]);

  if (tags.length === 0) {
    return null;
  }

  return (
    <div className={styles.filter}>
      <div className={styles.header}>
        <span className={styles.label}>Tags</span>
        {activeTags.length > 0 && onClearAll && (
          <button
            type="button"
            className={styles.clearButton}
            onClick={onClearAll}
          >
            Clear
          </button>
        )}
      </div>
      <div className={styles.tags}>
        {sortedTags.map(({ tag, count }) => {
          const isActive = activeTags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              className={`${styles.tag} ${isActive ? styles.tagActive : ""}`}
              onClick={() => onTagToggle(tag)}
            >
              <span className={styles.tagName}>{tag}</span>
              <span className={styles.tagCount}>{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
