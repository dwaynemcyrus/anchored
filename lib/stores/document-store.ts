/**
 * DocumentStore Adapter
 *
 * Thin persistence layer that keeps editor logic independent of storage.
 * Provides two implementations:
 * - LocalCacheStore: localStorage for offline/refresh safety
 * - SupabaseStore: canonical persistence
 */

import { createClient } from "@/lib/supabase/client";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type DocumentData = {
  markdown: string;
  updatedAt: string; // ISO timestamp
  version: number;
};

export type LoadResult = DocumentData | null;

export type SaveResult = {
  updatedAt: string;
  version: number;
};

export interface DocumentStore {
  load(docId: string): Promise<LoadResult>;
  save(docId: string, markdown: string, baseVersion?: number): Promise<SaveResult>;
}

// ─────────────────────────────────────────────────────────────────────────────
// LocalCacheStore - localStorage implementation
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_PREFIX = "anchored:doc:";

function getCacheKey(docId: string): string {
  return `${CACHE_PREFIX}${docId}`;
}

export class LocalCacheStore implements DocumentStore {
  async load(docId: string): Promise<LoadResult> {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const raw = localStorage.getItem(getCacheKey(docId));
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as DocumentData;
      return parsed;
    } catch {
      // Corrupted cache - return null
      return null;
    }
  }

  async save(docId: string, markdown: string, _baseVersion?: number): Promise<SaveResult> {
    if (typeof window === "undefined") {
      throw new Error("LocalCacheStore: Cannot save during SSR");
    }

    const now = new Date().toISOString();

    // Load existing to increment version
    let version = 1;
    try {
      const existing = await this.load(docId);
      if (existing) {
        version = existing.version + 1;
      }
    } catch {
      // Start fresh
    }

    const data: DocumentData = {
      markdown,
      updatedAt: now,
      version,
    };

    localStorage.setItem(getCacheKey(docId), JSON.stringify(data));

    return { updatedAt: now, version };
  }

  /**
   * Clear cached document (useful after successful remote sync)
   */
  clear(docId: string): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(getCacheKey(docId));
  }

  /**
   * Check if document has local changes newer than remote
   */
  async hasNewerVersion(docId: string, remoteUpdatedAt: string): Promise<boolean> {
    const local = await this.load(docId);
    if (!local) return false;

    const localTime = new Date(local.updatedAt).getTime();
    const remoteTime = new Date(remoteUpdatedAt).getTime();

    return localTime > remoteTime;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SupabaseStore - canonical persistence
// ─────────────────────────────────────────────────────────────────────────────

export class SupabaseStore implements DocumentStore {
  async load(docId: string): Promise<LoadResult> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("documents")
      .select("body_md, updated_at")
      .eq("id", docId)
      .single();

    if (error || !data) {
      return null;
    }

    // Convert updated_at to version number (timestamp-based)
    const updatedAt = data.updated_at as string;
    const version = new Date(updatedAt).getTime();

    return {
      markdown: data.body_md ?? "",
      updatedAt,
      version,
    };
  }

  async save(docId: string, markdown: string, _baseVersion?: number): Promise<SaveResult> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("documents")
      .update({ body_md: markdown })
      .eq("id", docId)
      .select("updated_at")
      .single();

    if (error) {
      throw new Error(`SupabaseStore: Failed to save - ${error.message}`);
    }

    const updatedAt = data.updated_at as string;
    const version = new Date(updatedAt).getTime();

    return { updatedAt, version };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory functions
// ─────────────────────────────────────────────────────────────────────────────

let localCacheInstance: LocalCacheStore | null = null;
let supabaseInstance: SupabaseStore | null = null;

export function getLocalCacheStore(): LocalCacheStore {
  if (!localCacheInstance) {
    localCacheInstance = new LocalCacheStore();
  }
  return localCacheInstance;
}

export function getSupabaseStore(): SupabaseStore {
  if (!supabaseInstance) {
    supabaseInstance = new SupabaseStore();
  }
  return supabaseInstance;
}
