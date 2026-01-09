/**
 * Checkbox Toggle Plugin
 *
 * Handles clicking on rendered task list checkboxes.
 * Toggles [ ] <-> [x] in the underlying markdown without entering edit mode.
 */

import { ViewPlugin } from "@codemirror/view";
import type { EditorView } from "@codemirror/view";

// ─────────────────────────────────────────────────────────────────────────────
// Checkbox Pattern
// ─────────────────────────────────────────────────────────────────────────────

// Matches task list checkbox: - [ ] or - [x] or * [ ] or * [x]
const CHECKBOX_PATTERN = /^(\s*[-*]\s*)\[([ xX])\]/;

// ─────────────────────────────────────────────────────────────────────────────
// Toggle Logic
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Toggle a checkbox at the given document position.
 * Returns true if a toggle was performed.
 */
export function toggleCheckboxAtLine(view: EditorView, lineNumber: number): boolean {
  const doc = view.state.doc;

  // Validate line number
  if (lineNumber < 1 || lineNumber > doc.lines) {
    return false;
  }

  const line = doc.line(lineNumber);
  const lineText = line.text;

  // Check if this line has a checkbox
  const match = lineText.match(CHECKBOX_PATTERN);
  if (!match) {
    return false;
  }

  // Calculate the position of the checkbox character
  const prefix = match[1]; // "- " or "* " with any leading whitespace
  const checkboxChar = match[2]; // " " or "x" or "X"
  const checkboxCharPos = line.from + prefix.length + 1; // +1 for the "["

  // Determine new character
  const newChar = checkboxChar === " " ? "x" : " ";

  // Dispatch the change
  view.dispatch({
    changes: {
      from: checkboxCharPos,
      to: checkboxCharPos + 1,
      insert: newChar,
    },
    // Don't move selection - keep it where it was
    userEvent: "checkbox.toggle",
  });

  return true;
}

/**
 * Find the line number containing a checkbox from a click position.
 */
export function findCheckboxLine(view: EditorView, pos: number): number | null {
  try {
    const line = view.state.doc.lineAt(pos);
    const lineText = line.text;

    if (CHECKBOX_PATTERN.test(lineText)) {
      return line.number;
    }
  } catch {
    // Position out of bounds
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Handler
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handle checkbox click from a rendered widget.
 * Called when a checkbox input element is clicked.
 */
export function handleCheckboxClick(
  view: EditorView,
  blockFrom: number,
  checkboxIndex: number
): boolean {
  // Find the block's lines and locate the nth checkbox
  const doc = view.state.doc;
  const startLine = doc.lineAt(blockFrom);

  let checkboxCount = 0;
  let currentLine = startLine.number;

  // Scan lines in the block to find the checkbox
  while (currentLine <= doc.lines) {
    const line = doc.line(currentLine);

    // Check if we've left the block (empty line or different structure)
    if (currentLine > startLine.number && !line.text.trim().startsWith("-") && !line.text.trim().startsWith("*")) {
      // Check if it's a continuation or nested item
      if (!line.text.match(/^\s+[-*]/)) {
        break;
      }
    }

    if (CHECKBOX_PATTERN.test(line.text)) {
      if (checkboxCount === checkboxIndex) {
        return toggleCheckboxAtLine(view, currentLine);
      }
      checkboxCount++;
    }

    currentLine++;

    // Safety limit
    if (currentLine - startLine.number > 100) break;
  }

  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// View Plugin
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ViewPlugin that listens for checkbox clicks in rendered blocks.
 */
export const checkboxTogglePlugin = ViewPlugin.fromClass(
  class {
    constructor(private view: EditorView) {
      this.handleClick = this.handleClick.bind(this);
      view.dom.addEventListener("click", this.handleClick);
    }

    handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement;

      // Check if clicked on a task list checkbox
      if (
        target.tagName === "INPUT" &&
        target.classList.contains("task-list-item-checkbox")
      ) {
        event.preventDefault();
        event.stopPropagation();

        // Find the rendered block container
        const blockElement = target.closest(".cm-rendered-block");
        if (!blockElement) return;

        // Get block position from data attribute
        const blockFrom = parseInt(
          blockElement.getAttribute("data-block-from") || "0",
          10
        );

        // Find which checkbox was clicked (by index within the block)
        const allCheckboxes = blockElement.querySelectorAll(
          ".task-list-item-checkbox"
        );
        let checkboxIndex = -1;
        allCheckboxes.forEach((cb, idx) => {
          if (cb === target) checkboxIndex = idx;
        });

        if (checkboxIndex >= 0) {
          handleCheckboxClick(this.view, blockFrom, checkboxIndex);
        }
      }
    }

    update() {
      // No update needed - we use DOM event listener
    }

    destroy() {
      this.view.dom.removeEventListener("click", this.handleClick);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Extension
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extension that enables checkbox toggling in rendered blocks.
 */
export function checkboxToggleExtension() {
  return [checkboxTogglePlugin];
}
