import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import type { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";
import {
  WikiLinkSuggestionList,
  type WikiLinkSuggestionItem,
  type WikiLinkSuggestionRef,
} from "@/components/writer/editor/WikiLinkSuggestion";

export type WikiLinkSuggestionConfig = {
  getSuggestions: (query: string) => Promise<WikiLinkSuggestionItem[]>;
};

export function createWikiLinkSuggestion(
  config: WikiLinkSuggestionConfig
): Omit<SuggestionOptions<WikiLinkSuggestionItem>, "editor"> {
  return {
    char: "[[",
    allowSpaces: true,

    items: async ({ query }) => {
      if (!query || query.length === 0) {
        return [];
      }
      return config.getSuggestions(query);
    },

    render: () => {
      let component: ReactRenderer<WikiLinkSuggestionRef> | null = null;
      let popup: TippyInstance[] | null = null;

      return {
        onStart: (props: SuggestionProps<WikiLinkSuggestionItem>) => {
          component = new ReactRenderer(WikiLinkSuggestionList, {
            props,
            editor: props.editor,
          });

          if (!props.clientRect) {
            return;
          }

          popup = tippy("body", {
            getReferenceClientRect: props.clientRect as () => DOMRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: "manual",
            placement: "bottom-start",
          });
        },

        onUpdate(props: SuggestionProps<WikiLinkSuggestionItem>) {
          component?.updateProps(props);

          if (!props.clientRect) {
            return;
          }

          popup?.[0]?.setProps({
            getReferenceClientRect: props.clientRect as () => DOMRect,
          });
        },

        onKeyDown(props: { event: KeyboardEvent }) {
          if (props.event.key === "Escape") {
            popup?.[0]?.hide();
            return true;
          }

          return component?.ref?.onKeyDown(props) ?? false;
        },

        onExit() {
          popup?.[0]?.destroy();
          component?.destroy();
        },
      };
    },
  };
}
