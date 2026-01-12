"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import * as Dialog from "@radix-ui/react-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { format } from "date-fns";
import { useCreateDocument, useDocuments } from "@/lib/hooks/use-documents";
import { useDailyNote } from "@/lib/hooks/use-daily-note";
import { useFullTextSearch } from "@/lib/hooks/use-search";
import styles from "./CommandPalette.module.css";

export type CommandPaletteProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Current focus mode state (only provided on editor page) */
  focusMode?: boolean;
  /** Toggle focus mode callback (only provided on editor page) */
  onToggleFocusMode?: () => void;
  /** Current typewriter mode state (only provided on editor page) */
  typewriterMode?: boolean;
  /** Toggle typewriter mode callback (only provided on editor page) */
  onToggleTypewriterMode?: () => void;
};

export function CommandPalette({
  open: controlledOpen,
  onOpenChange,
  focusMode,
  onToggleFocusMode,
  typewriterMode,
  onToggleTypewriterMode,
}: CommandPaletteProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const createDocument = useCreateDocument();
  const dailyNote = useDailyNote({
    onBeforeNavigate: () => setOpen(false),
  });

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  // Fetch recent documents (limit to 5 for command palette)
  const { data: recentDocs = [] } = useDocuments({ limit: 5 });

  // Full-text search when query has 2+ characters
  const { data: searchResults = [], isLoading: isSearching } = useFullTextSearch(
    search,
    { limit: 15 }
  );

  // Use search results when searching, otherwise show recent
  const isSearchMode = search.trim().length >= 2;
  const displayDocuments = isSearchMode ? searchResults : recentDocs;

  const setOpen = useCallback(
    (value: boolean) => {
      if (isControlled) {
        onOpenChange?.(value);
      } else {
        setInternalOpen(value);
      }
    },
    [isControlled, onOpenChange]
  );

  const handleSelectDocument = useCallback(
    (documentId: string) => {
      setOpen(false);
      router.push(`/writing/${documentId}`);
    },
    [router, setOpen]
  );

  const handleNewDocument = useCallback(async () => {
    setOpen(false);
    const doc = await createDocument.mutateAsync({
      title: "Untitled",
      collection: "notes",
      visibility: "private",
      status: "draft",
      body_md: "",
      metadata: {},
    });
    router.push(`/writing/${doc.id}`);
  }, [createDocument, router, setOpen]);

  const handleTodaysNote = useCallback(() => {
    dailyNote.goToToday();
  }, [dailyNote]);

  const handleToggleFocusMode = useCallback(() => {
    onToggleFocusMode?.();
    setOpen(false);
  }, [onToggleFocusMode, setOpen]);

  const handleToggleTypewriterMode = useCallback(() => {
    onToggleTypewriterMode?.();
    setOpen(false);
  }, [onToggleTypewriterMode, setOpen]);

  // Global keyboard shortcuts: Cmd+K (palette), Cmd+D (daily note)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K: Toggle command palette
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
        return;
      }

      // Cmd+D: Today's note (only when palette is closed)
      if (e.key === "d" && (e.metaKey || e.ctrlKey) && !open) {
        e.preventDefault();
        dailyNote.goToToday();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, setOpen, dailyNote]);

  // Reset search when closing
  useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content} aria-describedby={undefined}>
          <VisuallyHidden.Root>
            <Dialog.Title>Search documents</Dialog.Title>
          </VisuallyHidden.Root>
          <Command
            className={styles.command}
            shouldFilter={!isSearchMode}
            loop
          >
            <div className={styles.inputWrapper}>
              <SearchIcon />
              <Command.Input
                className={styles.input}
                placeholder="Search documents..."
                value={search}
                onValueChange={setSearch}
              />
              {search && (
                <button
                  type="button"
                  className={styles.clearButton}
                  onClick={() => setSearch("")}
                >
                  <ClearIcon />
                </button>
              )}
            </div>

            <Command.List className={styles.list}>
              <Command.Empty className={styles.empty}>
                No results found.
              </Command.Empty>

              {isSearching && isSearchMode && (
                <div className={styles.searching}>Searching...</div>
              )}

              {displayDocuments.length > 0 && (
                <Command.Group
                  heading={isSearchMode ? "Search Results" : "Recent Documents"}
                  className={styles.group}
                >
                  {displayDocuments.map((doc) => {
                    const dateStr = doc.updated_at
                      ? format(new Date(doc.updated_at), "MMM d")
                      : "";
                    const snippet = "snippet" in doc && typeof doc.snippet === "string" ? doc.snippet : null;
                    return (
                      <Command.Item
                        key={doc.id}
                        className={`${styles.item} ${snippet ? styles.itemWithSnippet : ""}`}
                        value={`${doc.id} ${doc.title} ${doc.slug}`}
                        onSelect={() => handleSelectDocument(doc.id)}
                      >
                        <DocumentIcon />
                        <div className={styles.itemContent}>
                          <div className={styles.itemHeader}>
                            <span className={styles.itemTitle}>{doc.title}</span>
                            <span className={styles.itemMeta}>{doc.collection}</span>
                            {dateStr && (
                              <span className={styles.itemDate}>{dateStr}</span>
                            )}
                          </div>
                          {snippet && (
                            <p className={styles.itemSnippet}>{snippet}</p>
                          )}
                        </div>
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              )}

              <Command.Group heading="Actions" className={styles.group}>
                <Command.Item
                  className={styles.item}
                  value="new-document create"
                  onSelect={handleNewDocument}
                >
                  <PlusIcon />
                  <span className={styles.itemTitle}>New Document</span>
                  <span className={styles.shortcut}>
                    <kbd>⌘</kbd><kbd>N</kbd>
                  </span>
                </Command.Item>
                <Command.Item
                  className={styles.item}
                  value="todays-note daily journal"
                  onSelect={handleTodaysNote}
                >
                  <CalendarIcon />
                  <span className={styles.itemTitle}>Today's Note</span>
                  <span className={styles.shortcut}>
                    <kbd>⌘</kbd><kbd>D</kbd>
                  </span>
                </Command.Item>
                {onToggleFocusMode && (
                  <Command.Item
                    className={styles.item}
                    value="toggle focus mode distraction"
                    onSelect={handleToggleFocusMode}
                  >
                    <FocusIcon />
                    <span className={styles.itemTitle}>
                      {focusMode ? "Disable Focus Mode" : "Enable Focus Mode"}
                    </span>
                    <span className={styles.shortcut}>
                      <kbd>⌘</kbd><kbd>⇧</kbd><kbd>F</kbd>
                    </span>
                  </Command.Item>
                )}
                {onToggleTypewriterMode && (
                  <Command.Item
                    className={styles.item}
                    value="toggle typewriter mode scroll"
                    onSelect={handleToggleTypewriterMode}
                  >
                    <TypewriterIcon />
                    <span className={styles.itemTitle}>
                      {typewriterMode ? "Disable Typewriter Mode" : "Enable Typewriter Mode"}
                    </span>
                    <span className={styles.shortcut}>
                      <kbd>⌘</kbd><kbd>⇧</kbd><kbd>T</kbd>
                    </span>
                  </Command.Item>
                )}
              </Command.Group>
            </Command.List>

            <div className={styles.footer}>
              <span className={styles.footerHint}>
                <kbd>↑↓</kbd> to navigate
              </span>
              <span className={styles.footerHint}>
                <kbd>↵</kbd> to select
              </span>
              <span className={styles.footerHint}>
                <kbd>esc</kbd> to close
              </span>
            </div>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Icons
function SearchIcon() {
  return (
    <svg
      className={styles.searchIcon}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg
      className={styles.itemIcon}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      className={styles.itemIcon}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      className={styles.itemIcon}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function FocusIcon() {
  return (
    <svg
      className={styles.itemIcon}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function TypewriterIcon() {
  return (
    <svg
      className={styles.itemIcon}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <line x1="6" y1="10" x2="6" y2="10" />
      <line x1="10" y1="10" x2="10" y2="10" />
      <line x1="14" y1="10" x2="14" y2="10" />
      <line x1="18" y1="10" x2="18" y2="10" />
      <line x1="8" y1="14" x2="16" y2="14" />
    </svg>
  );
}
