/**
 * Block Detector
 *
 * Parses CodeMirror document into discrete Markdown blocks using the Lezer
 * syntax tree. Each block represents a semantic unit (paragraph, heading,
 * list item, code fence, etc.) that can be individually rendered or edited.
 */

import { syntaxTree } from "@codemirror/language";
import type { EditorState } from "@codemirror/state";
import type { SyntaxNode } from "@lezer/common";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type BlockType =
  | "paragraph"
  | "heading"
  | "list"
  | "listItem"
  | "blockquote"
  | "codeBlock"
  | "table"
  | "horizontalRule"
  | "linkReference"
  | "htmlBlock"
  | "unknown";

export type Block = {
  id: string;
  type: BlockType;
  from: number;
  to: number;
  text: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Node Type Mapping
// ─────────────────────────────────────────────────────────────────────────────

// Map Lezer node names to our block types
const NODE_TYPE_MAP: Record<string, BlockType> = {
  // Paragraphs
  Paragraph: "paragraph",

  // Headings (ATX and Setext)
  ATXHeading1: "heading",
  ATXHeading2: "heading",
  ATXHeading3: "heading",
  ATXHeading4: "heading",
  ATXHeading5: "heading",
  ATXHeading6: "heading",
  SetextHeading1: "heading",
  SetextHeading2: "heading",

  // Lists
  BulletList: "list",
  OrderedList: "list",
  ListItem: "listItem",

  // Blockquotes
  Blockquote: "blockquote",

  // Code blocks
  FencedCode: "codeBlock",
  CodeBlock: "codeBlock",

  // Tables (GFM)
  Table: "table",

  // Horizontal rules
  HorizontalRule: "horizontalRule",

  // Link references
  LinkReference: "linkReference",

  // HTML blocks
  HTMLBlock: "htmlBlock",
};

// Block-level node names (we want to detect these as top-level blocks)
const BLOCK_LEVEL_NODES = new Set([
  "Paragraph",
  "ATXHeading1",
  "ATXHeading2",
  "ATXHeading3",
  "ATXHeading4",
  "ATXHeading5",
  "ATXHeading6",
  "SetextHeading1",
  "SetextHeading2",
  "BulletList",
  "OrderedList",
  "Blockquote",
  "FencedCode",
  "CodeBlock",
  "Table",
  "HorizontalRule",
  "LinkReference",
  "HTMLBlock",
]);

// ─────────────────────────────────────────────────────────────────────────────
// Block Detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a stable ID for a block based on its position and content hash.
 */
function generateBlockId(from: number, to: number, type: BlockType): string {
  return `${type}-${from}-${to}`;
}

/**
 * Get the block type for a syntax node.
 */
function getBlockType(node: SyntaxNode): BlockType {
  return NODE_TYPE_MAP[node.name] || "unknown";
}

/**
 * Check if a node is a block-level element.
 */
function isBlockLevelNode(node: SyntaxNode): boolean {
  return BLOCK_LEVEL_NODES.has(node.name);
}

/**
 * Parse the document into an array of blocks.
 * Returns blocks sorted by position.
 */
export function detectBlocks(state: EditorState): Block[] {
  const blocks: Block[] = [];
  const doc = state.doc;
  const tree = syntaxTree(state);

  // Track processed ranges to avoid duplicates
  const processedRanges = new Set<string>();

  // Walk the syntax tree to find block-level nodes
  tree.iterate({
    enter: (node) => {
      // Only process block-level nodes
      if (!isBlockLevelNode(node.node)) {
        return;
      }

      // Skip if we've already processed this range (can happen with nested structures)
      const rangeKey = `${node.from}-${node.to}`;
      if (processedRanges.has(rangeKey)) {
        return false; // Don't descend into children
      }

      const type = getBlockType(node.node);
      const text = doc.sliceString(node.from, node.to);

      blocks.push({
        id: generateBlockId(node.from, node.to, type),
        type,
        from: node.from,
        to: node.to,
        text,
      });

      processedRanges.add(rangeKey);

      // For lists and blockquotes, we still want to process nested blocks
      // but mark them separately. For now, treat the whole list as one block.
      if (type === "list" || type === "blockquote") {
        return false; // Don't descend - treat as single block
      }
    },
  });

  // Sort blocks by position
  blocks.sort((a, b) => a.from - b.from);

  return blocks;
}

/**
 * Find the block containing a given position.
 * Returns null if position is not within any block.
 */
export function findBlockAtPosition(blocks: Block[], pos: number): Block | null {
  for (const block of blocks) {
    if (pos >= block.from && pos <= block.to) {
      return block;
    }
  }
  return null;
}

/**
 * Find the block containing the primary selection head.
 */
export function findActiveBlock(state: EditorState, blocks: Block[]): Block | null {
  const selection = state.selection.main;
  const head = selection.head;

  // Find the smallest enclosing block
  let activeBlock: Block | null = null;

  for (const block of blocks) {
    if (head >= block.from && head <= block.to) {
      // Prefer smaller (more specific) blocks
      if (!activeBlock || (block.to - block.from) < (activeBlock.to - activeBlock.from)) {
        activeBlock = block;
      }
    }
  }

  return activeBlock;
}

/**
 * Get blocks that intersect with a given range (useful for viewport filtering).
 */
export function getBlocksInRange(blocks: Block[], from: number, to: number): Block[] {
  return blocks.filter((block) => {
    // Block intersects range if it's not entirely before or entirely after
    return block.to >= from && block.from <= to;
  });
}

/**
 * Check if two blocks are the same (by ID).
 */
export function isSameBlock(a: Block | null, b: Block | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a.id === b.id;
}
