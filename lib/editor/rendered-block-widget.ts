/**
 * Rendered Block Widget
 *
 * A CodeMirror WidgetType that displays rendered HTML for inactive blocks.
 * Handles tap/click to activate the block for editing.
 */

import { WidgetType } from "@codemirror/view";
import type { EditorView } from "@codemirror/view";
import { renderBlock, type BlockType } from "@/lib/utils/markdown-renderer";
import type { Block } from "./block-detector";

// ─────────────────────────────────────────────────────────────────────────────
// Render Cache
// ─────────────────────────────────────────────────────────────────────────────

type CacheKey = string;
type CacheEntry = {
  html: string;
  element: HTMLElement | null;
};

const widgetCache = new Map<CacheKey, CacheEntry>();
const WIDGET_CACHE_MAX_SIZE = 200;

function getCacheKey(text: string, type: BlockType): CacheKey {
  // Use a hash-like key for efficiency
  return `${type}:${text.length}:${text.slice(0, 50)}:${text.slice(-50)}`;
}

function getCachedWidget(key: CacheKey): CacheEntry | null {
  return widgetCache.get(key) ?? null;
}

function setCachedWidget(key: CacheKey, entry: CacheEntry): void {
  // Evict oldest if full
  if (widgetCache.size >= WIDGET_CACHE_MAX_SIZE) {
    const oldest = widgetCache.keys().next().value;
    if (oldest) {
      widgetCache.delete(oldest);
    }
  }
  widgetCache.set(key, entry);
}

/**
 * Clear the widget cache.
 */
export function clearWidgetCache(): void {
  widgetCache.clear();
}

// ─────────────────────────────────────────────────────────────────────────────
// Widget Class
// ─────────────────────────────────────────────────────────────────────────────

export class RenderedBlockWidget extends WidgetType {
  private readonly block: Block;
  private readonly blockType: BlockType;
  private readonly cacheKey: CacheKey;

  constructor(block: Block) {
    super();
    this.block = block;
    this.blockType = block.type as BlockType;
    this.cacheKey = getCacheKey(block.text, this.blockType);
  }

  eq(other: RenderedBlockWidget): boolean {
    return this.cacheKey === other.cacheKey;
  }

  toDOM(view: EditorView): HTMLElement {
    // Check cache first
    const cached = getCachedWidget(this.cacheKey);
    if (cached?.element) {
      // Clone cached element to avoid DOM conflicts
      const clone = cached.element.cloneNode(true) as HTMLElement;
      this.attachEventHandlers(clone, view);
      return clone;
    }

    // Create new element
    const wrapper = document.createElement("div");
    wrapper.className = "cm-rendered-block";
    wrapper.setAttribute("data-block-id", this.block.id);
    wrapper.setAttribute("data-block-type", this.block.type);
    wrapper.setAttribute("data-block-from", String(this.block.from));
    wrapper.setAttribute("data-block-to", String(this.block.to));

    // Render markdown to HTML
    const html = cached?.html ?? renderBlock(this.block.text, this.blockType);
    wrapper.innerHTML = html;

    // Add type-specific classes
    wrapper.classList.add(`cm-rendered-${this.block.type}`);

    // Cache the result (without event handlers)
    if (!cached) {
      setCachedWidget(this.cacheKey, { html, element: wrapper.cloneNode(true) as HTMLElement });
    }

    // Attach event handlers
    this.attachEventHandlers(wrapper, view);

    return wrapper;
  }

  private attachEventHandlers(element: HTMLElement, view: EditorView): void {
    // Tap/click to activate block
    const handleActivate = (event: MouseEvent | TouchEvent) => {
      // Don't activate if clicking on interactive elements
      const target = event.target as HTMLElement;
      if (this.isInteractiveElement(target)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      // Get coordinates from event
      const coords = this.getEventCoordinates(event);
      if (!coords) return;

      // Map coordinates to document position
      const pos = view.posAtCoords(coords);
      if (pos === null) {
        // Fallback: place cursor at start of block
        view.dispatch({
          selection: { anchor: this.block.from },
          scrollIntoView: true,
        });
      } else {
        // Clamp position to block boundaries
        const clampedPos = Math.max(this.block.from, Math.min(pos, this.block.to));
        view.dispatch({
          selection: { anchor: clampedPos },
          scrollIntoView: true,
        });
      }

      view.focus();
    };

    // Use pointerdown for unified mouse/touch handling
    element.addEventListener("pointerdown", handleActivate as EventListener);

    // Prevent default touch behaviors that might interfere
    element.addEventListener("touchstart", (e) => {
      const target = e.target as HTMLElement;
      if (!this.isInteractiveElement(target)) {
        // Allow the pointerdown to handle it
      }
    }, { passive: true });
  }

  private isInteractiveElement(target: HTMLElement): boolean {
    // Check if target or ancestors are interactive
    let current: HTMLElement | null = target;
    while (current && current !== document.body) {
      const tagName = current.tagName.toLowerCase();

      // Interactive elements that should handle their own clicks
      if (
        tagName === "a" ||
        tagName === "button" ||
        tagName === "input" ||
        tagName === "label" ||
        current.classList.contains("cm-code-copy-btn") ||
        current.classList.contains("task-list-item-checkbox") ||
        current.hasAttribute("data-checkbox-line")
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

  get estimatedHeight(): number {
    // Rough estimate based on content
    const lineCount = this.block.text.split("\n").length;
    const baseHeight = 24; // Line height in pixels
    return Math.max(44, lineCount * baseHeight); // Min 44px for touch targets
  }

  ignoreEvent(): boolean {
    // Let the widget handle its own events
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a rendered block widget for a given block.
 */
export function createRenderedBlockWidget(block: Block): RenderedBlockWidget {
  return new RenderedBlockWidget(block);
}
