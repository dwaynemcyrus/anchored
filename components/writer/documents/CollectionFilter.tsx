"use client";

import styles from "./CollectionFilter.module.css";

export type Collection = {
  id: string;
  label: string;
  count?: number;
};

export type CollectionFilterProps = {
  collections: Collection[];
  activeCollection: string | null;
  onCollectionChange: (collectionId: string | null) => void;
  showAll?: boolean;
  totalCount?: number;
};

export function CollectionFilter({
  collections,
  activeCollection,
  onCollectionChange,
  showAll = true,
  totalCount,
}: CollectionFilterProps) {
  if (collections.length === 0) {
    return null;
  }

  return (
    <div className={styles.filter}>
      {showAll && (
        <button
          type="button"
          className={`${styles.tab} ${activeCollection === null ? styles.tabActive : ""}`}
          onClick={() => onCollectionChange(null)}
        >
          All
          {totalCount !== undefined && (
            <span className={styles.count}>{totalCount}</span>
          )}
        </button>
      )}
      {collections.map((collection) => (
        <button
          key={collection.id}
          type="button"
          className={`${styles.tab} ${activeCollection === collection.id ? styles.tabActive : ""}`}
          onClick={() => onCollectionChange(collection.id)}
        >
          {collection.label}
          {collection.count !== undefined && (
            <span className={styles.count}>{collection.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
