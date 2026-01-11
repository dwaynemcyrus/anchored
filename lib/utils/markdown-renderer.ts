/**
 * Markdown Renderer
 *
 * Uses markdown-it with plugins for rich markdown rendering:
 * - Task lists (GFM style)
 * - Tables (GFM)
 * - Footnotes
 * - Obsidian-style callouts
 * - Wiki-links
 *
 * All output is sanitized with DOMPurify.
 */

import MarkdownIt from "markdown-it";
import taskLists from "markdown-it-task-lists";
import footnote from "markdown-it-footnote";
import DOMPurify from "dompurify";
import { slugify } from "@/lib/utils/slugify";

// ─────────────────────────────────────────────────────────────────────────────
// Markdown-it Instance
// ─────────────────────────────────────────────────────────────────────────────

const md = new MarkdownIt({
  html: false, // Disable raw HTML for security
  linkify: true, // Auto-convert URLs to links
  typographer: true, // Smart quotes, dashes
  breaks: true, // Convert \n to <br>
});

// Enable GFM tables (built-in)
md.enable("table");

// Add task lists plugin
md.use(taskLists, {
  enabled: true,
  label: true,
  labelAfter: true,
});

// Add footnotes plugin
md.use(footnote);

// ─────────────────────────────────────────────────────────────────────────────
// Custom Rules: Wiki-links
// ─────────────────────────────────────────────────────────────────────────────

// Wiki-link pattern: [[target]] or [[target|alias]]
const WIKI_LINK_PATTERN = /\[\[([^\]|]+)(\|([^\]]+))?\]\]/g;

