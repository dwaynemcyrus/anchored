/**
 * Wiki-Link Completion
 *
 * CodeMirror 6 autocomplete extension for wiki-links.
 * Triggers on [[ and shows document suggestions.
 */

import {
  autocompletion,
  type CompletionContext,
  type CompletionResult,
  type Completion,
} from "@codemirror/autocomplete";
import { createClient } from "@/lib/supabase/client";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type DocumentSuggestion = {
  id: string;
  title: string;
  slug: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Fetch Suggestions
// ─────────────────────────────────────────────────────────────────────────────

// Cache for suggestions to avoid repeated fetches
const suggestionCache = new Map<string, DocumentSuggestion[]>();
const CACHE_TTL_MS = 30000; // 30 seconds
const cacheTimestamps = new Map<string, number>();

async function fetchSuggestions(query: string): Promise<DocumentSuggestion[]> {
  const trimmed = query.trim();

  // Check cache first
  const cacheKey = trimmed.toLowerCase();
  const cachedTime = cacheTimestamps.get(cacheKey);
  if (cachedTime && Date.now() - cachedTime < CACHE_TTL_MS) {
    const cached = suggestionCache.get(cacheKey);
    if (cached) return cached;
  }

  // Empty query - return recent documents
  if (!trimmed) {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("documents")
        .select("id, title, slug")
        .order("updated_at", { ascending: false })
        .limit(8);

      const results = data ?? [];
      suggestionCache.set(cacheKey, results);
      cacheTimestamps.set(cacheKey, Date.now());
      return results;
    } catch {
      return [];
    }
  }

  // Search by query
  try {
    const supabase = createClient();
    const escaped = trimmed.replace(/,/g, "");
    const { data } = await supabase
      .from("documents")
      .select("id, title, slug")
      .or(`title.ilike.%${escaped}%,slug.ilike.%${escaped}%`)
      .order("updated_at", { ascending: false })
      .limit(8);

    const results = data ?? [];
    suggestionCache.set(cacheKey, results);
    cacheTimestamps.set(cacheKey, Date.now());
    return results;
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Completion Source
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if we're inside a wiki-link and return match info.
 */
function getWikiLinkMatch(context: CompletionContext): {
  from: number;
  query: string;
} | null {
  const { state, pos } = context;
  const line = state.doc.lineAt(pos);
  const textBefore = line.text.slice(0, pos - line.from);

  // Find [[ before cursor, not closed with ]]
  const openBracket = textBefore.lastIndexOf("[[");
  if (openBracket === -1) return null;

  // Check if there's a closing ]] between [[ and cursor
  const afterOpen = textBefore.slice(openBracket + 2);
  if (afterOpen.includes("]]")) return null;

  // Extract query (text after [[)
  const query = afterOpen;

  return {
    from: line.from + openBracket,
    query,
  };
}

/**
 * Wiki-link completion source for CodeMirror.
 */
async function wikiLinkCompletionSource(
  context: CompletionContext
): Promise<CompletionResult | null> {
  const match = getWikiLinkMatch(context);
  if (!match) return null;

  // Fetch suggestions
  const suggestions = await fetchSuggestions(match.query);

  if (suggestions.length === 0) return null;

  // Build completions
  const completions: Completion[] = suggestions.map((doc) => ({
    label: doc.title,
    detail: doc.slug,
    type: "text",
    apply: (view, completion, from, to) => {
      // Replace from [[ to cursor with [[Title]]
      const insertText = `[[${doc.title}]]`;
      view.dispatch({
        changes: { from: match.from, to, insert: insertText },
        selection: { anchor: match.from + insertText.length },
      });
    },
  }));

  return {
    from: match.from,
    options: completions,
    validFor: /^(\[\[)?[^\]]*$/,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Extension
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wiki-link autocomplete extension.
 * Add to editor extensions to enable [[ autocomplete.
 */
export function wikiLinkCompletion() {
  return autocompletion({
    override: [wikiLinkCompletionSource],
    activateOnTyping: true,
    closeOnBlur: true,
    defaultKeymap: true,
    icons: false,
  });
}

/**
 * Clear the suggestion cache.
 */
export function clearSuggestionCache(): void {
  suggestionCache.clear();
  cacheTimestamps.clear();
}
