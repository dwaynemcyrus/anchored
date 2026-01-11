/**
 * Block Decoration Plugin
 *
 * Manages decorations that replace inactive lines with rendered HTML widgets.
 * Phase 6: render the full document, except caret/selection lines.
 */

import { Decoration, type DecorationSet, EditorView } from "@codemirror/view";
import { RangeSetBuilder, StateField } from "@codemirror/state";
import type { EditorState } from "@codemirror/state";
import { allBlocksFacet } from "./active-line-plugin";
import { createRenderedLineWidget } from "./rendered-line-widget";

// ─────────────────────────────────────────────────────────────────────────────
// Decoration Builder
// ─────────────────────────────────────────────────────────────────────────────

function getRawLineNumbers(state: EditorState): Set<number> {
  const rawLines = new Set<number>();
  for (const range of state.selection.ranges) {
    if (range.empty) {
      rawLines.add(state.doc.lineAt(range.head).number);
      continue;
    }
    const fromLine = state.doc.lineAt(range.from).number;
    let toLine = state.doc.lineAt(range.to).number;
    const toLineInfo = state.doc.line(toLine);
    if (range.to === toLineInfo.from) {
      toLine = Math.max(fromLine, toLine - 1);
    }
    for (let line = fromLine; line <= toLine; line += 1) {
      rawLines.add(line);
    }
  }
  return rawLines;
}

function buildDecorations(state: EditorState): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();

  const blocks = state.facet(allBlocksFacet);
  const rawLines = getRawLineNumbers(state);

  for (let lineNumber = 1; lineNumber <= state.doc.lines; lineNumber += 1) {
    const line = state.doc.line(lineNumber);
    const text = line.text;

    if (rawLines.has(lineNumber)) {
      continue;
    }

    if (text.trim().length === 0) {
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

const blockDecorationsField = StateField.define<DecorationSet>({
  create(state) {
    return buildDecorations(state);
  },
  update(value, tr) {
    if (tr.docChanged || tr.selection) {
      return buildDecorations(tr.state);
    }

    return value;
  },
  provide: (field) => EditorView.decorations.from(field),
});

// ─────────────────────────────────────────────────────────────────────────────
// Extension
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extension that enables rendered block decorations.
 * Requires activeBlockExtension to be included first.
 */
export function blockDecorationExtension() {
  return [blockDecorationsField];
}
