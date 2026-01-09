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
import { allBlocksFacet, activeBlockFacet, activeLineFacet } from "./active-line-plugin";
import { createRenderedLineWidget } from "./rendered-line-widget";

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

  const activeLine = state.facet(activeLineFacet);
  const blocks = state.facet(allBlocksFacet);
  const activeBlock = state.facet(activeBlockFacet);

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

  // Build decorations per visible line
  for (let lineNumber = fromLine; lineNumber <= toLine; lineNumber += 1) {
    const line = state.doc.line(lineNumber);
    const text = line.text;

    if (lineNumber === activeLine) {
      continue;
    }

    if (text.trim().length === 0) {
      continue;
    }

    // If the active block is a block construct, keep its lines raw.
    if (
      activeBlock &&
      line.from >= activeBlock.from &&
      line.to <= activeBlock.to &&
      activeBlock.type !== "paragraph" &&
      activeBlock.type !== "heading" &&
      activeBlock.type !== "listItem"
    ) {
      continue;
    }

    const widget = createRenderedLineWidget({
      lineNumber,
      from: line.from,
      to: line.to,
      text,
      blocks,
    });
    const decoration = Decoration.replace({
      widget,
      inclusive: false,
    });

    builder.add(line.from, line.to, decoration);
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
