"use client";

import styles from "./TagBadge.module.css";

export type TagBadgeProps = {
  tag: string;
  onClick?: (tag: string) => void;
  active?: boolean;
  size?: "small" | "medium";
};

export function TagBadge({
  tag,
  onClick,
  active = false,
  size = "small",
}: TagBadgeProps) {
  const className = `${styles.badge} ${styles[size]} ${active ? styles.active : ""} ${onClick ? styles.clickable : ""}`;

  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        onClick={() => onClick(tag)}
      >
        {tag}
      </button>
    );
  }

  return <span className={className}>{tag}</span>;
}

export type TagListProps = {
  tags: string[];
  onTagClick?: (tag: string) => void;
  activeTags?: string[];
  size?: "small" | "medium";
  limit?: number;
};

export function TagList({
  tags,
  onTagClick,
  activeTags = [],
  size = "small",
  limit,
}: TagListProps) {
  if (!tags || tags.length === 0) {
    return null;
  }

  const displayTags = limit ? tags.slice(0, limit) : tags;
  const remaining = limit ? tags.length - limit : 0;

  return (
    <div className={styles.list}>
      {displayTags.map((tag) => (
        <TagBadge
          key={tag}
          tag={tag}
          onClick={onTagClick}
          active={activeTags.includes(tag)}
          size={size}
        />
      ))}
      {remaining > 0 && (
        <span className={`${styles.badge} ${styles[size]} ${styles.more}`}>
          +{remaining}
        </span>
      )}
    </div>
  );
}
