"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Document } from "@/types/database";

export type SearchResult = Document & {
  snippet: string | null;
  matchType: "title" | "content" | "both";
};

type SearchFilters = {
  collection?: string;
  limit?: number;
};

function extractSnippet(
  content: string | null,
  query: string,
  contextLength = 60
): string | null {
  if (!content || !query.trim()) return null;

  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase().trim();
  const index = lowerContent.indexOf(lowerQuery);

  if (index === -1) return null;

  const start = Math.max(0, index - contextLength);
  const end = Math.min(content.length, index + query.length + contextLength);

  let snippet = content.slice(start, end);

  // Clean up snippet
  if (start > 0) snippet = "…" + snippet;
  if (end < content.length) snippet = snippet + "…";

  // Remove newlines and extra whitespace
  snippet = snippet.replace(/\n+/g, " ").replace(/\s+/g, " ").trim();

  return snippet;
}

async function searchDocuments(
  query: string,
  filters?: SearchFilters
): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const supabase = createClient();
  const escaped = trimmed.replace(/[%_]/g, "\\$&"); // Escape SQL wildcards

  let dbQuery = supabase
    .from("documents")
    .select("*")
    .or(`title.ilike.%${escaped}%,body_md.ilike.%${escaped}%`)
    .order("updated_at", { ascending: false });

  if (filters?.collection) {
    dbQuery = dbQuery.eq("collection", filters.collection);
  }

  if (filters?.limit) {
    dbQuery = dbQuery.limit(filters.limit);
  } else {
    dbQuery = dbQuery.limit(20);
  }

  const { data, error } = await dbQuery;

  if (error) {
    throw new Error(error.message);
  }

  // Process results to add snippets and match type
  return (data ?? []).map((doc) => {
    const titleMatch = doc.title?.toLowerCase().includes(trimmed.toLowerCase());
    const contentMatch = doc.body_md?.toLowerCase().includes(trimmed.toLowerCase());

    let matchType: SearchResult["matchType"] = "content";
    if (titleMatch && contentMatch) {
      matchType = "both";
    } else if (titleMatch) {
      matchType = "title";
    }

    const snippet = contentMatch ? extractSnippet(doc.body_md, trimmed) : null;

    return {
      ...doc,
      snippet,
      matchType,
    };
  });
}

export const searchKeys = {
  all: ["search"] as const,
  query: (query: string, filters?: SearchFilters) =>
    [...searchKeys.all, query, filters] as const,
};

export function useFullTextSearch(query: string, filters?: SearchFilters) {
  return useQuery({
    queryKey: searchKeys.query(query, filters),
    queryFn: () => searchDocuments(query, filters),
    enabled: query.trim().length >= 2, // Only search with 2+ characters
    staleTime: 30000, // Cache for 30 seconds
  });
}
