/**
 * Raw Markdown Edit Plugin
 *
 * Bear-style edit mode for active marks and specific blocks (tables/callouts).
 * When activated, it swaps the target range to raw markdown text so markers
 * are visible and editable, then re-parses on exit.
 */

import { $prose, getMarkdown, markdownToSlice } from "@milkdown/utils";
import { parserCtx } from "@milkdown/core";
import {
  Plugin,
  PluginKey,
  TextSelection,
  type EditorState,
  type Selection,
} from "@milkdown/prose/state";
import { Decoration, DecorationSet } from "@milkdown/prose/view";
import { Slice, Fragment } from "@milkdown/prose/model";

type RawModeKind = "inline" | "block";

type RawModeState = {
  active: {
    kind: RawModeKind;
    from: number;
    to: number;
  } | null;
  skipNextEnter: boolean;
};

type RawModeMeta =
  | { type: "enter"; payload: RawModeState["active"] }
  | { type: "exit" }
  | { type: "clear-skip" };

export const rawMarkdownEditPluginKey = new PluginKey<RawModeState>(
  "RAW_MARKDOWN_EDIT"
);

const INLINE_MARKS = new Set(["strong", "em", "code", "link", "strike", "del"]);
const BLOCK_TYPES = new Set(["table", "blockquote"]);

function selectionInsideRange(selection: Selection, from: number, to: number) {
  return selection.from >= from && selection.to <= to;
}

function getActiveMarkRange(
  state: EditorState,
  markName: string
): { from: number; to: number } | null {
  const { selection } = state;
  const $pos = selection.$from;
  const markType = state.schema.marks[markName];
  if (!markType) return null;

  const parent = $pos.parent;
  const startPos = $pos.start();
  let pos = startPos;
  let rangeStart: number | null = null;
  let rangeEnd: number | null = null;

  for (let i = 0; i < parent.childCount; i += 1) {
    const child = parent.child(i);
    const childStart = pos;
    const childEnd = pos + child.nodeSize;
    const hasMark = markType.isInSet(child.marks);

    if (hasMark) {
      if (rangeStart === null) rangeStart = childStart;
      rangeEnd = childEnd;
    } else if (rangeStart !== null) {
      if ($pos.pos >= rangeStart && $pos.pos <= rangeEnd) {
        return { from: rangeStart, to: rangeEnd };
      }
      rangeStart = null;
      rangeEnd = null;
    }

    pos = childEnd;
  }

  if (rangeStart !== null && rangeEnd !== null) {
    if ($pos.pos >= rangeStart && $pos.pos <= rangeEnd) {
      return { from: rangeStart, to: rangeEnd };
    }
  }

  return null;
}

function findInlineRange(state: EditorState) {
  const { selection } = state;
  if (!selection.empty) return null;

  const marks = selection.$from.marks();
  for (const mark of marks) {
    if (!INLINE_MARKS.has(mark.type.name)) continue;
    const range = getActiveMarkRange(state, mark.type.name);
    if (range) return range;
  }

  if (selection.node && selection.node.type.name === "image") {
    return { from: selection.from, to: selection.to };
  }

  return null;
}

function findBlockRange(state: EditorState) {
  const { selection } = state;
  if (selection.node && BLOCK_TYPES.has(selection.node.type.name)) {
    return { from: selection.from, to: selection.to };
  }

  const $pos = selection.$from;
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    const node = $pos.node(depth);
    if (BLOCK_TYPES.has(node.type.name)) {
      return { from: $pos.before(depth), to: $pos.after(depth) };
    }
  }

  return null;
}

function textToInlineFragment(schema: EditorState["schema"], text: string) {
  if (!text) return Fragment.empty;
  const pieces = text.split("\n");
  const nodes = [];
  pieces.forEach((piece, index) => {
    if (piece) nodes.push(schema.text(piece));
    if (index < pieces.length - 1 && schema.nodes.hard_break) {
      nodes.push(schema.nodes.hard_break.create());
    }
  });
  return Fragment.fromArray(nodes);
}

function collectRawText(
  state: EditorState,
  from: number,
  to: number
): { text: string; segments: Array<{ start: number; end: number; pos: number }> } {
  const segments: Array<{ start: number; end: number; pos: number }> = [];
  let text = "";

  state.doc.nodesBetween(from, to, (node, pos) => {
    if (node.isText && node.text) {
      const start = text.length;
      const end = start + node.text.length;
      segments.push({ start, end, pos });
      text += node.text;
    }
    if (node.type.name === "hard_break") {
      const start = text.length;
      const end = start + 1;
      segments.push({ start, end, pos });
      text += "\n";
    }
  });

  return { text, segments };
}

