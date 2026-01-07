"use client";

import { useMemo, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import styles from "./pull-search.module.css";

type SearchMode = "local" | "global";

interface PullSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const mockResults = [
  {
    id: "result-1",
    title: "Dwayne M. Cyrus Platform — Project Scope & Architecture v4.2",
    snippet: "… writing happens. Focus: Editor quality over features.",
    date: "27 Dec 2025",
  },
  {
    id: "result-2",
    title: "Phase 2 — ANCHORED: WRITING SURFACE",
    snippet: "… writing happens per completed period 5. User flow.",
    date: "Jan 2",
  },
  {
    id: "result-3",
    title: "Master habit schema",
    snippet: "… writing happens in getanchored.app. No context.",
    date: "31 Dec 2025",
  },
];

export function PullSearch({ isOpen, onClose }: PullSearchProps) {
  const [mode, setMode] = useState<SearchMode>("local");
  const modeLabel = useMemo(() => (mode === "local" ? "Local" : "Global"), [mode]);

  if (!isOpen) {
    return null;
  }

  if (mode === "global") {
    return (
      <div className={styles.globalRoot} role="dialog" aria-modal="true">
        <div className={styles.globalHeader}>
          <div className={styles.globalInput}>
            <span className={styles.globalIcon} aria-hidden="true">
              ⌕
            </span>
            <input
              className={styles.globalField}
              placeholder="Search"
              autoFocus
            />
            <button
              type="button"
              className={styles.globalClear}
              aria-label="Clear"
            >
              ×
            </button>
          </div>
          <button type="button" className={styles.globalCancel} onClick={onClose}>
            Cancel
          </button>
        </div>
        <div className={styles.globalResults}>
          {mockResults.map((result) => (
            <button key={result.id} className={styles.resultRow} type="button">
              <div className={styles.resultTitle}>{result.title}</div>
              <div className={styles.resultMeta}>
                <span className={styles.resultDate}>{result.date}</span>
                <span className={styles.resultSnippet}>{result.snippet}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.localRoot} role="dialog" aria-modal="true">
      <div className={styles.localBar}>
        <button
          type="button"
          className={styles.localClose}
          onClick={onClose}
          aria-label="Close search"
        >
          ×
        </button>
        <button
          type="button"
          className={styles.localMode}
          onClick={() => setMode("global")}
        >
          {modeLabel}
        </button>
        <div className={styles.localNav}>
          <button type="button" className={styles.navButton} aria-label="Previous">
            ‹
          </button>
          <button type="button" className={styles.navButton} aria-label="Next">
            ›
          </button>
        </div>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button type="button" className={styles.moreButton} aria-label="More">
              ⋯
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className={styles.moreMenu} align="end" sideOffset={8}>
              <DropdownMenu.Item className={styles.moreItem}>
                Replace
              </DropdownMenu.Item>
              <DropdownMenu.Item className={styles.moreItem}>
                Ignore case
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
      <div className={styles.localInputRow}>
        <span className={styles.localSearchIcon} aria-hidden="true">
          ⌕
        </span>
        <input className={styles.localField} placeholder="Search" autoFocus />
      </div>
    </div>
  );
}
