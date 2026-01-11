"use client";

import { useEffect, useRef } from "react";
import { Editor, rootCtx, defaultValueCtx } from "@milkdown/core";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { commonmark } from "@milkdown/preset-commonmark";
import { gfm } from "@milkdown/preset-gfm";
import { listener, listenerCtx } from "@milkdown/plugin-listener";
import { history } from "@milkdown/plugin-history";
import { getMarkdown } from "@milkdown/utils";
import { blockTransformsPlugin } from "@/lib/editor/milkdown-plugins/block-transforms";
import { backspaceHandlerPlugin } from "@/lib/editor/milkdown-plugins/backspace-handler";
import styles from "./milkdown-editor.module.css";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type MilkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// Inner Editor Component
// ─────────────────────────────────────────────────────────────────────────────

type MilkdownEditorInnerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
};

function MilkdownEditorInner({
  value,
  onChange,
  placeholder,
  autoFocus,
}: MilkdownEditorInnerProps) {
  const onChangeRef = useRef(onChange);
  const initialValueRef = useRef(value);
  const editorRef = useRef<Editor | null>(null);
  const isExternalUpdate = useRef(false);

  // Keep onChange ref current
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const { get } = useEditor((root) => {
    return Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, initialValueRef.current);

        // Set up listener for content changes
        ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
          if (!isExternalUpdate.current) {
            onChangeRef.current(markdown);
          }
        });
      })
      .use(commonmark)
      .use(gfm)
      .use(listener)
      .use(history)
      .use(blockTransformsPlugin)
      .use(backspaceHandlerPlugin);
  }, []);

  // Store editor reference
  useEffect(() => {
    const editor = get();
    if (editor) {
      editorRef.current = editor;

      // Auto-focus if requested
      if (autoFocus) {
        const editorDom = document.querySelector(".milkdown .editor");
        if (editorDom instanceof HTMLElement) {
          editorDom.focus();
        }
      }
    }
  }, [get, autoFocus]);

  // Handle external value updates
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    // Get current markdown from editor
    const currentMarkdown = editor.action(getMarkdown());
    if (currentMarkdown === value) return;

    // Mark as external update to prevent onChange loop
    isExternalUpdate.current = true;

    // Replace content by resetting the editor
    // Milkdown doesn't have a direct "replace content" API,
    // so we need to reset if external value differs significantly
    // For now, we only sync on initial load; autosave handles the rest

    isExternalUpdate.current = false;
  }, [value]);

  return (
    <div className={styles.editorWrapper} data-placeholder={placeholder}>
      <Milkdown />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function MilkdownEditor({
  value,
  onChange,
  placeholder = "",
  className = "",
  autoFocus = false,
}: MilkdownEditorProps) {
  return (
    <div
      className={`${styles.editorContainer} ${className}`}
      data-testid="milkdown-editor"
    >
      <MilkdownProvider>
        <MilkdownEditorInner
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoFocus={autoFocus}
        />
      </MilkdownProvider>
    </div>
  );
}
