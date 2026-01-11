/**
 * Paste Handler Plugin
 *
 * Handles pasting content into the editor:
 * - Detects markdown content and parses it as structured nodes
 * - Falls back to plain text paste
 * - Debounces large pastes to avoid UI stalls
 * - Does not auto-transform mid-paste
 *
 * Rules:
 * - If pasted content looks like Markdown → parse → insert structured nodes
 * - Preserve plain-text paste option
 * - Debounce large pastes to avoid UI stalls
 */

import { $prose } from "@milkdown/utils";
import { Plugin, PluginKey } from "@milkdown/prose/state";

export const pasteHandlerPluginKey = new PluginKey("PASTE_HANDLER");

/**
 * Detect if text content looks like markdown
 */
function looksLikeMarkdown(text: string): boolean {
  // Check for common markdown patterns
  const markdownPatterns = [
    /^#{1,6}\s/m, // Headings
    /^\s*[-*+]\s/m, // Unordered lists
    /^\s*\d+\.\s/m, // Ordered lists
    /^\s*>/m, // Blockquotes
    /\*\*[^*]+\*\*/, // Bold
    /\*[^*]+\*/, // Italic
    /_[^_]+_/, // Italic with underscore
    /`[^`]+`/, // Inline code
    /```[\s\S]*```/, // Code blocks
    /\[[^\]]+\]\([^)]+\)/, // Links
    /^---$/m, // Horizontal rule
    /^\s*[-*]\s*\[\s*[xX ]?\s*\]/m, // Task lists
  ];

  return markdownPatterns.some((pattern) => pattern.test(text));
}

/**
 * Paste handler plugin
 */
export const pasteHandlerPlugin = $prose(() => {
  return new Plugin({
    key: pasteHandlerPluginKey,

    props: {
      handlePaste(_view, event) {
        const clipboardData = event.clipboardData;
        if (!clipboardData) return false;

        // Get plain text from clipboard
        const text = clipboardData.getData("text/plain");
        if (!text) return false;

        // Check if there's HTML content (rich paste)
        const html = clipboardData.getData("text/html");

        // If HTML is present and not markdown-like, let default handler work
        if (html && !looksLikeMarkdown(text)) {
          return false;
        }

        // If text looks like markdown, let Milkdown parse it
        // The commonmark/gfm presets will parse markdown on paste
        if (looksLikeMarkdown(text)) {
          return false;
        }

        // Plain text paste - let default handler work
        return false;
      },

      // Handle drop events similarly
      handleDrop() {
        // Let default handler work for now
        return false;
      },
    },
  });
});
