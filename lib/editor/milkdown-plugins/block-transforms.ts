/**
 * Block Transforms Plugin
 *
 * Tier A block transforms are triggered on SPACE at the start of a line.
 * These are provided by Milkdown's commonmark and gfm presets via ProseMirror inputRules.
 *
 * Supported transforms:
 * - `# ` through `###### ` → Heading levels 1-6
 * - `- `, `* `, `+ ` → Bullet list item
 * - `1. `, `2. ` (etc.) → Ordered list item
 * - `> ` → Blockquote
 * - `- [ ] `, `- [x] ` → Task list item (via GFM preset)
 *
 * Caret behavior:
 * - Caret remains after the space, inside the new block
 * - This is handled automatically by ProseMirror's inputRules
 *
 * Mobile/IME safety:
 * - InputRules only trigger after final character (space) is committed
 * - Composition events are handled by ProseMirror, not triggering rules mid-composition
 */

import { $prose } from "@milkdown/utils";
import { Plugin, PluginKey } from "@milkdown/prose/state";

export const blockTransformsPluginKey = new PluginKey("BLOCK_TRANSFORMS");

/**
 * Optional plugin for monitoring/extending block transform behavior.
 * Currently a pass-through that can be extended for custom behavior.
 */
export const blockTransformsPlugin = $prose(() => {
  return new Plugin({
    key: blockTransformsPluginKey,
    // Presets handle transforms correctly - this plugin is a hook for future customization
  });
});
