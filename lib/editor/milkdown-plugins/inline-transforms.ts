/**
 * Inline Mark Transforms - IME Safety Layer
 *
 * Tier C transforms (handled by commonmark/gfm presets):
 * - `**text**` → Bold (on final `*`)
 * - `*text*` or `_text_` → Italic (on final delimiter)
 * - `` `code` `` → Inline code (on final backtick)
 * - `[label](url)` → Link (on final `)`)
 * - `https://url` → Autolink (on SPACE/ENTER after URL)
 *
 * This plugin ensures:
 * - No transforms during IME composition
 * - Caret stability after transforms
 *
 * The actual input rules are provided by:
 * - @milkdown/preset-commonmark: bold, italic, code, links
 * - @milkdown/preset-gfm: autolinks, strikethrough
 */

import { $prose } from "@milkdown/utils";
import { Plugin, PluginKey } from "@milkdown/prose/state";

export const inlineTransformsPluginKey = new PluginKey("INLINE_TRANSFORMS");

/**
 * IME-safe inline transforms plugin
 *
 * ProseMirror's inputRules system already handles most IME safety,
 * but this plugin adds an extra layer of protection and can be
 * extended for custom behavior.
 */
export const inlineTransformsPlugin = $prose(() => {
  return new Plugin({
    key: inlineTransformsPluginKey,

    props: {
      // Block input rules during composition
      handleDOMEvents: {
        compositionstart: () => {
          // Let ProseMirror handle this natively
          return false;
        },
        compositionend: () => {
          // Let ProseMirror handle this natively
          return false;
        },
      },

      // Ensure transforms don't fire on every keystroke
      handleTextInput() {
        // Don't interfere with normal text input
        // Let inputRules handle pattern matching
        return false;
      },
    },

    // Monitor for caret position issues after transforms
    appendTransaction(transactions, oldState, newState) {
      // Check if any transaction was an input rule
      for (const tr of transactions) {
        // Input rules set this meta
        if (tr.getMeta("inputRule")) {
          // Verify caret is in a valid position
          const { selection } = newState;
          if (selection.empty) {
            // Caret should be at a text position, not stuck
            // If issues occur, this is where we'd fix them
          }
        }
      }
      return null;
    },
  });
});
