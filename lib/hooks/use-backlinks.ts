"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Document } from "@/types/database";

export type Backlink = {
  id: string;
  title: string;
  slug: string;
  snippet: string;
};

export const backlinkKeys = {
  all: ["backlinks"] as const,
  document: (slug: string) => [...backlinkKeys.all, slug] as const,
};

function extractSnippet(bodyMd: string, slug: string): string {
  const pattern = `[[${slug}]]`;
  const index = bodyMd.indexOf(pattern);

  if (index === -1) {
    return "";
  }

  // Find the start of the line or paragraph containing the link
  let start = index;
  while (start > 0 && bodyMd[start - 1] !== "\n") {
    start--;
  }

  // Find the end of the line or paragraph
  let end = index + pattern.length;
  while (end < bodyMd.length && bodyMd[end] !== "\n") {
    end++;
  }

  let snippet = bodyMd.slice(start, end).trim();

  // Limit snippet length
  const maxLength = 120;
  if (snippet.length > maxLength) {
    // Try to cut at a word boundary
    const cutPoint = snippet.lastIndexOf(" ", maxLength);
    snippet = snippet.slice(0, cutPoint > 0 ? cutPoint : maxLength) + "...";
  }

  return snippet;
}

async function fetchBacklinks(
  slug: string,
  documentId: string
): Promise<Backlink[]> {
  if (!slug) {
    return [];
  }

  const supabase = createClient();

  // Search for documents containing [[slug]] in their body_md
  const { data, error } = await supabase
    .from("documents")
    .select("id, title, slug, body_md")
    .ilike("body_md", `%[[${slug}]]%`)
    .neq("id", documentId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return [];
  }

  return data.map((doc) => ({
    id: doc.id,
    title: doc.title,
    slug: doc.slug,
    snippet: extractSnippet(doc.body_md || "", slug),
  }));
}

export function useBacklinks(slug: string, documentId: string) {
  return useQuery({
    queryKey: backlinkKeys.document(slug),
    queryFn: () => fetchBacklinks(slug, documentId),
    enabled: Boolean(slug) && Boolean(documentId),
  });
}
