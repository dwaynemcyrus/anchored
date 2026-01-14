import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface HybridMarksOptions {
  marks: {
    bold?: boolean;
    italic?: boolean;
    code?: boolean;
    strike?: boolean;
    highlight?: boolean;
  };
}

export const HybridMarksPluginKey = new PluginKey("hybridMarks");

// Mark type to syntax mapping
const MARK_SYNTAX: Record<string, { before: string; after: string }> = {
  bold: { before: "**", after: "**" },
  italic: { before: "*", after: "*" },
  code: { before: "`", after: "`" },
  strike: { before: "~~", after: "~~" },
  highlight: { before: "==", after: "==" },
};

// Get the syntax length for a mark
function getSyntaxLength(markName: string): number {
  return MARK_SYNTAX[markName]?.before.length ?? 0;
}

interface ExpandedMark {
  // Position in document where the expanded mark starts (including syntax)
  from: number;
  // Position in document where the expanded mark ends (including syntax)
  to: number;
  // The mark type name
  markName: string;
  // Original text without syntax
  originalText: string;
}

interface HybridMarksState {
  expandedMark: ExpandedMark | null;
}

export const HybridMarks = Extension.create<HybridMarksOptions>({
  name: "hybridMarks",

  addOptions() {
    return {
      marks: {
        bold: true,
        italic: true,
        code: true,
        strike: true,
        highlight: true,
      },
    };
  },

  addProseMirrorPlugins() {
    const enabledMarks = this.options.marks;
    const editor = this.editor;

    // Helper to check if a mark type is enabled
    const isMarkEnabled = (markName: string): boolean => {
      return (
        (markName === "bold" && enabledMarks.bold === true) ||
        (markName === "italic" && enabledMarks.italic === true) ||
        (markName === "code" && enabledMarks.code === true) ||
        (markName === "strike" && enabledMarks.strike === true) ||
        (markName === "highlight" && enabledMarks.highlight === true)
      );
    };

    // Find mark range at position
    const findMarkRange = (
      doc: any,
      pos: number,
      markName: string
    ): { from: number; to: number; text: string } | null => {
      const $pos = doc.resolve(pos);
      const parent = $pos.parent;

      if (!parent.isTextblock) return null;

      let from = pos;
      let to = pos;
      let mark: any = null;

      // Find the mark at this position
      const nodeAt = doc.nodeAt(pos);
      if (!nodeAt || !nodeAt.isText) {
        // Try pos - 1 for cursor at end of mark
        const nodeBefore = pos > 0 ? doc.nodeAt(pos - 1) : null;
        if (nodeBefore && nodeBefore.isText) {
          mark = nodeBefore.marks.find((m: any) => m.type.name === markName);
          if (mark) {
            // Adjust position to be inside the mark
            from = pos - 1;
            to = pos - 1;
          }
        }
      } else {
        mark = nodeAt.marks.find((m: any) => m.type.name === markName);
      }

      if (!mark) return null;

      // Expand backwards to find mark start
      const startOfParent = $pos.start();
      for (let i = from - 1; i >= startOfParent; i--) {
        const node = doc.nodeAt(i);
        if (node && node.isText && node.marks.some((m: any) => m.eq(mark))) {
          from = i;
        } else {
          break;
        }
      }

      // Expand forwards to find mark end
      const endOfParent = $pos.end();
      for (let i = to; i < endOfParent; i++) {
        const node = doc.nodeAt(i);
        if (node && node.isText && node.marks.some((m: any) => m.eq(mark))) {
          to = i + 1;
        } else {
          break;
        }
      }

      const text = doc.textBetween(from, to);
      return { from, to, text };
    };

    return [
      new Plugin({
        key: HybridMarksPluginKey,

        state: {
          init(): HybridMarksState {
            return { expandedMark: null };
          },

          apply(tr, state: HybridMarksState): HybridMarksState {
            // If there's metadata indicating we should clear, do so
            const meta = tr.getMeta(HybridMarksPluginKey);
            if (meta?.clear) {
              return { expandedMark: null };
            }
            if (meta?.expanded) {
              return { expandedMark: meta.expanded };
            }

            // Map positions through the transaction
            if (state.expandedMark && tr.docChanged) {
              const newFrom = tr.mapping.map(state.expandedMark.from);
              const newTo = tr.mapping.map(state.expandedMark.to);
              return {
                expandedMark: {
                  ...state.expandedMark,
                  from: newFrom,
                  to: newTo,
                },
              };
            }

            return state;
          },
        },

        props: {
          decorations: (state) => {
            const { doc, selection } = state;
            const { from, to } = selection;
            const decorations: Decoration[] = [];
            const pluginState = HybridMarksPluginKey.getState(state) as HybridMarksState;

            // If we have an expanded mark, don't add decorations for it
            const expandedMark = pluginState?.expandedMark;

            // Add decorations for non-active marks (visual only, no editing)
            doc.descendants((node, pos) => {
              if (!node.isText) return;

              node.marks.forEach((mark) => {
                const markName = mark.type.name;
                const syntax = MARK_SYNTAX[markName];

                if (!syntax || !isMarkEnabled(markName)) return;

                const nodeEnd = pos + node.nodeSize;

                // Skip if this is part of the expanded region
                if (expandedMark) {
                  const syntaxLen = getSyntaxLength(expandedMark.markName);
                  const contentStart = expandedMark.from + syntaxLen;
                  const contentEnd = expandedMark.to - syntaxLen;
                  if (pos >= contentStart && nodeEnd <= contentEnd) {
                    return;
                  }
                }

                // Check if cursor is in this mark's range
                // Find full mark extent
                let markStart = pos;
                let markEnd = nodeEnd;

                const $pos = doc.resolve(pos);
                const startOfParent = $pos.start();
                const endOfParent = $pos.end();

                // Expand backwards
                for (let i = pos - 1; i >= startOfParent; i--) {
                  const n = doc.nodeAt(i);
                  if (n && n.isText && n.marks.some((m: any) => m.eq(mark))) {
                    markStart = i;
                  } else {
                    break;
                  }
                }

                // Expand forwards
                for (let i = nodeEnd; i < endOfParent; i++) {
                  const n = doc.nodeAt(i);
                  if (n && n.isText && n.marks.some((m: any) => m.eq(mark))) {
                    markEnd = i + 1;
                  } else {
                    break;
                  }
                }

                const cursorInMarkRange = from >= markStart && to <= markEnd;

                // Add decoration class based on whether cursor is inside
                decorations.push(
                  Decoration.inline(pos, nodeEnd, {
                    class: cursorInMarkRange
                      ? `hybrid-mark hybrid-mark--${markName} hybrid-mark--active`
                      : `hybrid-mark hybrid-mark--${markName}`,
                    "data-syntax-before": syntax.before,
                    "data-syntax-after": syntax.after,
                  })
                );
              });
            });

            return DecorationSet.create(doc, decorations);
          },
        },

        appendTransaction(transactions, oldState, newState) {
          // Only handle selection changes
          const selectionChanged = transactions.some((tr) => tr.selectionSet);
          if (!selectionChanged) return null;

          const pluginState = HybridMarksPluginKey.getState(newState) as HybridMarksState;
          const { selection } = newState;
          const { from, to } = selection;

          // Check if cursor is in an expanded mark region
          if (pluginState?.expandedMark) {
            const { expandedMark } = pluginState;
            const cursorInExpanded = from >= expandedMark.from && to <= expandedMark.to;

            if (!cursorInExpanded) {
              // Cursor left the expanded region - collapse it back
              const syntax = MARK_SYNTAX[expandedMark.markName];
              if (!syntax) return null;

              const syntaxLen = syntax.before.length;
              const currentText = newState.doc.textBetween(
                expandedMark.from,
                expandedMark.to
              );

              // Check if text still has syntax markers
              if (
                currentText.startsWith(syntax.before) &&
                currentText.endsWith(syntax.after)
              ) {
                // Extract content without syntax
                const content = currentText.slice(syntaxLen, -syntaxLen);

                if (content.length > 0) {
                  const markType = newState.schema.marks[expandedMark.markName];
                  if (markType) {
                    const tr = newState.tr;

                    // Replace the expanded text with marked content
                    tr.replaceWith(
                      expandedMark.from,
                      expandedMark.to,
                      newState.schema.text(content, [markType.create()])
                    );

                    // Clear the expanded state
                    tr.setMeta(HybridMarksPluginKey, { clear: true });

                    // Adjust selection if needed
                    const newFrom = Math.min(from, expandedMark.from + content.length);
                    const newTo = Math.min(to, expandedMark.from + content.length);
                    tr.setSelection(TextSelection.create(tr.doc, newFrom, newTo));

                    return tr;
                  }
                } else {
                  // Content was deleted, just remove the syntax
                  const tr = newState.tr;
                  tr.delete(expandedMark.from, expandedMark.to);
                  tr.setMeta(HybridMarksPluginKey, { clear: true });
                  return tr;
                }
              } else {
                // Syntax markers were modified/removed, just clear state
                const tr = newState.tr;
                tr.setMeta(HybridMarksPluginKey, { clear: true });
                return tr;
              }
            }

            return null;
          }

          // Check if cursor entered a mark
          const cursorPos = from;
          for (const markName of Object.keys(MARK_SYNTAX)) {
            if (!isMarkEnabled(markName)) continue;

            const markRange = findMarkRange(newState.doc, cursorPos, markName);
            if (markRange) {
              // Expand this mark - replace marked text with syntax + text + syntax
              const syntax = MARK_SYNTAX[markName];
              const expandedText = syntax.before + markRange.text + syntax.after;

              const tr = newState.tr;

              // Remove the mark and insert plain text with syntax
              tr.removeMark(markRange.from, markRange.to, newState.schema.marks[markName]);
              tr.insertText(expandedText, markRange.from, markRange.to);

              // Calculate new cursor position (offset by the added syntax)
              const syntaxLen = syntax.before.length;
              const offsetFrom = from - markRange.from;
              const newCursorPos = markRange.from + syntaxLen + offsetFrom;

              tr.setSelection(TextSelection.create(tr.doc, newCursorPos));

              // Store the expanded state
              tr.setMeta(HybridMarksPluginKey, {
                expanded: {
                  from: markRange.from,
                  to: markRange.from + expandedText.length,
                  markName,
                  originalText: markRange.text,
                },
              });

              return tr;
            }
          }

          return null;
        },
      }),
    ];
  },
});
