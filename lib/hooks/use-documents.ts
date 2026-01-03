"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { createUlid } from "@/lib/utils/ulid";
import { slugify } from "@/lib/utils/slugify";
import type {
  Document,
  DocumentInsert,
  DocumentUpdate,
  DocumentVersion,
  DocumentVersionInsert,
} from "@/types/database";

export type DocumentStatus = "draft" | "published" | "archived";
export type DocumentVisibility = "public" | "personal" | "private";
export type SnapshotReason = "manual" | "publish";

export type DocumentSummary = {
  id: string;
  title: string;
  updated_at: string | null;
};

export type DocumentSuggestion = Pick<Document, "id" | "title" | "slug">;

type DocumentFilters = {
  collection?: string | string[];
  status?: DocumentStatus | DocumentStatus[];
  visibility?: DocumentVisibility | DocumentVisibility[];
  query?: string;
  limit?: number;
};

type CreateDocumentInput = {
  title: string;
  collection: string;
  visibility?: DocumentVisibility;
  status?: DocumentStatus;
  body_md?: string | null;
  summary?: string | null;
  canonical?: string | null;
  tags?: string[] | null;
  date?: string | null;
  metadata?: Document["metadata"];
  slug?: string;
};

type SnapshotInput = {
  document: Document;
  reason: SnapshotReason;
  overrides?: Partial<Document>;
};

export const documentKeys = {
  all: ["documents"] as const,
  lists: () => [...documentKeys.all, "list"] as const,
  list: (filters: DocumentFilters) =>
    [...documentKeys.lists(), filters] as const,
  details: () => [...documentKeys.all, "detail"] as const,
  detail: (id: string) => [...documentKeys.details(), id] as const,
  latest: () => [...documentKeys.all, "latest"] as const,
  versions: (id: string) => [...documentKeys.all, "versions", id] as const,
  suggestions: (query: string) =>
    [...documentKeys.all, "suggestions", query] as const,
};

async function fetchDocuments(filters?: DocumentFilters): Promise<Document[]> {
  const supabase = createClient();
  let query = supabase
    .from("documents")
    .select("*")
    .order("updated_at", { ascending: false });

  if (filters?.collection) {
    if (Array.isArray(filters.collection)) {
      query = query.in("collection", filters.collection);
    } else {
      query = query.eq("collection", filters.collection);
    }
  }

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in("status", filters.status);
    } else {
      query = query.eq("status", filters.status);
    }
  }

  if (filters?.visibility) {
    if (Array.isArray(filters.visibility)) {
      query = query.in("visibility", filters.visibility);
    } else {
      query = query.eq("visibility", filters.visibility);
    }
  }

  if (filters?.query) {
    const trimmed = filters.query.trim();
    if (trimmed.length > 0) {
      const escaped = trimmed.replace(/,/g, "");
      query = query.or(
        `title.ilike.%${escaped}%,slug.ilike.%${escaped}%`
      );
    }
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

async function fetchDocument(id: string): Promise<Document> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function fetchLatestDocument(): Promise<DocumentSummary | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("documents")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return data?.[0] ?? null;
}

async function fetchDocumentVersions(
  documentId: string,
  limit = 24
): Promise<DocumentVersion[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("document_versions")
    .select("*")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

async function fetchDocumentSuggestions(
  queryText: string
): Promise<DocumentSuggestion[]> {
  const supabase = createClient();
  const trimmed = queryText.trim();
  if (!trimmed) {
    return [];
  }

  const escaped = trimmed.replace(/,/g, "");
  const { data, error } = await supabase
    .from("documents")
    .select("id, title, slug")
    .or(`title.ilike.%${escaped}%,slug.ilike.%${escaped}%`)
    .order("updated_at", { ascending: false })
    .limit(8);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

function buildSlug(title: string, idSuffix: string, slugOverride?: string) {
  if (slugOverride && slugOverride.trim().length > 0) {
    return slugify(slugOverride);
  }
  const base = slugify(title);
  return `${base}-${idSuffix}`;
}

async function createDocument(input: CreateDocumentInput): Promise<Document> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const id = createUlid();
  const slugSuffix = id.slice(-6).toLowerCase();
  const slug = buildSlug(input.title, slugSuffix, input.slug);
  const status = input.status ?? "draft";

  const payload: DocumentInsert = {
    id,
    user_id: user.id,
    title: input.title,
    slug,
    collection: input.collection,
    visibility: input.visibility ?? "private",
    status,
    body_md: input.body_md ?? "",
    summary: input.summary ?? null,
    metadata: input.metadata ?? {},
    canonical: input.canonical ?? null,
    tags: input.tags ?? null,
    date: input.date ?? null,
    published_at: status === "published" ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase
    .from("documents")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function updateDocument({
  id,
  ...updates
}: DocumentUpdate & { id: string }): Promise<Document> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("documents")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function publishDocument(id: string): Promise<Document> {
  const supabase = createClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("documents")
    .update({ status: "published", published_at: now })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function enforceSnapshotRetention(documentId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("document_versions")
    .select("id")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false })
    .range(24, 200);

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    return;
  }

  const ids = data.map((item) => item.id);
  const { error: deleteError } = await supabase
    .from("document_versions")
    .delete()
    .in("id", ids);

  if (deleteError) {
    throw new Error(deleteError.message);
  }
}

async function createSnapshot({
  document,
  reason,
  overrides,
}: SnapshotInput): Promise<DocumentVersion> {
  const supabase = createClient();
  const snapshotSource = { ...document, ...overrides };

  const payload: DocumentVersionInsert = {
    id: createUlid(),
    document_id: document.id,
    title: snapshotSource.title,
    slug: snapshotSource.slug,
    summary: snapshotSource.summary ?? null,
    body_md: snapshotSource.body_md ?? "",
    status: snapshotSource.status ?? "draft",
    visibility: snapshotSource.visibility ?? "private",
    collection: snapshotSource.collection,
    metadata: snapshotSource.metadata ?? {},
    canonical: snapshotSource.canonical ?? null,
    tags: snapshotSource.tags ?? null,
    date: snapshotSource.date ?? null,
    published_at: snapshotSource.published_at ?? null,
    snapshot_reason: reason,
  };

  const { data, error } = await supabase
    .from("document_versions")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await enforceSnapshotRetention(document.id);

  return data;
}

export function useDocuments(filters?: DocumentFilters) {
  return useQuery({
    queryKey: documentKeys.list(filters || {}),
    queryFn: () => fetchDocuments(filters),
  });
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: () => fetchDocument(id),
    enabled: Boolean(id),
  });
}

export function useLatestDocument() {
  return useQuery({
    queryKey: documentKeys.latest(),
    queryFn: fetchLatestDocument,
  });
}

export function useDocumentVersions(documentId: string) {
  return useQuery({
    queryKey: documentKeys.versions(documentId),
    queryFn: () => fetchDocumentVersions(documentId),
    enabled: Boolean(documentId),
  });
}

export function useDocumentSuggestions(queryText: string) {
  return useQuery({
    queryKey: documentKeys.suggestions(queryText),
    queryFn: () => fetchDocumentSuggestions(queryText),
    enabled: queryText.trim().length > 0,
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: documentKeys.latest() });
    },
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateDocument,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: documentKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: documentKeys.latest() });
    },
  });
}

export function usePublishDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: publishDocument,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: documentKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
    },
  });
}

export function useCreateSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSnapshot,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: documentKeys.versions(variables.document.id),
      });
    },
  });
}
