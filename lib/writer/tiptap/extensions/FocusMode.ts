import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface FocusModeOptions {
  className: string;
}

export const FocusModePluginKey = new PluginKey("focusMode");

export const FocusMode = Extension.create<FocusModeOptions>({
  name: "focusMode",

  addOptions() {
    return {
      className: "has-focus",
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
          // Force view update to trigger decoration recalculation
          editor.view.dispatch(editor.state.tr.setMeta("focusModeToggle", true));
          return true;
        },
      toggleFocusMode:
        () =>
        ({ commands }) => {
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

            // Find which top-level block contains the cursor
            let currentPos = 0;

            doc.forEach((node, offset) => {
              const nodeStart = offset;
              const nodeEnd = offset + node.nodeSize;
              const isActive = from >= nodeStart && from <= nodeEnd;

              if (isActive) {
                // Add class to mark this block as active/focused
                decorations.push(
                  Decoration.node(nodeStart, nodeEnd, {
                    class: extension.options.className,
                  })
                );
              }

              currentPos = nodeEnd;
            });

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
