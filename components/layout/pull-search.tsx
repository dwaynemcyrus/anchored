"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import styles from "./pull-search.module.css";

type SearchMode = "local" | "global";

interface PullSearchProps {
  isOpen: boolean;
  onClose: () => void;
  isPulling: boolean;
  pullProgress: number;
  isArmed: boolean;
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

export function PullSearch({
  isOpen,
  onClose,
  isPulling,
  pullProgress,
  isArmed,
}: PullSearchProps) {
  const [mode, setMode] = useState<SearchMode>("local");
  const modeLabel = useMemo(() => (mode === "local" ? "Local" : "Global"), [mode]);
  const localInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen || mode !== "local") return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, mode]);

  if (!isOpen && !isPulling) {
    return null;
  }

  if (!isOpen && isPulling) {
    return (
      <div
        className={`${styles.pullIndicator} ${isArmed ? styles.pullIndicatorArmed : ""}`}
        style={{
          transform: `translateX(-50%) scale(${0.6 + pullProgress * 0.4})`,
        }}
        aria-hidden="true"
      >
        <span className={styles.pullIcon}>⌕</span>
      </div>
    );
  }

  if (mode === "global") {
    return (
      <div className={styles.globalRoot} role="dialog" aria-modal="true">
        <div className={styles.globalHeader}>
          <button type="button" className={styles.globalCancel} onClick={onClose}>
            Cancel
          </button>
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
          <button
            type="button"
            className={styles.globalMode}
            onClick={() => setMode("local")}
          >
            Local
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
    <div
      className={styles.localOverlay}
      onClick={() => {
        setMode("local");
        onClose();
      }}
    >
      <div
        className={styles.localRoot}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.preventDefault()}
        onTouchStart={(event) => event.preventDefault()}
      >
        <div className={styles.localInputRow}>
          <input
            ref={localInputRef}
            className={styles.localField}
            placeholder="Search"
            autoFocus
          />
        </div>
        <div className={styles.localBar}>
          <button
            type="button"
            className={styles.localClose}
            onClick={() => {
              setMode("local");
              onClose();
            }}
            onMouseDown={(event) => event.preventDefault()}
            onTouchStart={(event) => event.preventDefault()}
            aria-label="Close search"
          >
            Close
          </button>
          <div className={styles.localNav}>
            <button
              type="button"
              className={styles.navButton}
              aria-label="Previous"
              onMouseDown={(event) => event.preventDefault()}
              onTouchStart={(event) => event.preventDefault()}
            >
              ‹
            </button>
            <button
              type="button"
              className={styles.navButton}
              aria-label="Next"
              onMouseDown={(event) => event.preventDefault()}
              onTouchStart={(event) => event.preventDefault()}
            >
              ›
            </button>
          </div>
          <DropdownMenu.Root
            onOpenChange={(open) => {
              if (!open) return;
              setTimeout(() => {
                localInputRef.current?.focus();
              }, 0);
            }}
          >
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className={styles.moreButton}
                aria-label="More"
                onMouseDown={(event) => event.preventDefault()}
                onTouchStart={(event) => event.preventDefault()}
              >
                More
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className={styles.moreMenu}
                align="end"
                sideOffset={8}
                onCloseAutoFocus={(event) => {
                  event.preventDefault();
                  localInputRef.current?.focus();
                }}
              >
                <DropdownMenu.Item
                  className={styles.moreItem}
                  onMouseDown={(event) => event.preventDefault()}
                  onTouchStart={(event) => event.preventDefault()}
                >
                  Replace
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className={styles.moreItem}
                  onMouseDown={(event) => event.preventDefault()}
                  onTouchStart={(event) => event.preventDefault()}
                >
                  Ignore case
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className={styles.moreItem}
                  onSelect={() => setMode("global")}
                  onMouseDown={(event) => event.preventDefault()}
                  onTouchStart={(event) => event.preventDefault()}
                >
                  Global
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
    </div>
  );
}
