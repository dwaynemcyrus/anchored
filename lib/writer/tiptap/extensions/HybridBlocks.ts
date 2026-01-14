import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";

export interface HybridBlocksOptions {
  blocks: {
    heading?: boolean;
    bulletList?: boolean;
    orderedList?: boolean;
    blockquote?: boolean;
    taskList?: boolean;
    codeBlock?: boolean;
  };
}

export const HybridBlocksPluginKey = new PluginKey("hybridBlocks");

// Block type to syntax mapping
function getHeadingSyntax(level: number): string {
  return "#".repeat(level) + " ";
}

const BULLET_SYNTAX = "- ";
const BLOCKQUOTE_SYNTAX = "> ";
const TASK_UNCHECKED_SYNTAX = "- [ ] ";
const TASK_CHECKED_SYNTAX = "- [x] ";

interface ExpandedBlock {
  // Position of the block in document
  blockPos: number;
  // Type of block that was expanded
  blockType: string;
  // Additional info (e.g., heading level, list item index)
  meta?: Record<string, any>;
}

interface HybridBlocksState {
  expandedBlock: ExpandedBlock | null;
}

export const HybridBlocks = Extension.create<HybridBlocksOptions>({
  name: "hybridBlocks",

  addOptions() {
    return {
      blocks: {
        heading: true,
        bulletList: true,
        orderedList: true,
        blockquote: true,
        taskList: true,
        codeBlock: true,
      },
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    const editor = this.editor;

    return [
      new Plugin({
        key: HybridBlocksPluginKey,

        state: {
          init(): HybridBlocksState {
            return { expandedBlock: null };
          },

          apply(tr, state: HybridBlocksState): HybridBlocksState {
            const meta = tr.getMeta(HybridBlocksPluginKey);
            if (meta?.clear) {
              return { expandedBlock: null };
            }
            if (meta?.expanded) {
              return { expandedBlock: meta.expanded };
            }

            // Map positions through transaction
            if (state.expandedBlock && tr.docChanged) {
              const newPos = tr.mapping.map(state.expandedBlock.blockPos);
              return {
                expandedBlock: {
                  ...state.expandedBlock,
                  blockPos: newPos,
                },
              };
            }

            return state;
          },
        },

        appendTransaction(transactions, oldState, newState) {
          const selectionChanged = transactions.some((tr) => tr.selectionSet);
          const docChanged = transactions.some((tr) => tr.docChanged);

          if (!selectionChanged && !docChanged) return null;

          const pluginState = HybridBlocksPluginKey.getState(newState) as HybridBlocksState;
          const { selection } = newState;
          const { $from } = selection;

          // Get the block node containing the cursor
          const blockNode = $from.node($from.depth);
          const blockPos = $from.before($from.depth);
          const blockType = blockNode.type.name;

          // Check if we have an expanded block
          if (pluginState?.expandedBlock) {
            const { expandedBlock } = pluginState;

            // Check if cursor is still in the same block
            const stillInBlock = blockPos === expandedBlock.blockPos ||
              (blockPos >= expandedBlock.blockPos &&
               blockPos < expandedBlock.blockPos + (newState.doc.nodeAt(expandedBlock.blockPos)?.nodeSize ?? 0));

            if (!stillInBlock) {
              // Cursor left the expanded block - collapse it
              return collapseBlock(newState, expandedBlock, options);
            }

            return null;
          }

          // Check if cursor entered a block that should be expanded
          if (blockType === "heading" && options.blocks.heading) {
            return expandHeading(newState, $from, blockPos, blockNode);
          }

          if (blockType === "listItem") {
            const listNode = $from.node($from.depth - 1);
            if (listNode.type.name === "bulletList" && options.blocks.bulletList) {
              return expandBulletListItem(newState, $from, blockPos, blockNode);
            }
            if (listNode.type.name === "orderedList" && options.blocks.orderedList) {
              return expandOrderedListItem(newState, $from, blockPos, blockNode, listNode);
            }
          }

          if (blockType === "taskItem" && options.blocks.taskList) {
            return expandTaskItem(newState, $from, blockPos, blockNode);
          }

          if (blockType === "blockquote" && options.blocks.blockquote) {
            // For blockquotes, we need to handle the paragraph inside
            const paragraphNode = $from.node($from.depth);
            if (paragraphNode.type.name === "paragraph") {
              const bqPos = $from.before($from.depth - 1);
              return expandBlockquote(newState, $from, bqPos);
            }
          }

          // Check if we're in a paragraph inside a blockquote
          if (blockType === "paragraph" && $from.depth > 1) {
            const parentNode = $from.node($from.depth - 1);
            if (parentNode.type.name === "blockquote" && options.blocks.blockquote) {
              const bqPos = $from.before($from.depth - 1);
              return expandBlockquote(newState, $from, bqPos);
            }
          }

          // Check for code block
          if (blockType === "codeBlock" && options.blocks.codeBlock) {
            return expandCodeBlock(newState, $from, blockPos, blockNode);
          }

          return null;
        },
      }),
    ];
  },
});

function expandHeading(
  state: any,
  $from: any,
  blockPos: number,
  blockNode: ProseMirrorNode
): any {
  const level = blockNode.attrs.level || 1;
  const syntax = getHeadingSyntax(level);
  const content = blockNode.textContent;

  const tr = state.tr;

  // Replace heading with paragraph containing syntax + content
  const newContent = syntax + content;
  const paragraph = state.schema.nodes.paragraph.create(
    null,
    newContent ? state.schema.text(newContent) : null
  );

  tr.replaceWith(blockPos, blockPos + blockNode.nodeSize, paragraph);

  // Position cursor after the syntax
  const cursorOffset = $from.pos - blockPos - 1; // -1 for node boundary
  const newCursorPos = blockPos + 1 + syntax.length + Math.max(0, cursorOffset);
  tr.setSelection(TextSelection.create(tr.doc, newCursorPos));

  tr.setMeta(HybridBlocksPluginKey, {
    expanded: {
      blockPos,
      blockType: "heading",
      meta: { level },
    },
  });

  return tr;
}

function expandBulletListItem(
  state: any,
  $from: any,
  blockPos: number,
  blockNode: ProseMirrorNode
): any {
  // Get the text content of the list item (from its paragraph child)
  let content = "";
  blockNode.forEach((child) => {
    if (child.type.name === "paragraph") {
      content = child.textContent;
    }
  });

  const syntax = BULLET_SYNTAX;
  const tr = state.tr;

  // Get the list position
  const listPos = $from.before($from.depth - 1);
  const listNode = $from.node($from.depth - 1);

  // For simplicity, only expand if this is a single-item list or first item
  // Full list expansion is complex, so we'll just handle the current item
  const newContent = syntax + content;
  const paragraph = state.schema.nodes.paragraph.create(
    null,
    newContent ? state.schema.text(newContent) : null
  );

  // Replace just this list item's paragraph
  const paragraphPos = blockPos + 1; // +1 to get inside listItem
  const paragraphNode = blockNode.firstChild;
  if (paragraphNode) {
    tr.replaceWith(paragraphPos, paragraphPos + paragraphNode.nodeSize,
      state.schema.nodes.paragraph.create(null, state.schema.text(newContent))
    );

    // Position cursor
    const cursorOffset = $from.pos - paragraphPos - 1;
    const newCursorPos = paragraphPos + 1 + syntax.length + Math.max(0, cursorOffset);
    tr.setSelection(TextSelection.create(tr.doc, newCursorPos));

    tr.setMeta(HybridBlocksPluginKey, {
      expanded: {
        blockPos: paragraphPos,
        blockType: "bulletListItem",
      },
    });

    return tr;
  }

  return null;
}

function expandOrderedListItem(
  state: any,
  $from: any,
  blockPos: number,
  blockNode: ProseMirrorNode,
  listNode: ProseMirrorNode
): any {
  // Find the index of this list item
  let itemIndex = 1;
  const listPos = $from.before($from.depth - 1);
  listNode.forEach((item, offset, index) => {
    if (listPos + 1 + offset === blockPos) {
      itemIndex = index + 1;
    }
  });

  // Get the text content
  let content = "";
  blockNode.forEach((child) => {
    if (child.type.name === "paragraph") {
      content = child.textContent;
    }
  });

  const syntax = `${itemIndex}. `;
  const tr = state.tr;

  const newContent = syntax + content;
  const paragraphPos = blockPos + 1;
  const paragraphNode = blockNode.firstChild;

  if (paragraphNode) {
    tr.replaceWith(paragraphPos, paragraphPos + paragraphNode.nodeSize,
      state.schema.nodes.paragraph.create(null, state.schema.text(newContent))
    );

    const cursorOffset = $from.pos - paragraphPos - 1;
    const newCursorPos = paragraphPos + 1 + syntax.length + Math.max(0, cursorOffset);
    tr.setSelection(TextSelection.create(tr.doc, newCursorPos));

    tr.setMeta(HybridBlocksPluginKey, {
      expanded: {
        blockPos: paragraphPos,
        blockType: "orderedListItem",
        meta: { index: itemIndex },
      },
    });

    return tr;
  }

  return null;
}

function expandTaskItem(
  state: any,
  $from: any,
  blockPos: number,
  blockNode: ProseMirrorNode
): any {
  // Get the checked state from the taskItem
  const isChecked = blockNode.attrs.checked === true;
  const syntax = isChecked ? TASK_CHECKED_SYNTAX : TASK_UNCHECKED_SYNTAX;

  // Get the text content of the task item (from its paragraph child)
  let content = "";
  blockNode.forEach((child) => {
    if (child.type.name === "paragraph") {
      content = child.textContent;
    }
  });

  const tr = state.tr;

  const newContent = syntax + content;
  const paragraphPos = blockPos + 1; // +1 to get inside taskItem
  const paragraphNode = blockNode.firstChild;

  if (paragraphNode) {
    tr.replaceWith(
      paragraphPos,
      paragraphPos + paragraphNode.nodeSize,
      state.schema.nodes.paragraph.create(null, state.schema.text(newContent))
    );

    // Position cursor
    const cursorOffset = $from.pos - paragraphPos - 1;
    const newCursorPos = paragraphPos + 1 + syntax.length + Math.max(0, cursorOffset);
    tr.setSelection(TextSelection.create(tr.doc, newCursorPos));

    tr.setMeta(HybridBlocksPluginKey, {
      expanded: {
        blockPos: paragraphPos,
        blockType: "taskItem",
        meta: { checked: isChecked },
      },
    });

    return tr;
  }

  return null;
}

function expandBlockquote(
  state: any,
  $from: any,
  bqPos: number
): any {
  const bqNode = state.doc.nodeAt(bqPos);
  if (!bqNode) return null;

  // Get content from the paragraph inside blockquote
  let content = "";
  bqNode.forEach((child: ProseMirrorNode) => {
    if (child.type.name === "paragraph") {
      content = child.textContent;
    }
  });

  const syntax = BLOCKQUOTE_SYNTAX;
  const tr = state.tr;

  const newContent = syntax + content;
  const paragraph = state.schema.nodes.paragraph.create(
    null,
    newContent ? state.schema.text(newContent) : null
  );

  tr.replaceWith(bqPos, bqPos + bqNode.nodeSize, paragraph);

  // Position cursor
  const cursorOffset = $from.pos - bqPos - 2; // -2 for blockquote + paragraph boundaries
  const newCursorPos = bqPos + 1 + syntax.length + Math.max(0, cursorOffset);
  tr.setSelection(TextSelection.create(tr.doc, newCursorPos));

  tr.setMeta(HybridBlocksPluginKey, {
    expanded: {
      blockPos: bqPos,
      blockType: "blockquote",
    },
  });

  return tr;
}

function expandCodeBlock(
  state: any,
  $from: any,
  blockPos: number,
  blockNode: ProseMirrorNode
): any {
  const language = blockNode.attrs.language || "";
  const content = blockNode.textContent;

  const tr = state.tr;

  // Build the fenced code block syntax
  const openFence = "```" + language + "\n";
  const closeFence = "\n```";
  const newContent = openFence + content + closeFence;

  const paragraph = state.schema.nodes.paragraph.create(
    null,
    newContent ? state.schema.text(newContent) : null
  );

  tr.replaceWith(blockPos, blockPos + blockNode.nodeSize, paragraph);

  // Position cursor after the opening fence
  const cursorOffset = $from.pos - blockPos - 1;
  const newCursorPos = blockPos + 1 + openFence.length + Math.max(0, cursorOffset);
  tr.setSelection(TextSelection.create(tr.doc, newCursorPos));

  tr.setMeta(HybridBlocksPluginKey, {
    expanded: {
      blockPos,
      blockType: "codeBlock",
      meta: { language },
    },
  });

  return tr;
}

function collapseBlock(
  state: any,
  expandedBlock: ExpandedBlock,
  options: HybridBlocksOptions
): any {
  const { blockPos, blockType, meta } = expandedBlock;
  const node = state.doc.nodeAt(blockPos);

  if (!node || node.type.name !== "paragraph") {
    // Block was changed, just clear state
    const tr = state.tr;
    tr.setMeta(HybridBlocksPluginKey, { clear: true });
    return tr;
  }

  const text = node.textContent;
  const tr = state.tr;

  // Try to parse the text back to the appropriate block type

  // Check for fenced code block syntax
  const codeBlockMatch = text.match(/^```(\w*)\n([\s\S]*?)\n?```$/);
  if (codeBlockMatch && options.blocks.codeBlock) {
    const language = codeBlockMatch[1] || "";
    const content = codeBlockMatch[2];
    const codeBlock = state.schema.nodes.codeBlock.create(
      { language },
      content ? state.schema.text(content) : null
    );
    tr.replaceWith(blockPos, blockPos + node.nodeSize, codeBlock);
    tr.setMeta(HybridBlocksPluginKey, { clear: true });
    return tr;
  }

  // Check for heading syntax
  const headingMatch = text.match(/^(#{1,6})\s+(.*)$/);
  if (headingMatch && options.blocks.heading) {
    const level = headingMatch[1].length;
    const content = headingMatch[2];
    const heading = state.schema.nodes.heading.create(
      { level },
      content ? state.schema.text(content) : null
    );
    tr.replaceWith(blockPos, blockPos + node.nodeSize, heading);
    tr.setMeta(HybridBlocksPluginKey, { clear: true });
    return tr;
  }

  // Check for task list syntax (must be before bullet list since - [ ] starts with -)
  const taskMatch = text.match(/^-\s*\[([ xX])\]\s*(.*)$/);
  if (taskMatch && options.blocks.taskList) {
    const isChecked = taskMatch[1].toLowerCase() === "x";
    const content = taskMatch[2];
    const taskItem = state.schema.nodes.taskItem.create(
      { checked: isChecked },
      state.schema.nodes.paragraph.create(
        null,
        content ? state.schema.text(content) : null
      )
    );
    const taskList = state.schema.nodes.taskList.create(null, taskItem);
    tr.replaceWith(blockPos, blockPos + node.nodeSize, taskList);
    tr.setMeta(HybridBlocksPluginKey, { clear: true });
    return tr;
  }

  // Check for bullet list syntax
  const bulletMatch = text.match(/^[-*+]\s+(.*)$/);
  if (bulletMatch && options.blocks.bulletList) {
    const content = bulletMatch[1];
    const listItem = state.schema.nodes.listItem.create(
      null,
      state.schema.nodes.paragraph.create(
        null,
        content ? state.schema.text(content) : null
      )
    );
    const bulletList = state.schema.nodes.bulletList.create(null, listItem);
    tr.replaceWith(blockPos, blockPos + node.nodeSize, bulletList);
    tr.setMeta(HybridBlocksPluginKey, { clear: true });
    return tr;
  }

  // Check for ordered list syntax
  const orderedMatch = text.match(/^(\d+)\.\s+(.*)$/);
  if (orderedMatch && options.blocks.orderedList) {
    const content = orderedMatch[2];
    const listItem = state.schema.nodes.listItem.create(
      null,
      state.schema.nodes.paragraph.create(
        null,
        content ? state.schema.text(content) : null
      )
    );
    const orderedList = state.schema.nodes.orderedList.create(
      { start: parseInt(orderedMatch[1], 10) },
      listItem
    );
    tr.replaceWith(blockPos, blockPos + node.nodeSize, orderedList);
    tr.setMeta(HybridBlocksPluginKey, { clear: true });
    return tr;
  }

  // Check for blockquote syntax
  const blockquoteMatch = text.match(/^>\s*(.*)$/);
  if (blockquoteMatch && options.blocks.blockquote) {
    const content = blockquoteMatch[1];
    const blockquote = state.schema.nodes.blockquote.create(
      null,
      state.schema.nodes.paragraph.create(
        null,
        content ? state.schema.text(content) : null
      )
    );
    tr.replaceWith(blockPos, blockPos + node.nodeSize, blockquote);
    tr.setMeta(HybridBlocksPluginKey, { clear: true });
    return tr;
  }

  // No syntax found, just clear the state (leave as paragraph)
  tr.setMeta(HybridBlocksPluginKey, { clear: true });
  return tr;
}
