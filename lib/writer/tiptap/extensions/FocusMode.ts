import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface FocusModeOptions {
  className: string;
  mode: "paragraph" | "sentence";
}

export const FocusModePluginKey = new PluginKey("focusMode");

export const FocusMode = Extension.create<FocusModeOptions>({
  name: "focusMode",

  addOptions() {
    return {
      className: "has-focus",
      mode: "paragraph",
    };
  },

  addStorage() {
    return {
      enabled: false,
    };
  },

  addCommands() {
    return {
      setFocusMode:
        (enabled: boolean) =>
        ({ editor }) => {
          this.storage.enabled = enabled;
          // Force a state update to trigger decoration recalculation
          editor.view.dispatch(editor.state.tr);
          return true;
        },
      toggleFocusMode:
        () =>
        ({ editor, commands }) => {
          return commands.setFocusMode(!this.storage.enabled);
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-f": () => this.editor.commands.toggleFocusMode(),
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: FocusModePluginKey,
        props: {
          decorations(state) {
            if (!extension.storage.enabled) {
              return DecorationSet.empty;
            }

            const { doc, selection } = state;
            const { from } = selection;
            const decorations: Decoration[] = [];

            // Find the block node containing the cursor
            const $pos = doc.resolve(from);
            let activeBlockStart = 0;
            let activeBlockEnd = doc.content.size;

            // Find the nearest block-level ancestor
            for (let depth = $pos.depth; depth > 0; depth--) {
              const node = $pos.node(depth);
              if (node.isBlock && !node.isTextblock) {
                continue;
              }
              if (node.isBlock) {
                activeBlockStart = $pos.start(depth);
                activeBlockEnd = $pos.end(depth);
                break;
              }
            }

            // If we're at the top level, use the direct child block
            if (activeBlockStart === 0 && $pos.depth === 0) {
              // Find the block at cursor position
              let pos = 0;
              doc.forEach((node, offset) => {
                const nodeStart = offset;
                const nodeEnd = offset + node.nodeSize;
                if (from >= nodeStart && from <= nodeEnd) {
                  activeBlockStart = nodeStart;
                  activeBlockEnd = nodeEnd;
                }
                pos = nodeEnd;
              });
            }

            // Add decoration to mark the active block
            if (activeBlockEnd > activeBlockStart) {
              decorations.push(
                Decoration.node(activeBlockStart, activeBlockEnd, {
                  class: extension.options.className,
                })
              );
            }

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    focusMode: {
      setFocusMode: (enabled: boolean) => ReturnType;
      toggleFocusMode: () => ReturnType;
    };
  }
}
