"use client";

/**
 * Document Sync Hook
 *
 * Manages document persistence with local-first strategy:
 * - Loads from local cache first for instant display
 * - Then loads from Supabase and uses the newest version
 * - Debounced saves to local (fast) and remote (battery-friendly)
 * - Handles visibility changes for background saves
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  getLocalCacheStore,
  getSupabaseStore,
} from "@/lib/stores/document-store";

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const LOCAL_SAVE_DEBOUNCE_MS = 300;
const REMOTE_SAVE_DEBOUNCE_MS = 2000;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type SyncStatus = "idle" | "loading" | "saving" | "synced" | "error";

export type UseDocumentSyncOptions = {
  docId: string;
  onError?: (error: Error) => void;
};

export type UseDocumentSyncReturn = {
  /** The current markdown content */
  markdown: string;
  /** Update the markdown content (triggers saves) */
  setMarkdown: (markdown: string) => void;
  /** Current sync status */
  status: SyncStatus;
  /** Whether initial load is complete */
  isLoaded: boolean;
  /** Whether there are unsaved changes */
  isDirty: boolean;
  /** Last saved timestamp */
  lastSaved: Date | null;
  /** Force save to remote immediately */
  forceSave: () => Promise<void>;
  /** Reload from remote */
  reload: () => Promise<void>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useDocumentSync({
  docId,
  onError,
}: UseDocumentSyncOptions): UseDocumentSyncReturn {
  const [markdown, setMarkdownState] = useState("");
  const [status, setStatus] = useState<SyncStatus>("loading");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Refs for debouncing and tracking
  const localSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingMarkdownRef = useRef<string>("");
  const lastSavedMarkdownRef = useRef<string>("");
  const isSavingRef = useRef(false);
  const mountedRef = useRef(true);
  const saveToRemoteRef = useRef<((content: string) => Promise<boolean>) | null>(null);

  // Store instances
  const localStore = getLocalCacheStore();
  const remoteStore = getSupabaseStore();

  // ─────────────────────────────────────────────────────────────────────────
  // Load Logic
  // ─────────────────────────────────────────────────────────────────────────

  const loadDocument = useCallback(async () => {
    if (!docId) return;

    setStatus("loading");

    try {
      // Step 1: Load from local cache first (instant)
      const localData = await localStore.load(docId);
      if (localData && mountedRef.current) {
        setMarkdownState(localData.markdown);
        pendingMarkdownRef.current = localData.markdown;
      }

      // Step 2: Load from Supabase
      const remoteData = await remoteStore.load(docId);

      if (!mountedRef.current) return;

      // Step 3: Compare and use newest
      let finalMarkdown = "";
      let needsRemoteSync = false;

      if (localData && remoteData) {
        // Both exist - compare timestamps
        const localTime = new Date(localData.updatedAt).getTime();
        const remoteTime = new Date(remoteData.updatedAt).getTime();

        if (localTime > remoteTime) {
          // Local is newer - use local and schedule sync
          finalMarkdown = localData.markdown;
          needsRemoteSync = true;
        } else {
          // Remote is newer or same - use remote
          finalMarkdown = remoteData.markdown;
          // Clear local cache since remote is authoritative
          localStore.clear(docId);
        }
      } else if (localData) {
        // Only local exists (offline scenario)
        finalMarkdown = localData.markdown;
        needsRemoteSync = true;
      } else if (remoteData) {
        // Only remote exists (normal case)
        finalMarkdown = remoteData.markdown;
      } else {
        // Neither exists - new document
        finalMarkdown = "";
      }

      setMarkdownState(finalMarkdown);
      pendingMarkdownRef.current = finalMarkdown;
      lastSavedMarkdownRef.current = finalMarkdown;
      setIsLoaded(true);
      setStatus("synced");

      // Schedule sync if local was newer
      if (needsRemoteSync && saveToRemoteRef.current) {
        // Use ref to avoid dependency cycle
        saveToRemoteRef.current(finalMarkdown);
      }
    } catch (error) {
      if (mountedRef.current) {
        setStatus("error");
        onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }, [docId, localStore, remoteStore, onError]);

  // ─────────────────────────────────────────────────────────────────────────
  // Save Logic
  // ─────────────────────────────────────────────────────────────────────────

  const saveToLocal = useCallback(
    async (content: string) => {
      try {
        await localStore.save(docId, content);
      } catch (error) {
        console.error("Failed to save to local cache:", error);
      }
    },
    [docId, localStore]
  );

  const saveToRemote = useCallback(
    async (content: string): Promise<boolean> => {
      if (isSavingRef.current) return false;

      isSavingRef.current = true;
      setStatus("saving");

      try {
        const result = await remoteStore.save(docId, content);

        if (mountedRef.current) {
          lastSavedMarkdownRef.current = content;
          setLastSaved(new Date(result.updatedAt));
          setIsDirty(false);
          setStatus("synced");

          // Clear local cache after successful remote save
          localStore.clear(docId);
        }

        return true;
      } catch (error) {
        if (mountedRef.current) {
          setStatus("error");
          onError?.(error instanceof Error ? error : new Error(String(error)));
        }
        return false;
      } finally {
        isSavingRef.current = false;
      }
    },
    [docId, remoteStore, localStore, onError]
  );

  // Keep ref updated for use in loadDocument (avoids dependency cycle)
  useEffect(() => {
    saveToRemoteRef.current = saveToRemote;
  }, [saveToRemote]);

  const scheduleLocalSave = useCallback(
    (content: string) => {
      if (localSaveTimeoutRef.current) {
        clearTimeout(localSaveTimeoutRef.current);
      }

      localSaveTimeoutRef.current = setTimeout(() => {
        saveToLocal(content);
      }, LOCAL_SAVE_DEBOUNCE_MS);
    },
    [saveToLocal]
  );

  const scheduleRemoteSave = useCallback(
    (content: string, immediate = false) => {
      if (remoteSaveTimeoutRef.current) {
        clearTimeout(remoteSaveTimeoutRef.current);
      }

      const delay = immediate ? 0 : REMOTE_SAVE_DEBOUNCE_MS;

      remoteSaveTimeoutRef.current = setTimeout(() => {
        saveToRemote(content);
      }, delay);
    },
    [saveToRemote]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────

  const setMarkdown = useCallback(
    (newMarkdown: string) => {
      if (!isLoaded) return;

      setMarkdownState(newMarkdown);
      pendingMarkdownRef.current = newMarkdown;

      // Mark as dirty if content changed
      if (newMarkdown !== lastSavedMarkdownRef.current) {
        setIsDirty(true);
        setStatus("idle");
      }

      // Schedule saves
      scheduleLocalSave(newMarkdown);
      scheduleRemoteSave(newMarkdown);
    },
    [isLoaded, scheduleLocalSave, scheduleRemoteSave]
  );

  const forceSave = useCallback(async () => {
    const content = pendingMarkdownRef.current;

    // Cancel pending saves
    if (localSaveTimeoutRef.current) {
      clearTimeout(localSaveTimeoutRef.current);
    }
    if (remoteSaveTimeoutRef.current) {
      clearTimeout(remoteSaveTimeoutRef.current);
    }

    // Save immediately
    await saveToLocal(content);
    await saveToRemote(content);
  }, [saveToLocal, saveToRemote]);

  const reload = useCallback(async () => {
    setIsLoaded(false);
    await loadDocument();
  }, [loadDocument]);

  // ─────────────────────────────────────────────────────────────────────────
  // Effects
  // ─────────────────────────────────────────────────────────────────────────

  // Initial load
  useEffect(() => {
    mountedRef.current = true;
    loadDocument();

    return () => {
      mountedRef.current = false;
    };
  }, [loadDocument]);

  // Visibility change handler - save when app backgrounds
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && isDirty) {
        // Save immediately when app goes to background
        const content = pendingMarkdownRef.current;

        // Cancel debounced saves
        if (localSaveTimeoutRef.current) {
          clearTimeout(localSaveTimeoutRef.current);
        }
        if (remoteSaveTimeoutRef.current) {
          clearTimeout(remoteSaveTimeoutRef.current);
        }

        // Save synchronously to local (guaranteed)
        saveToLocal(content);

        // Attempt remote save (may not complete if tab closes)
        saveToRemote(content);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isDirty, saveToLocal, saveToRemote]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (localSaveTimeoutRef.current) {
        clearTimeout(localSaveTimeoutRef.current);
      }
      if (remoteSaveTimeoutRef.current) {
        clearTimeout(remoteSaveTimeoutRef.current);
      }
    };
  }, []);

  // Before unload - attempt final save
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        // Save to local synchronously
        const content = pendingMarkdownRef.current;
        try {
          // Use synchronous localStorage directly for beforeunload
          const key = `anchored:doc:${docId}`;
          const data = {
            markdown: content,
            updatedAt: new Date().toISOString(),
            version: Date.now(),
          };
          localStorage.setItem(key, JSON.stringify(data));
        } catch {
          // Best effort
        }

        // Show warning
        event.preventDefault();
        event.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty, docId]);

  return {
    markdown,
    setMarkdown,
    status,
    isLoaded,
    isDirty,
    lastSaved,
    forceSave,
    reload,
  };
}