function renderWikiLinks(text: string): string {
  return text.replace(WIKI_LINK_PATTERN, (_match, target: string, _aliasGroup: string, alias: string) => {
    const label = alias || target;
    const slug = slugify(target);
    return `<a class="wiki-link" href="/writing/${slug}">${escapeHtml(label)}</a>`;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom Rules: Obsidian Callouts
// ─────────────────────────────────────────────────────────────────────────────

// Callout pattern: > [!TYPE] or > [!TYPE] Title
const CALLOUT_PATTERN = /^>\s*\[!(\w+)\]\s*(.*)$/;
const CALLOUT_CONTINUATION = /^>\s*(.*)$/;

type CalloutType = "note" | "tip" | "warning" | "danger" | "info" | "example" | "quote" | "abstract";

const CALLOUT_TITLES: Record<string, string> = {
  note: "Note",
  tip: "Tip",
  warning: "Warning",
  danger: "Danger",
  info: "Info",
  example: "Example",
  quote: "Quote",
  abstract: "Abstract",
  summary: "Summary",
  tldr: "TL;DR",
  bug: "Bug",
  todo: "Todo",
  success: "Success",
  question: "Question",
  failure: "Failure",
  faq: "FAQ",
};

function parseCallouts(markdown: string): string {
  const lines = markdown.split("\n");
  const result: string[] = [];
  let inCallout = false;
  let calloutType = "";
  let calloutTitle = "";
  let calloutContent: string[] = [];

  const flushCallout = () => {
    if (inCallout && calloutContent.length > 0) {
      const typeClass = calloutType.toLowerCase();
      const title = calloutTitle || CALLOUT_TITLES[typeClass] || calloutType;
      const contentMd = calloutContent.join("\n");
      // Render inner content (without callout processing to avoid recursion)
      const innerHtml = md.render(contentMd);
      result.push(
        `<div class="callout callout-${typeClass}">` +
        `<div class="callout-title">${escapeHtml(title)}</div>` +
        `<div class="callout-content">${innerHtml}</div>` +
        `</div>`
      );
    }
    inCallout = false;
    calloutType = "";
    calloutTitle = "";
    calloutContent = [];
  };

  for (const line of lines) {
    const calloutMatch = line.match(CALLOUT_PATTERN);

    if (calloutMatch) {
      // Start of new callout
      flushCallout();
      inCallout = true;
      calloutType = calloutMatch[1];
      calloutTitle = calloutMatch[2]?.trim() || "";
      continue;
    }

    if (inCallout) {
      const contMatch = line.match(CALLOUT_CONTINUATION);
      if (contMatch) {
        // Continuation of callout
        calloutContent.push(contMatch[1]);
        continue;
      } else {
        // End of callout
        flushCallout();
      }
    }

    result.push(line);
  }

  // Flush any remaining callout
  flushCallout();

  return result.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Phase 6: do not render images, keep alt text only.
md.renderer.rules.image = (tokens, idx) => escapeHtml(tokens[idx].content || "");

// ─────────────────────────────────────────────────────────────────────────────
// Render Cache
// ─────────────────────────────────────────────────────────────────────────────

type CacheKey = string;
type CacheEntry = {
  html: string;
  timestamp: number;
};

const renderCache = new Map<CacheKey, CacheEntry>();
const CACHE_MAX_SIZE = 500;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCacheKey(text: string, blockType?: string): CacheKey {
  return `${blockType || "doc"}:${text}`;
}

function getCachedRender(key: CacheKey): string | null {
  const entry = renderCache.get(key);
  if (!entry) return null;

  // Check TTL
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    renderCache.delete(key);
    return null;
  }

  return entry.html;
}

function setCachedRender(key: CacheKey, html: string): void {
  // Evict oldest entries if cache is full
  if (renderCache.size >= CACHE_MAX_SIZE) {
    const oldest = renderCache.keys().next().value;
    if (oldest) {
      renderCache.delete(oldest);
    }
  }

  renderCache.set(key, {
    html,
    timestamp: Date.now(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Sanitization
// ─────────────────────────────────────────────────────────────────────────────

function sanitize(html: string): string {
  if (typeof window === "undefined") {
    // SSR - return as-is (should not be called during SSR)
    return html;
  }

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "h1", "h2", "h3", "h4", "h5", "h6",
      "p", "br", "hr",
      "ul", "ol", "li",
      "blockquote", "pre", "code",
      "table", "thead", "tbody", "tr", "th", "td",
      "a", "strong", "em", "del", "s",
      "div", "span",
      "input", "label", // For task list checkboxes
      "sup", "sub", // For footnotes
      "section", // For footnotes section
    ],
    ALLOWED_ATTR: [
      "href", "target", "rel",
      "class", "id",
      "type", "checked", "disabled", // For checkboxes
      "data-line", "data-checkbox-line", // Custom data attributes
    ],
    ALLOW_DATA_ATTR: true,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export type BlockType =
  | "paragraph"
  | "heading"
  | "list"
  | "blockquote"
  | "code"
  | "table"
  | "callout"
  | "hr"
  | "unknown";

/**
 * Render a single markdown block to HTML.
 * Uses caching to avoid re-rendering unchanged blocks.
 */
export function renderBlock(text: string, blockType: BlockType = "unknown"): string {
  const cacheKey = getCacheKey(text, blockType);
  const cached = getCachedRender(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Process wiki-links first
  let processed = renderWikiLinks(text);

  // Process callouts
  processed = parseCallouts(processed);

  // Render with markdown-it
  let html = md.render(processed);

  // Sanitize
  html = sanitize(html);

  // Cache result
  setCachedRender(cacheKey, html);

  return html;
}

/**
 * Render a full markdown document to HTML.
 * Does not use block-level caching (use renderBlock for that).
 */
export function renderDocument(markdown: string): string {
  const cacheKey = getCacheKey(markdown, "document");
  const cached = getCachedRender(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Process wiki-links
  let processed = renderWikiLinks(markdown);

  // Process callouts
  processed = parseCallouts(processed);

  // Render with markdown-it
  let html = md.render(processed);

  // Sanitize
  html = sanitize(html);

  // Cache result
  setCachedRender(cacheKey, html);

  return html;
}

/**
 * Render markdown for inline preview (no block-level elements).
 * Useful for rendering single lines within widgets.
 */
export function renderInline(text: string): string {
  // Process wiki-links
  const processed = renderWikiLinks(text);

  // Render inline only
  let html = md.renderInline(processed);

  // Sanitize
  html = sanitize(html);

  return html;
}

/**
 * Render a single line of markdown with block syntax.
 */
export type LineRenderResult = {
  html: string;
  classes: string[];
};

export function renderLineWithBlockSyntax(text: string): LineRenderResult {
  const trimmed = text.trim();

  if (trimmed.length === 0) {
    return {
      html: "&nbsp;",
      classes: ["md-line", "md-empty"],
    };
  }

  const headingMatch = text.match(/^\s*(#{1,6})\s+(.*)$/);
  if (headingMatch) {
    const level = headingMatch[1].length;
    const content = headingMatch[2];
    const html = sanitize(
      `<span class="md-heading-content">${renderInline(content)}</span>`
    );
    return {
      html,
      classes: ["md-line", "md-heading", `md-h${level}`],
    };
  }

  if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
    return {
      html: "<hr />",
      classes: ["md-line", "md-hr"],
    };
  }

  const quoteMatch = text.match(/^\s*>\s?(.*)$/);
  if (quoteMatch) {
    const content = quoteMatch[1];
    const html = sanitize(
      `<span class="md-quote-content">${renderInline(content)}</span>`
    );
    return {
      html,
      classes: ["md-line", "md-quote"],
    };
  }

  const taskMatch = text.match(/^\s*[-*+]\s+\[([ xX])\]\s+(.*)$/);
  if (taskMatch) {
    const checked = taskMatch[1].toLowerCase() === "x";
    const content = taskMatch[2];
    const html = sanitize(
      `<span class="task-list-item">` +
        `<input type="checkbox" class="task-list-item-checkbox" ${
          checked ? "checked" : ""
        } />` +
        `<span class="md-list-content">${renderInline(content)}</span>` +
      `</span>`
    );
    return {
      html,
      classes: ["md-line", "md-list-item", "md-task"],
    };
  }

  const orderedMatch = text.match(/^\s*(\d+)\.\s+(.*)$/);
  if (orderedMatch) {
    const marker = `${orderedMatch[1]}.`;
    const content = orderedMatch[2];
    const html = sanitize(
      `<span class="md-list-marker">${escapeHtml(marker)}</span>` +
        `<span class="md-list-content">${renderInline(content)}</span>`
    );
    return {
      html,
      classes: ["md-line", "md-list-item", "md-list-ordered"],
    };
  }

  const unorderedMatch = text.match(/^\s*[-*+]\s+(.*)$/);
  if (unorderedMatch) {
    const content = unorderedMatch[1];
    const html = sanitize(
      `<span class="md-list-marker">•</span>` +
        `<span class="md-list-content">${renderInline(content)}</span>`
    );
    return {
      html,
      classes: ["md-line", "md-list-item", "md-list-unordered"],
    };
  }

  return {
    html: renderInline(text),
    classes: ["md-line", "md-paragraph"],
  };
}

/**
 * Render a single line of markdown to HTML with caching.
 */
export function renderInlineLine(text: string): string {
  const cacheKey = getCacheKey(text, "line");
  const cached = getCachedRender(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const html = renderLineWithBlockSyntax(text).html;
  setCachedRender(cacheKey, html);
  return html;
}

/**
 * Clear the render cache.
 * Useful when switching documents or for memory management.
 */
export function clearRenderCache(): void {
  renderCache.clear();
}

/**
 * Get cache statistics for debugging.
 */
export function getRenderCacheStats(): { size: number; maxSize: number } {
  return {
    size: renderCache.size,
    maxSize: CACHE_MAX_SIZE,
  };
}
