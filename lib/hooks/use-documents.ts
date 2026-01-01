"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type DocumentSummary = {
  id: string;
  title: string;
  updated_at: string;
};

async function fetchLatestDocument(): Promise<DocumentSummary | null> {
  const supabase = createClient();

  const { data, error } = await (supabase as any)
    .from("documents")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return data?.[0] ?? null;
}

export function useLatestDocument() {
  return useQuery({
    queryKey: ["documents", "latest"],
    queryFn: fetchLatestDocument,
  });
}
