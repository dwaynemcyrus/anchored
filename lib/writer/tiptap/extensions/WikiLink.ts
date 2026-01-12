import { Node, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { InputRule } from "@tiptap/core";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";

export type WikiLinkSuggestionItem = {
  id: string;
  title: string;
  slug: string;
};

export interface WikiLinkOptions {
  HTMLAttributes: Record<string, unknown>;
  onNavigate?: (slug: string) => void;
  validateLink?: (slug: string) => boolean;
  suggestion?: Omit<SuggestionOptions<WikiLinkSuggestionItem>, "editor">;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    wikiLink: {
      setWikiLink: (attributes: { slug: string; label?: string }) => ReturnType;
    };
  }
}

export const WikiLinkPluginKey = new PluginKey("wikiLink");

export const WikiLink = Node.create<WikiLinkOptions>({
  name: "wikiLink",

  group: "inline",

  inline: true,

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      onNavigate: undefined,
      validateLink: undefined,
      suggestion: undefined,
    };
  },

  addAttributes() {
    return {
      slug: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-slug"),
        renderHTML: (attributes) => ({
          "data-slug": attributes.slug,
        }),
      },
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-label"),
        renderHTML: (attributes) => ({
          "data-label": attributes.label,
        }),
      },
      exists: {
        default: true,
        parseHTML: (element) => element.getAttribute("data-exists") !== "false",
        renderHTML: (attributes) => ({
          "data-exists": attributes.exists ? "true" : "false",
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="wiki-link"]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const slug = node.attrs.slug || "";
    const label = node.attrs.label || slug;
    const exists = node.attrs.exists !== false;

    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "wiki-link",
        "data-exists": exists ? "true" : "false",
        class: `wiki-link ${exists ? "wiki-link--exists" : "wiki-link--missing"}`,
      }),
      label,
    ];
  },

  addCommands() {
    return {
      setWikiLink:
        (attributes) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          });
        },
    };
  },

  addInputRules() {
    // Match [[slug]] or [[slug|label]]
    const wikiLinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/;

    return [
      new InputRule({
        find: wikiLinkRegex,
        handler: ({ state, range, match, chain }) => {
          const slug = match[1]?.trim();
          const label = match[2]?.trim() || null;

          if (!slug) return null;

          // Check if link exists (if validator provided)
          const exists = this.options.validateLink
            ? this.options.validateLink(slug)
            : true;

          chain()
            .deleteRange(range)
            .insertContent({
              type: this.name,
              attrs: { slug, label, exists },
            })
            .run();
        },
      }),
    ];
  },

  addProseMirrorPlugins() {
    const extension = this;
    const plugins: Plugin[] = [];

    // Click handler plugin
    plugins.push(
      new Plugin({
        key: WikiLinkPluginKey,
        props: {
          handleClick(view, pos, event) {
            const target = event.target as HTMLElement;
            const wikiLink = target.closest('[data-type="wiki-link"]');

            if (wikiLink && extension.options.onNavigate) {
              const slug = wikiLink.getAttribute("data-slug");
              if (slug) {
                event.preventDefault();
                extension.options.onNavigate(slug);
                return true;
              }
            }

            return false;
          },
        },
      })
    );

    // Suggestion plugin (if configured)
    if (this.options.suggestion) {
      plugins.push(
        Suggestion({
          editor: this.editor,
          ...this.options.suggestion,
          command: ({ editor, range, props }) => {
            // Delete the trigger text and insert the wiki-link
            editor
              .chain()
              .focus()
              .deleteRange(range)
              .insertContent({
                type: this.name,
                attrs: {
                  slug: props.slug,
                  label: props.title,
                  exists: true,
                },
              })
              .run();
          },
        })
      );
    }

    return plugins;
  },
});

// Helper to convert wiki-link syntax in markdown to nodes
export function parseWikiLinksFromMarkdown(text: string): string {
  // This is used by the markdown extension to handle wiki-links
  // The actual parsing happens via the input rule when typing
  return text;
}