function mapIndexToPos(
  segments: Array<{ start: number; end: number; pos: number }>,
  fallback: number,
  index: number
) {
  for (const segment of segments) {
    if (index >= segment.start && index <= segment.end) {
      return segment.pos + (index - segment.start);
    }
  }
  return fallback;
}

function inlineMarkerRanges(text: string) {
  const ranges: Array<{ start: number; end: number }> = [];

  if (!text) return ranges;

  const linkMatch = text.match(/^(!?\[)([\s\S]*?)\]\(([\s\S]*?)\)$/);
  if (linkMatch) {
    const prefixLen = linkMatch[1].length;
    const labelLen = linkMatch[2].length;
    const urlLen = linkMatch[3].length;
    ranges.push({ start: 0, end: prefixLen });
    ranges.push({ start: prefixLen + labelLen, end: prefixLen + labelLen + 2 });
    ranges.push({
      start: prefixLen + labelLen + 2 + urlLen,
      end: prefixLen + labelLen + 3 + urlLen,
    });
    return ranges;
  }

  const backtickMatch = text.match(/^(`+)([\s\S]*?)\1$/);
  if (backtickMatch) {
    const markerLen = backtickMatch[1].length;
    ranges.push({ start: 0, end: markerLen });
    ranges.push({ start: text.length - markerLen, end: text.length });
    return ranges;
  }

  const markMatch = text.match(/^(\*\*\*|___|\*\*|__|\*|_|~~)([\s\S]*?)\1$/);
  if (markMatch) {
    const markerLen = markMatch[1].length;
    ranges.push({ start: 0, end: markerLen });
    ranges.push({ start: text.length - markerLen, end: text.length });
    return ranges;
  }

  return ranges;
}

function blockMarkerRanges(text: string) {
  const ranges: Array<{ start: number; end: number }> = [];
  let offset = 0;

  const lines = text.split("\n");
  for (const line of lines) {
    const calloutMatch = line.match(/^>\s*\[!(\w+)\]/);
    if (calloutMatch) {
      const markerLen = calloutMatch[0].length;
      ranges.push({ start: offset, end: offset + markerLen });
    } else if (line.startsWith(">")) {
      const end = Math.min(line.length, 2);
      ranges.push({ start: offset, end: offset + end });
    }

    if (line.includes("|")) {
      for (let i = 0; i < line.length; i += 1) {
        if (line[i] === "|") {
          ranges.push({ start: offset + i, end: offset + i + 1 });
        }
      }
    }

    const footnoteMatch = line.match(/^\[\^[^\]]+\]:/);
    if (footnoteMatch) {
      ranges.push({
        start: offset,
        end: offset + footnoteMatch[0].length,
      });
    }

    offset += line.length + 1;
  }

  return ranges;
}

export const rawMarkdownEditPlugin = $prose((ctx) => {
  return new Plugin<RawModeState>({
    key: rawMarkdownEditPluginKey,
    state: {
      init: () => ({ active: null, skipNextEnter: false }),
      apply: (tr, value) => {
        const meta = tr.getMeta(rawMarkdownEditPluginKey) as RawModeMeta | null;
        if (meta?.type === "enter") {
          return { active: meta.payload, skipNextEnter: false };
        }
        if (meta?.type === "exit") {
          return { active: null, skipNextEnter: true };
        }
        if (meta?.type === "clear-skip") {
          return { ...value, skipNextEnter: false };
        }

        if (!value.active || !tr.docChanged) return value;
        const mappedFrom = tr.mapping.map(value.active.from);
        const mappedTo = tr.mapping.map(value.active.to);
        return { ...value, active: { ...value.active, from: mappedFrom, to: mappedTo } };
      },
    },
    props: {
      handleTextInput(view, from, to, text) {
        const pluginState = rawMarkdownEditPluginKey.getState(view.state);
        if (!pluginState?.active) return false;

        view.dispatch(view.state.tr.insertText(text, from, to));
        return true;
      },
      handleKeyDown(view, event) {
        const pluginState = rawMarkdownEditPluginKey.getState(view.state);
        if (!pluginState?.active) return false;

        if (event.key === "Enter" || event.key === "Escape") {
          event.preventDefault();
          exitRawMode(view.state, view, ctx);
          return true;
        }

        return false;
      },
      handleDOMEvents: {
        blur(view) {
          const pluginState = rawMarkdownEditPluginKey.getState(view.state);
          if (pluginState?.active) {
            exitRawMode(view.state, view, ctx);
          }
          return false;
        },
      },
      decorations(state) {
        const pluginState = rawMarkdownEditPluginKey.getState(state);
        if (!pluginState?.active) return null;

        const { from, to, kind } = pluginState.active;
        const { text, segments } = collectRawText(state, from, to);
        const markers =
          kind === "inline" ? inlineMarkerRanges(text) : blockMarkerRanges(text);
        if (markers.length === 0) return null;

        const decorations = markers
          .map((marker) => {
            const start = mapIndexToPos(segments, from, marker.start);
            const end = mapIndexToPos(segments, to, marker.end);
            if (end <= start) return null;
            return Decoration.inline(start, end, { class: "raw-markdown-marker" });
          })
          .filter((decoration): decoration is Decoration => Boolean(decoration));

        if (decorations.length === 0) return null;
        return DecorationSet.create(state.doc, decorations);
      },
    },
    view: (view) => {
      return {
        update: (updatedView, prevState) => {
          const pluginState = rawMarkdownEditPluginKey.getState(
            updatedView.state
          );
          if (!pluginState) return;

          if (pluginState.skipNextEnter) {
            updatedView.dispatch(
              updatedView.state.tr.setMeta(rawMarkdownEditPluginKey, {
                type: "clear-skip",
              })
            );
            return;
          }

          if (pluginState.active) {
            if (
              prevState.selection.eq(updatedView.state.selection) &&
              prevState.doc.eq(updatedView.state.doc)
            ) {
              return;
            }

            if (
              !selectionInsideRange(
                updatedView.state.selection,
                pluginState.active.from,
                pluginState.active.to
              )
            ) {
              exitRawMode(updatedView.state, updatedView, ctx);
            }
            return;
          }

          if (prevState.selection.eq(updatedView.state.selection)) return;

          const blockRange = findBlockRange(updatedView.state);
          if (blockRange) {
            enterRawMode(updatedView, ctx, "block", blockRange);
            return;
          }

          const inlineRange = findInlineRange(updatedView.state);
          if (inlineRange) {
            enterRawMode(updatedView, ctx, "inline", inlineRange);
          }
        },
      };
    },
  });
});

function enterRawMode(
  view: import("@milkdown/prose/view").EditorView,
  ctx: import("@milkdown/ctx").Ctx,
  kind: RawModeKind,
  range: { from: number; to: number }
) {
  const markdown = getMarkdown({ from: range.from, to: range.to })(ctx);
  const tr = view.state.tr;
  const schema = view.state.schema;
  const contentText = view.state.doc.textBetween(range.from, range.to, "\n", "\n");
  const contentIndex = markdown.indexOf(contentText);
  const baseOffset = contentIndex >= 0 ? contentIndex : 0;
  const selectionOffset = view.state.selection.from - range.from;

  if (kind === "block") {
    const fragment = textToInlineFragment(schema, markdown);
    const paragraph = schema.nodes.paragraph?.create(null, fragment);
    if (!paragraph) return;
    tr.replaceRangeWith(range.from, range.to, paragraph);
  } else {
    tr.insertText(markdown, range.from, range.to);
  }

  const mappedFrom = tr.mapping.map(range.from);
  const textStart = kind === "block" ? mappedFrom + 1 : mappedFrom;
  const selectionPos = Math.min(
    textStart + baseOffset + selectionOffset,
    textStart + markdown.length
  );
  tr.setSelection(TextSelection.near(tr.doc.resolve(selectionPos)));
  tr.setMeta(rawMarkdownEditPluginKey, {
    type: "enter",
    payload: {
      kind,
      from: textStart,
      to: textStart + markdown.length,
    },
  } satisfies RawModeMeta);

  view.dispatch(tr);
}

function exitRawMode(
  state: EditorState,
  view: import("@milkdown/prose/view").EditorView,
  ctx: import("@milkdown/ctx").Ctx
) {
  const pluginState = rawMarkdownEditPluginKey.getState(state);
  if (!pluginState?.active) return;

  const { from, to, kind } = pluginState.active;
  const { text } = collectRawText(state, from, to);
  const tr = state.tr;

  let slice: Slice | null = null;
  if (kind === "inline") {
    const parser = ctx.get(parserCtx);
    const doc = parser(text);
    const content = doc.firstChild?.content ?? Fragment.empty;
    slice = new Slice(content, 0, 0);
  } else {
    slice = markdownToSlice(text)(ctx);
  }

  try {
    if (slice) {
      tr.replaceRange(from, to, slice);
    } else {
      tr.insertText(text, from, to);
    }
  } catch {
    tr.insertText(text, from, to);
  }

  const selectionPos = Math.min(from, tr.doc.content.size);
  tr.setSelection(TextSelection.near(tr.doc.resolve(selectionPos)));
  tr.setMeta(rawMarkdownEditPluginKey, { type: "exit" } satisfies RawModeMeta);
  view.dispatch(tr);
}
