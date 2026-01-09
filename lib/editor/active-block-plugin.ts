/**
 * Active Block Plugin
 *
 * Tracks which block the cursor is currently in using a StateField.
 * Provides a Facet for other plugins to access the active block.
 */

import { StateField, StateEffect, Facet } from "@codemirror/state";
import type { EditorState } from "@codemirror/state";
import { ViewPlugin, type ViewUpdate } from "@codemirror/view";
import {
  detectBlocks,
  findActiveBlock,
  isSameBlock,
  type Block,
} from "./block-detector";

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────

export type BlocksState = {
  blocks: Block[];
  activeBlock: Block | null;
};

// Effect to update blocks
const updateBlocksEffect = StateEffect.define<BlocksState>();

// ─────────────────────────────────────────────────────────────────────────────
// Facet
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Facet providing access to the current active block.
 * Other plugins can read this to determine which block is being edited.
 */
export const activeBlockFacet = Facet.define<Block | null, Block | null>({
  combine: (values) => values[0] ?? null,
});

/**
 * Facet providing access to all detected blocks.
 */
export const allBlocksFacet = Facet.define<Block[], Block[]>({
  combine: (values) => values[0] ?? [],
});

// ─────────────────────────────────────────────────────────────────────────────
// StateField
// ─────────────────────────────────────────────────────────────────────────────

/**
 * StateField that maintains the list of blocks and the active block.
 */
export const blocksStateField = StateField.define<BlocksState>({
  create(state: EditorState): BlocksState {
    const blocks = detectBlocks(state);
    const activeBlock = findActiveBlock(state, blocks);
    return { blocks, activeBlock };
  },

  update(value: BlocksState, tr): BlocksState {
    // Check for explicit update effect
    for (const effect of tr.effects) {
      if (effect.is(updateBlocksEffect)) {
        return effect.value;
      }
    }

    // If document changed, recompute blocks
    if (tr.docChanged) {
      const blocks = detectBlocks(tr.state);
      const activeBlock = findActiveBlock(tr.state, blocks);
      return { blocks, activeBlock };
    }

    // If selection changed, recompute active block only
    if (tr.selection) {
      const activeBlock = findActiveBlock(tr.state, value.blocks);
      if (!isSameBlock(activeBlock, value.activeBlock)) {
        return { ...value, activeBlock };
      }
    }

    return value;
  },

  provide(field) {
    return [
      activeBlockFacet.from(field, (state) => state.activeBlock),
      allBlocksFacet.from(field, (state) => state.blocks),
    ];
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// ViewPlugin
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ViewPlugin that handles side effects when the active block changes.
 * Can be extended to trigger re-renders, animations, etc.
 */
export const activeBlockViewPlugin = ViewPlugin.fromClass(
  class {
    private lastActiveBlockId: string | null = null;

    constructor() {
      this.lastActiveBlockId = null;
    }

    update(update: ViewUpdate) {
      const state = update.state.field(blocksStateField);
      const currentId = state.activeBlock?.id ?? null;

      if (currentId !== this.lastActiveBlockId) {
        this.lastActiveBlockId = currentId;
        // Active block changed - decorations will be recalculated
        // by the decoration plugin in response to state change
      }
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the current active block from editor state.
 */
export function getActiveBlock(state: EditorState): Block | null {
  return state.facet(activeBlockFacet);
}

/**
 * Get all blocks from editor state.
 */
export function getAllBlocks(state: EditorState): Block[] {
  return state.facet(allBlocksFacet);
}

/**
 * Check if a block is currently active.
 */
export function isBlockActive(state: EditorState, block: Block): boolean {
  const active = getActiveBlock(state);
  return active !== null && active.id === block.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Extension
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extension bundle for active block tracking.
 * Include this in your editor extensions to enable block detection.
 */
export function activeBlockExtension() {
  return [blocksStateField, activeBlockViewPlugin];
}
