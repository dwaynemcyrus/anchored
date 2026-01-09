"use client";

import { useEffect, useRef, useCallback } from "react";
import { EditorState, Transaction } from "@codemirror/state";
import { EditorView, keymap, placeholder as placeholderExt } from "@codemirror/view";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { activeBlockExtension } from "@/lib/editor/active-block-plugin";
import { blockDecorationExtension } from "@/lib/editor/block-decoration-plugin";
import { checkboxToggleExtension } from "@/lib/editor/checkbox-toggle-plugin";
import { wikiLinkCompletion } from "@/lib/editor/wiki-link-completion";
import styles from "./codemirror-editor.module.css";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type CodeMirrorEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  /** Enable rendered markdown mode (default: true) */
  renderMode?: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// Theme
// ─────────────────────────────────────────────────────────────────────────────

const editorTheme = EditorView.theme({
  "&": {
    fontSize: "1rem",
    lineHeight: "1.7",
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".cm-scroller": {
    fontFamily: "inherit",
    overflow: "auto",
  },
  ".cm-content": {
    padding: "1.25rem",
    minHeight: "60vh",
    caretColor: "var(--foreground)",
  },
  ".cm-line": {
    padding: "0",
  },
  ".cm-placeholder": {
    color: "var(--muted-foreground)",
  },
  // Selection styling
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "var(--ring)",
    opacity: "0.3",
  },
  ".cm-cursor": {
    borderLeftColor: "var(--foreground)",
    borderLeftWidth: "2px",
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function CodeMirrorEditor({
  value,
  onChange,
  placeholder = "",
  className = "",
  autoFocus = false,
  renderMode = true,
}: CodeMirrorEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const isExternalUpdate = useRef(false);

  // Keep onChange ref current to avoid recreating extensions
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Create update listener that calls onChange
  const createUpdateListener = useCallback(() => {
    return EditorView.updateListener.of((update) => {
      if (update.docChanged && !isExternalUpdate.current) {
        const newValue = update.state.doc.toString();
        onChangeRef.current(newValue);
      }
    });
  }, []);

  // Initialize EditorView on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const extensions = [
      // Basic editing
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),

      // Markdown language support
      markdown({ base: markdownLanguage }),
      syntaxHighlighting(defaultHighlightStyle),

      // Theme and styling
      editorTheme,
      EditorView.lineWrapping,

      // Placeholder text
      ...(placeholder ? [placeholderExt(placeholder)] : []),

      // Update listener for onChange
      createUpdateListener(),

      // Wiki-link autocomplete (always enabled)
      wikiLinkCompletion(),

      // Rendered markdown mode extensions
      ...(renderMode
        ? [
            activeBlockExtension(),
            blockDecorationExtension(),
            checkboxToggleExtension(),
          ]
        : []),
    ];

    const state = EditorState.create({
      doc: value,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    if (autoFocus) {
      view.focus();
    }

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Only run on mount - value changes handled separately
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle external value updates without losing cursor position
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentValue = view.state.doc.toString();
    if (currentValue === value) return;

    // Mark as external update to prevent onChange loop
    isExternalUpdate.current = true;

    // Replace entire document content
    view.dispatch({
      changes: {
        from: 0,
        to: currentValue.length,
        insert: value,
      },
      // Preserve selection if possible
      selection: view.state.selection,
      annotations: [Transaction.userEvent.of("external")],
    });

    isExternalUpdate.current = false;
  }, [value]);

  return (
    <div
      ref={containerRef}
      className={`${styles.editorContainer} ${className}`}
      data-testid="codemirror-editor"
    />
  );
}
