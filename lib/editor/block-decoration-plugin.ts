/**
 * Block Decoration Plugin
 *
 * Manages decorations that replace inactive blocks with rendered HTML widgets.
 * Only processes blocks within the viewport (plus buffer) for performance.
 */

import { ViewPlugin, Decoration, type DecorationSet, type ViewUpdate } from "@codemirror/view";
import type { EditorView } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { blocksStateField } from "./active-block-plugin";
import { createRenderedBlockWidget } from "./rendered-block-widget";

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

// Buffer size: render blocks within viewport + this many pixels above/below
const VIEWPORT_BUFFER_PX = 500;

// ─────────────────────────────────────────────────────────────────────────────
// Decoration Builder
// ─────────────────────────────────────────────────────────────────────────────

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const state = view.state;

  // Get blocks and active block from state
  const blocksState = state.field(blocksStateField, false);
  if (!blocksState) {
    return builder.finish();
  }

  const { blocks, activeBlock } = blocksState;
  const activeBlockId = activeBlock?.id ?? null;

  // Get viewport range with buffer (in document positions)
  const viewport = view.viewport;
  const bufferLines = Math.ceil(VIEWPORT_BUFFER_PX / 24); // ~24px per line
  const fromLine = Math.max(1, view.state.doc.lineAt(viewport.from).number - bufferLines);
  const toLine = Math.min(
    view.state.doc.lines,
    view.state.doc.lineAt(viewport.to).number + bufferLines
  );
  const rangeFrom = view.state.doc.line(fromLine).from;
  const rangeTo = view.state.doc.line(toLine).to;

  // Filter blocks to those in viewport range
  const visibleBlocks = blocks.filter(
    (block) => block.to >= rangeFrom && block.from <= rangeTo
  );

  // Build decorations for inactive blocks only
  for (const block of visibleBlocks) {
    // Skip the active block - show raw markdown
    if (block.id === activeBlockId) {
      continue;
    }

    // Skip empty blocks
    if (block.text.trim().length === 0) {
      continue;
    }

    // Create widget decoration that replaces the block text
    const widget = createRenderedBlockWidget(block);
    const decoration = Decoration.replace({
      widget,
      inclusive: false,
      block: true,
    });

    builder.add(block.from, block.to, decoration);
  }

  return builder.finish();
}

// ─────────────────────────────────────────────────────────────────────────────
// View Plugin
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ViewPlugin that manages block decorations.
 * Rebuilds decorations when:
 * - Document changes
 * - Selection changes (active block may change)
 * - Viewport changes (for performance optimization)
 */
export const blockDecorationPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: ViewUpdate) {
      // Rebuild decorations if document, selection, or viewport changed
      if (
        update.docChanged ||
        update.selectionSet ||
        update.viewportChanged ||
        update.geometryChanged
      ) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,

    eventHandlers: {
      // Prevent default behavior for pointer events on widgets
      pointerdown: (event) => {
        const target = event.target as HTMLElement;
        if (target.closest(".cm-rendered-block")) {
          // Widget will handle the event
          return true;
        }
        return false;
      },
    },
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Extension
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extension that enables rendered block decorations.
 * Requires activeBlockExtension to be included first.
 */
export function blockDecorationExtension() {
  return [blockDecorationPlugin];
}
