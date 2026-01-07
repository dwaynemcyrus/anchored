"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  applyLocalSearch,
  clearLocalSearchHighlights,
  setActiveMatch,
} from "@/lib/utils/local-search";
import { createClient } from "@/lib/supabase/client";
import styles from "./pull-search.module.css";

type SearchMode = "local" | "global";

interface PullSearchProps {
  isOpen: boolean;
  onClose: () => void;
  isPulling: boolean;
  pullProgress: number;
  isArmed: boolean;
  searchScopeRef: React.RefObject<HTMLDivElement | null>;
}

type GlobalResult = {
  result_id: string;
  result_type: "document" | "task" | "project";
  title: string;
  snippet: string | null;
  updated_at: string | null;
  score: number | null;
};

export function PullSearch({
  isOpen,
  onClose,
  isPulling,
  pullProgress,
  isArmed,
  searchScopeRef,
}: PullSearchProps) {
  const [mode, setMode] = useState<SearchMode>("local");
  const localInputRef = useRef<HTMLInputElement | null>(null);
  const focusLockRef = useRef<number | null>(null);
  const [query, setQuery] = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const matchesRef = useRef<HTMLElement[]>([]);
  const [globalQuery, setGlobalQuery] = useState("");
  const [globalResults, setGlobalResults] = useState<GlobalResult[]>([]);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalCount, setGlobalCount] = useState(0);
  const debounceRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);

  const displayResults = useMemo(() => {
    if (!globalQuery.trim()) return [];
    return globalResults;
  }, [globalQuery, globalResults]);

  useEffect(() => {
    if (mode !== "global" || !isOpen) return;
    const trimmed = globalQuery.trim();
    if (!trimmed) {
      setGlobalResults([]);
      setGlobalCount(0);
      setGlobalLoading(false);
      return;
    }

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    const requestId = ++requestIdRef.current;
    debounceRef.current = window.setTimeout(async () => {
      setGlobalLoading(true);
      const supabase = createClient();
      const { data, error } = await (supabase.rpc as any)(
        "search_all",
        { search_query: trimmed, limit_count: 20 }
      ) as { data: GlobalResult[] | null; error: { message: string } | null };

      if (requestIdRef.current !== requestId) return;
      if (error) {
        setGlobalResults([]);
        setGlobalCount(0);
        setGlobalLoading(false);
        return;
      }
      setGlobalResults(data ?? []);
      setGlobalCount(data?.length ?? 0);
      setGlobalLoading(false);
    }, 220);

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [globalQuery, isOpen, mode]);

  useEffect(() => {
    if (!isOpen || mode !== "local") return;
    const root = searchScopeRef.current;
    if (!root) return;
    const matches = applyLocalSearch(root, query);
    matchesRef.current = matches;
    setMatchCount(matches.length);
    const nextIndex = matches.length
      ? Math.min(activeIndex, matches.length - 1)
      : 0;
    setActiveIndex(nextIndex);
    if (matches.length > 0) {
      setActiveMatch(matches, nextIndex);
    }
  }, [activeIndex, isOpen, mode, query, searchScopeRef]);

  useEffect(() => {
    if (!isOpen || mode !== "local") return;
    const root = searchScopeRef.current;
    if (!root) return;
    return () => {
      clearLocalSearchHighlights(root);
      matchesRef.current = [];
      setMatchCount(0);
      setActiveIndex(0);
    };
  }, [isOpen, mode, searchScopeRef]);

  useEffect(() => {
    if (!isOpen || mode !== "local") return;
    const scrollY = window.scrollY;
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;
      window.scrollTo(0, scrollY);
    };
  }, [isOpen, mode]);

  useEffect(() => {
    return () => {
      if (focusLockRef.current) {
        window.clearInterval(focusLockRef.current);
        focusLockRef.current = null;
      }
    };
  }, []);

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
              value={globalQuery}
              onChange={(event) => setGlobalQuery(event.target.value)}
            />
            <button
              type="button"
              className={styles.globalClear}
              aria-label="Clear"
              onClick={() => setGlobalQuery("")}
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
        <div className={styles.globalMeta}>
          <span>{globalQuery.trim() ? `${globalCount} results` : "Start typing to search"}</span>
          {globalLoading ? <span className={styles.globalLoading}>Searching…</span> : null}
        </div>
        <div className={styles.globalResults}>
          {displayResults.map((result) => (
            <button
              key={`${result.result_type}-${result.result_id}`}
              className={styles.resultRow}
              type="button"
            >
              <div className={styles.resultTitle}>{result.title}</div>
              <div className={styles.resultMeta}>
                <span className={styles.resultType}>{result.result_type}</span>
                <span className={styles.resultSnippet}>{result.snippet ?? ""}</span>
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
      >
        <div className={styles.localInputRow}>
          <input
            ref={localInputRef}
            className={styles.localField}
            placeholder="Search"
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
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
            aria-label="Close search"
          >
            Close
          </button>
          <div className={styles.localNav}>
            <button
              type="button"
              className={styles.navButton}
              aria-label="Previous"
              onClick={() => {
                if (matchCount === 0) return;
                const nextIndex =
                  (activeIndex - 1 + matchCount) % matchCount;
                setActiveIndex(nextIndex);
                setActiveMatch(matchesRef.current, nextIndex);
              }}
            >
              ‹
            </button>
            <button
              type="button"
              className={styles.navButton}
              aria-label="Next"
              onClick={() => {
                if (matchCount === 0) return;
                const nextIndex = (activeIndex + 1) % matchCount;
                setActiveIndex(nextIndex);
                setActiveMatch(matchesRef.current, nextIndex);
              }}
            >
              ›
            </button>
          </div>
          <div className={styles.matchCount}>
            {matchCount === 0 ? "0/0" : `${activeIndex + 1}/${matchCount}`}
          </div>
          <DropdownMenu.Root
            onOpenChange={(open) => {
              if (open) {
                if (focusLockRef.current) {
                  window.clearInterval(focusLockRef.current);
                }
                focusLockRef.current = window.setInterval(() => {
                  localInputRef.current?.focus();
                }, 120);
                requestAnimationFrame(() => {
                  localInputRef.current?.focus();
                });
              } else if (focusLockRef.current) {
                window.clearInterval(focusLockRef.current);
                focusLockRef.current = null;
                requestAnimationFrame(() => {
                  localInputRef.current?.focus();
                });
              }
            }}
          >
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className={styles.moreButton}
                aria-label="More"
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
                >
                  Replace
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className={styles.moreItem}
                >
                  Ignore case
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className={styles.moreItem}
                  onSelect={() => setMode("global")}
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
