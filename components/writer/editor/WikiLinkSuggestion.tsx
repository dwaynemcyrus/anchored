"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useCallback,
} from "react";
import styles from "./WikiLinkSuggestion.module.css";

export type WikiLinkSuggestionItem = {
  id: string;
  title: string;
  slug: string;
};

export type WikiLinkSuggestionProps = {
  items: WikiLinkSuggestionItem[];
  command: (item: WikiLinkSuggestionItem) => void;
};

export type WikiLinkSuggestionRef = {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
};

export const WikiLinkSuggestionList = forwardRef<
  WikiLinkSuggestionRef,
  WikiLinkSuggestionProps
>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = useCallback(
    (index: number) => {
      const item = items[index];
      if (item) {
        command(item);
      }
    },
    [items, command]
  );

  const upHandler = useCallback(() => {
    setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
  }, [items.length]);

  const downHandler = useCallback(() => {
    setSelectedIndex((prev) => (prev + 1) % items.length);
  }, [items.length]);

  const enterHandler = useCallback(() => {
    selectItem(selectedIndex);
  }, [selectItem, selectedIndex]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        upHandler();
        return true;
      }

      if (event.key === "ArrowDown") {
        downHandler();
        return true;
      }

      if (event.key === "Enter") {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  if (items.length === 0) {
    return (
      <div className={styles.suggestionList}>
        <div className={styles.noResults}>No documents found</div>
      </div>
    );
  }

  return (
    <div className={styles.suggestionList}>
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          className={`${styles.suggestionItem} ${
            index === selectedIndex ? styles.selected : ""
          }`}
          onClick={() => selectItem(index)}
        >
          <span className={styles.title}>{item.title}</span>
          <span className={styles.slug}>{item.slug}</span>
        </button>
      ))}
    </div>
  );
});

WikiLinkSuggestionList.displayName = "WikiLinkSuggestionList";
