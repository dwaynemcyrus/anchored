/**
 * Rendered Line Widget
 *
 * Displays rendered HTML for a single line and handles click activation.
 */

import { WidgetType } from "@codemirror/view";
import type { EditorView } from "@codemirror/view";
import type { Block } from "./block-detector";
import { renderInlineLine } from "@/lib/utils/markdown-renderer";

type LineWidgetInput = {
  lineNumber: number;
  from: number;
  to: number;
  text: string;
  blocks: Block[];
};

function findBlockForLine(blocks: Block[], from: number, to: number): Block | null {
  for (const block of blocks) {
    if (from >= block.from && to <= block.to) {
      return block;
    }
  }
  return null;
}

function isCodeBlock(block: Block | null): boolean {
  return block?.type === "codeBlock";
}

export class RenderedLineWidget extends WidgetType {
  private readonly lineNumber: number;
  private readonly from: number;
  private readonly to: number;
  private readonly text: string;
  private readonly block: Block | null;

  constructor(input: LineWidgetInput) {
    super();
    this.lineNumber = input.lineNumber;
    this.from = input.from;
    this.to = input.to;
    this.text = input.text;
    this.block = findBlockForLine(input.blocks, input.from, input.to);
  }

  eq(other: RenderedLineWidget): boolean {
    return (
      this.text === other.text &&
      this.lineNumber === other.lineNumber &&
      this.block?.id === other.block?.id
    );
  }

  toDOM(view: EditorView): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = "cm-rendered-line";
    wrapper.setAttribute("data-line", String(this.lineNumber));
    wrapper.setAttribute("data-line-from", String(this.from));

    const html = renderInlineLine(this.text);
    wrapper.innerHTML = html;

    if (isCodeBlock(this.block)) {
      wrapper.classList.add("cm-rendered-line-code");
    }

    this.attachEventHandlers(wrapper, view);
    return wrapper;
  }

  private attachEventHandlers(element: HTMLElement, view: EditorView): void {
    const handleActivate = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement;
      if (this.isInteractiveElement(target)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const coords = this.getEventCoordinates(event);
      if (!coords) return;

      const pos = view.posAtCoords(coords);
      const anchor = pos === null ? this.from : Math.max(this.from, Math.min(pos, this.to));
      view.dispatch({
        selection: { anchor },
        scrollIntoView: true,
      });
      view.focus();
    };

    element.addEventListener("pointerdown", handleActivate as EventListener);
  }

  private isInteractiveElement(target: HTMLElement): boolean {
    let current: HTMLElement | null = target;
    while (current && current !== document.body) {
      const tagName = current.tagName.toLowerCase();
      if (
        tagName === "a" ||
        tagName === "button" ||
        tagName === "input" ||
        tagName === "label" ||
        current.classList.contains("task-list-item-checkbox")
      ) {
        return true;
      }
      current = current.parentElement;
    }
    return false;
  }

  private getEventCoordinates(event: MouseEvent | TouchEvent): { x: number; y: number } | null {
    if (event instanceof TouchEvent) {
      const touch = event.touches[0] || event.changedTouches[0];
      if (!touch) return null;
      return { x: touch.clientX, y: touch.clientY };
    }
    return { x: event.clientX, y: event.clientY };
  }
}

export function createRenderedLineWidget(input: LineWidgetInput): RenderedLineWidget {
  return new RenderedLineWidget(input);
}
