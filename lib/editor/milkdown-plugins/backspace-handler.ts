/**
 * Backspace Downgrade Handler
 *
 * When caret is at the start of a formatted block, backspace downgrades
 * the structure instead of deleting content. This creates Bear-like flow.
 *
 * Behavior:
 * - Heading → Convert to paragraph
 * - List item → Unwrap to paragraph (lift out of list)
 * - Blockquote → Unwrap to paragraph
 * - Code block (at start) → Exit to paragraph
 */

import { $prose } from "@milkdown/utils";
import { PluginKey, EditorState, TextSelection } from "@milkdown/prose/state";
import { keymap } from "@milkdown/prose/keymap";
import { setBlockType, lift } from "@milkdown/prose/commands";
import { liftTarget } from "@milkdown/prose/transform";

export const backspaceHandlerPluginKey = new PluginKey("BACKSPACE_HANDLER");

/**
 * Check if cursor is at the start of a text block
 */
function isAtBlockStart(state: EditorState): boolean {
  const { selection } = state;
  if (!(selection instanceof TextSelection)) return false;
  const { $cursor } = selection;
  if (!$cursor) return false;
  return $cursor.parentOffset === 0;
}

/**
 * Backspace handler plugin
 */
export const backspaceHandlerPlugin = $prose(() => {
  return keymap({
    Backspace: (state, dispatch) => {
      // Only handle when cursor is at start of block
      if (!isAtBlockStart(state)) {
        return false;
      }

      const { $from } = state.selection;
      const node = $from.parent;
      const nodeType = node.type.name;

      // Handle headings - convert to paragraph
      if (nodeType.startsWith("heading")) {
        const paragraphType = state.schema.nodes.paragraph;
        if (paragraphType && dispatch) {
          setBlockType(paragraphType)(state, dispatch);
          return true;
        }
      }

      // Handle list items - lift out of list
      if (nodeType === "list_item" || nodeType === "listItem") {
        // Try to lift the content out of the list
        const range = $from.blockRange();
        if (range) {
          const target = liftTarget(range);
          if (target !== null && dispatch) {
            lift(state, dispatch);
            return true;
          }
        }
      }

      // Handle blockquotes - unwrap
      if (nodeType === "blockquote") {
        if (dispatch) {
          lift(state, dispatch);
          return true;
        }
      }

      // Handle code blocks - convert to paragraph
      if (nodeType === "code_block" || nodeType === "codeBlock") {
        const paragraphType = state.schema.nodes.paragraph;
        if (paragraphType && dispatch) {
          // Convert code block to paragraph
          const tr = state.tr;
          const pos = $from.before($from.depth);
          const end = $from.after($from.depth);

          // Replace the code block with a paragraph containing the same text
          const content = node.textContent;
          const newNode = paragraphType.create(null, content ? state.schema.text(content) : null);

          tr.replaceWith(pos, end, newNode);
          dispatch(tr);
          return true;
        }
      }

      // Check if we're inside a wrapped block (blockquote, list)
      // and need to lift out
      for (let depth = $from.depth; depth > 0; depth--) {
        const parentNode = $from.node(depth);
        const parentType = parentNode.type.name;

        if (parentType === "blockquote") {
          if (dispatch) {
            lift(state, dispatch);
            return true;
          }
        }

        if (parentType === "bullet_list" || parentType === "ordered_list" ||
            parentType === "bulletList" || parentType === "orderedList") {
          if (dispatch) {
            lift(state, dispatch);
            return true;
          }
        }
      }

      // Let default backspace handle other cases
      return false;
    },
  });
});
