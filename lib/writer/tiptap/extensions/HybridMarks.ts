import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface HybridMarksOptions {
  marks: {
    bold?: boolean;
    italic?: boolean;
    code?: boolean;
    strike?: boolean;
  };
}

export const HybridMarksPluginKey = new PluginKey("hybridMarks");

// Mark type to syntax mapping
const MARK_SYNTAX: Record<string, { before: string; after: string }> = {
  bold: { before: "**", after: "**" },
  italic: { before: "*", after: "*" },
  code: { before: "`", after: "`" },
  strike: { before: "~~", after: "~~" },
};

export const HybridMarks = Extension.create<HybridMarksOptions>({
  name: "hybridMarks",

  addOptions() {
    return {
      marks: {
        bold: true,
        italic: true,
        code: true,
        strike: true,
      },
    };
  },

  addProseMirrorPlugins() {
    const enabledMarks = this.options.marks;

    return [
      new Plugin({
        key: HybridMarksPluginKey,
        props: {
          decorations: (state) => {
            const { doc, selection } = state;
            const { from, to } = selection;
            const decorations: Decoration[] = [];

            // Track which mark ranges contain the cursor
            const cursorInMark = new Set<string>();

            // First pass: find all marks that contain the cursor
            doc.nodesBetween(from, to, (node, pos) => {
              if (!node.isText) return;

              node.marks.forEach((mark) => {
                const markName = mark.type.name;
                if (
                  (markName === "bold" && enabledMarks.bold) ||
                  (markName === "italic" && enabledMarks.italic) ||
                  (markName === "code" && enabledMarks.code) ||
                  (markName === "strike" && enabledMarks.strike)
                ) {
                  cursorInMark.add(`${pos}-${markName}`);
                }
              });
            });

            // Second pass: add decorations for marks
            doc.descendants((node, pos) => {
              if (!node.isText) return;

              node.marks.forEach((mark) => {
                const markName = mark.type.name;
                const syntax = MARK_SYNTAX[markName];

                if (!syntax) return;
                if (
                  (markName === "bold" && !enabledMarks.bold) ||
                  (markName === "italic" && !enabledMarks.italic) ||
                  (markName === "code" && !enabledMarks.code) ||
                  (markName === "strike" && !enabledMarks.strike)
                ) {
                  return;
                }

                const nodeEnd = pos + node.nodeSize;

                // Check if cursor is within this specific text node with this mark
                const cursorInside = from >= pos && to <= nodeEnd;

                // Find the full extent of this mark (may span multiple text nodes)
                let markStart = pos;
                let markEnd = nodeEnd;

                // Look backwards for mark start
                doc.nodesBetween(0, pos, (n, p) => {
                  if (n.isText && n.marks.some((m) => m.type.name === markName && m.eq(mark))) {
                    markStart = p;
                  }
                });

                // Look forwards for mark end
                doc.nodesBetween(pos, doc.content.size, (n, p) => {
                  if (n.isText && n.marks.some((m) => m.type.name === markName && m.eq(mark))) {
                    markEnd = p + n.nodeSize;
                  }
                });

                // Only add decoration if cursor is inside this mark's full range
                const cursorInMarkRange = from >= markStart && to <= markEnd;

                if (cursorInside || cursorInMarkRange) {
                  // Add inline decoration with syntax visible class
                  decorations.push(
                    Decoration.inline(pos, nodeEnd, {
                      class: `hybrid-mark hybrid-mark--${markName} hybrid-mark--active`,
                      "data-syntax-before": syntax.before,
                      "data-syntax-after": syntax.after,
                    })
                  );
                } else {
                  // Add inline decoration without active class
                  decorations.push(
                    Decoration.inline(pos, nodeEnd, {
                      class: `hybrid-mark hybrid-mark--${markName}`,
                      "data-syntax-before": syntax.before,
                      "data-syntax-after": syntax.after,
                    })
                  );
                }
              });
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});
