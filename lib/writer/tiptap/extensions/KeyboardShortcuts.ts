import { Extension } from "@tiptap/core";

export interface KeyboardShortcutsOptions {
  onSave?: () => void;
  onInsertLink?: () => void;
}

export const KeyboardShortcuts = Extension.create<KeyboardShortcutsOptions>({
  name: "keyboardShortcuts",

  addOptions() {
    return {
      onSave: undefined,
      onInsertLink: undefined,
    };
  },

  addKeyboardShortcuts() {
    return {
      // Cmd+S: Manual save
      "Mod-s": () => {
        if (this.options.onSave) {
          this.options.onSave();
          return true;
        }
        return false;
      },

      // Cmd+K: Insert/edit link
      "Mod-k": () => {
        if (this.options.onInsertLink) {
          this.options.onInsertLink();
          return true;
        }

        // Default behavior: prompt for URL
        const previousUrl = this.editor.getAttributes("link").href;
        const url = window.prompt("URL", previousUrl || "");

        if (url === null) {
          return true;
        }

        if (url === "") {
          this.editor.chain().focus().extendMarkRange("link").unsetLink().run();
          return true;
        }

        this.editor
          .chain()
          .focus()
          .extendMarkRange("link")
          .setLink({ href: url })
          .run();

        return true;
      },

      // Cmd+Shift+X: Strikethrough (in addition to default)
      "Mod-Shift-x": () => {
        this.editor.chain().focus().toggleStrike().run();
        return true;
      },

      // Cmd+Shift+C: Inline code (alternative to Cmd+E)
      "Mod-Shift-c": () => {
        this.editor.chain().focus().toggleCode().run();
        return true;
      },

      // Cmd+Shift+H: Toggle highlight/mark (common in writing apps)
      // Using blockquote as a "highlight" since we don't have highlight extension
      "Mod-Shift-b": () => {
        this.editor.chain().focus().toggleBlockquote().run();
        return true;
      },
    };
  },
});
