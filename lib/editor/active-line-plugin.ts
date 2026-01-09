/**
 * Active Line Plugin
 *
 * Tracks the active line and block context using a StateField.
 * Exposes facets for other plugins to determine render eligibility.
 */

import { StateField, Facet } from "@codemirror/state";
import type { EditorState } from "@codemirror/state";
import {
  detectBlocks,
  findActiveBlock,
  type Block,
} from "./block-detector";

export type LineContextState = {
  activeLine: number;
  blocks: Block[];
  activeBlock: Block | null;
};

export const activeLineFacet = Facet.define<number, number>({
  combine: (values) => values[0] ?? 1,
});

export const activeBlockFacet = Facet.define<Block | null, Block | null>({
  combine: (values) => values[0] ?? null,
});

export const allBlocksFacet = Facet.define<Block[], Block[]>({
  combine: (values) => values[0] ?? [],
});

export const lineContextStateField = StateField.define<LineContextState>({
  create(state: EditorState): LineContextState {
    const blocks = detectBlocks(state);
    const activeBlock = findActiveBlock(state, blocks);
    const activeLine = state.doc.lineAt(state.selection.main.head).number;
    return { activeLine, blocks, activeBlock };
  },
  update(value, tr): LineContextState {
    let blocks = value.blocks;
    let activeBlock = value.activeBlock;
    let activeLine = value.activeLine;

    if (tr.docChanged) {
      blocks = detectBlocks(tr.state);
    }

    if (tr.docChanged || tr.selection) {
      activeBlock = findActiveBlock(tr.state, blocks);
      activeLine = tr.state.doc.lineAt(tr.state.selection.main.head).number;
    }

    if (
      blocks !== value.blocks ||
      activeBlock !== value.activeBlock ||
      activeLine !== value.activeLine
    ) {
      return { activeLine, blocks, activeBlock };
    }

    return value;
  },
  provide(field) {
    return [
      activeLineFacet.from(field, (state) => state.activeLine),
      activeBlockFacet.from(field, (state) => state.activeBlock),
      allBlocksFacet.from(field, (state) => state.blocks),
    ];
  },
});

export function activeLineExtension() {
  return [lineContextStateField];
}
