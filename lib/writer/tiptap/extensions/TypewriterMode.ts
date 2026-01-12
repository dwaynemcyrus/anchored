import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export interface TypewriterModeOptions {
  scrollIntoViewOptions: ScrollIntoViewOptions;
}

export const TypewriterModePluginKey = new PluginKey("typewriterMode");

export const TypewriterMode = Extension.create<TypewriterModeOptions>({
  name: "typewriterMode",

  addOptions() {
    return {
      scrollIntoViewOptions: {
        behavior: "smooth",
        block: "center",
      },
    };
  },

  addStorage() {
    return {
      enabled: false,
    };
  },

  addCommands() {
    return {
      setTypewriterMode:
        (enabled: boolean) =>
        ({ editor }) => {
          this.storage.enabled = enabled;
          // If enabling, scroll current position to center
          if (enabled) {
            const { view } = editor;
            const { from } = view.state.selection;
            const coords = view.coordsAtPos(from);
            const editorRect = view.dom.getBoundingClientRect();
            const scrollContainer = view.dom.closest("[data-typewriter-scroll]") || view.dom.parentElement;

            if (scrollContainer && coords) {
              const containerRect = scrollContainer.getBoundingClientRect();
              const targetY = coords.top - containerRect.top - containerRect.height / 2;
              scrollContainer.scrollBy({
                top: targetY,
                behavior: "smooth",
              });
            }
          }
          return true;
        },
      toggleTypewriterMode:
        () =>
        ({ commands }) => {
          return commands.setTypewriterMode(!this.storage.enabled);
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-t": () => this.editor.commands.toggleTypewriterMode(),
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: TypewriterModePluginKey,
        view() {
          return {
            update(view, prevState) {
              if (!extension.storage.enabled) return;

              // Only scroll if selection changed (user is typing or moving cursor)
              const selectionChanged = !view.state.selection.eq(prevState.selection);
              if (!selectionChanged) return;

              // Get cursor position
              const { from } = view.state.selection;
              const coords = view.coordsAtPos(from);
              if (!coords) return;

              // Find scroll container
              const scrollContainer = view.dom.closest("[data-typewriter-scroll]") || view.dom.parentElement;
              if (!scrollContainer) return;

              const containerRect = scrollContainer.getBoundingClientRect();
              const cursorY = coords.top;
              const containerCenter = containerRect.top + containerRect.height / 2;
              const offset = cursorY - containerCenter;

              // Only scroll if cursor is not already near center (within 50px)
              if (Math.abs(offset) > 50) {
                scrollContainer.scrollBy({
                  top: offset,
                  behavior: "smooth",
                });
              }
            },
          };
        },
      }),
    ];
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    typewriterMode: {
      setTypewriterMode: (enabled: boolean) => ReturnType;
      toggleTypewriterMode: () => ReturnType;
    };
  }
}
