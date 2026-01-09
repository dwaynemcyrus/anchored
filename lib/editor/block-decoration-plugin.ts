/**
 * Block Decoration Plugin
 *
 * Manages decorations that replace inactive blocks with rendered HTML widgets.
 * Only processes blocks within the viewport (plus buffer) for performance.
 */

import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import { RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";
import type { EditorState } from "@codemirror/state";
import { blocksStateField } from "./active-block-plugin";
import { createRenderedBlockWidget } from "./rendered-block-widget";

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

// Buffer size: render blocks within viewport + this many pixels above/below
const VIEWPORT_BUFFER_PX = 500;

type ViewportRange = {
  from: number;
  to: number;
};

// Viewport effect to keep decorations scoped to the visible range.
export const updateViewportEffect = StateEffect.define<ViewportRange>();

// ─────────────────────────────────────────────────────────────────────────────
// Decoration Builder
// ─────────────────────────────────────────────────────────────────────────────

function buildDecorations(state: EditorState, viewport: ViewportRange): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();

  // Get blocks and active block from state
  const blocksState = state.field(blocksStateField, false);
  if (!blocksState) {
    return builder.finish();
  }

  const { blocks, activeBlock } = blocksState;
  const activeBlockId = activeBlock?.id ?? null;

  // Get viewport range with buffer (in document positions)
  const bufferLines = Math.ceil(VIEWPORT_BUFFER_PX / 24); // ~24px per line
  const clampedFrom = Math.max(0, Math.min(viewport.from, state.doc.length));
  const clampedTo = Math.max(0, Math.min(viewport.to, state.doc.length));
  const fromLine = Math.max(1, state.doc.lineAt(clampedFrom).number - bufferLines);
  const toLine = Math.min(
    state.doc.lines,
    state.doc.lineAt(clampedTo).number + bufferLines
  );
  const rangeFrom = state.doc.line(fromLine).from;
  const rangeTo = state.doc.line(toLine).to;

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
// StateField
// ─────────────────────────────────────────────────────────────────────────────

type BlockDecorationsState = {
  viewport: ViewportRange;
  decorations: DecorationSet;
};

const blockDecorationsField = StateField.define<BlockDecorationsState>({
  create(state) {
    const viewport = { from: 0, to: state.doc.length };
    return {
      viewport,
      decorations: buildDecorations(state, viewport),
    };
  },
  update(value, tr) {
    let nextViewport = value.viewport;
    let viewportChanged = false;

    for (const effect of tr.effects) {
      if (effect.is(updateViewportEffect)) {
        nextViewport = effect.value;
        viewportChanged = true;
      }
    }

    if (tr.docChanged || tr.selection || viewportChanged) {
      return {
        viewport: nextViewport,
        decorations: buildDecorations(tr.state, nextViewport),
      };
    }

    return value;
  },
  provide: (field) => EditorView.decorations.from(field, (value) => value.decorations),
});

// ─────────────────────────────────────────────────────────────────────────────
// View Plugin
// ─────────────────────────────────────────────────────────────────────────────

const viewportSyncPlugin = ViewPlugin.fromClass(
  class {
    private lastViewport: ViewportRange;
    private pendingDispatch = false;

    constructor(view: EditorView) {
      this.lastViewport = view.viewport;
      this.scheduleViewportSync(view);
    }

    update(update: ViewUpdate) {
      if (!update.viewportChanged) return;
      this.scheduleViewportSync(update.view);
    }

    private scheduleViewportSync(view: EditorView) {
      if (this.pendingDispatch) return;
      this.pendingDispatch = true;
      requestAnimationFrame(() => {
        this.pendingDispatch = false;
        const nextViewport = view.viewport;
        if (
          this.lastViewport.from === nextViewport.from &&
          this.lastViewport.to === nextViewport.to
        ) {
          return;
        }
        this.lastViewport = nextViewport;
        view.dispatch({ effects: updateViewportEffect.of(nextViewport) });
      });
    }
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
  return [blockDecorationsField, viewportSyncPlugin];
}
