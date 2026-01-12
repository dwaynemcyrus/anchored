import { Node, mergeAttributes, wrappingInputRule } from "@tiptap/core";

export type CalloutType = "note" | "tip" | "warning" | "danger" | "info";

export interface CalloutOptions {
  HTMLAttributes: Record<string, unknown>;
  types: CalloutType[];
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attributes?: { type?: CalloutType; title?: string }) => ReturnType;
      toggleCallout: (attributes?: { type?: CalloutType; title?: string }) => ReturnType;
      unsetCallout: () => ReturnType;
    };
  }
}

// Input rule regex: matches "> [!type] optional title" or "> [!type]"
// At the start of a line
const calloutInputRegex = /^>\s*\[!(\w+)\]\s?(.*)$/;

export const Callout = Node.create<CalloutOptions>({
  name: "callout",

  addOptions() {
    return {
      HTMLAttributes: {},
      types: ["note", "tip", "warning", "danger", "info"],
    };
  },

  content: "block+",

  group: "block",

  defining: true,

  addAttributes() {
    return {
      type: {
        default: "note",
        parseHTML: (element) => element.getAttribute("data-callout-type") || "note",
        renderHTML: (attributes) => ({
          "data-callout-type": attributes.type,
        }),
      },
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-callout-title"),
        renderHTML: (attributes) => {
          if (!attributes.title) return {};
          return {
            "data-callout-title": attributes.title,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="callout"]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const type = node.attrs.type || "note";
    const title = node.attrs.title;

    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "callout",
        "data-callout-type": type,
        class: `callout callout--${type}`,
      }),
      [
        "div",
        { class: "callout-header" },
        [
          "span",
          { class: "callout-icon", "data-callout-type": type },
        ],
        [
          "span",
          { class: "callout-title" },
          title || type.charAt(0).toUpperCase() + type.slice(1),
        ],
      ],
      ["div", { class: "callout-content" }, 0],
    ];
  },

  addCommands() {
    return {
      setCallout:
        (attributes) =>
        ({ commands }) => {
          return commands.wrapIn(this.name, attributes);
        },
      toggleCallout:
        (attributes) =>
        ({ commands }) => {
          return commands.toggleWrap(this.name, attributes);
        },
      unsetCallout:
        () =>
        ({ commands }) => {
          return commands.lift(this.name);
        },
    };
  },

  addInputRules() {
    return [
      wrappingInputRule({
        find: calloutInputRegex,
        type: this.type,
        getAttributes: (match) => {
          const type = match[1]?.toLowerCase() as CalloutType;
          const title = match[2]?.trim() || null;

          // Validate type
          const validType = this.options.types.includes(type) ? type : "note";

          return {
            type: validType,
            title,
          };
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      // Cmd+Shift+C is taken by code, use Cmd+Shift+O for callOut
      "Mod-Shift-o": () => this.editor.commands.toggleCallout({ type: "note" }),
    };
  },
});
