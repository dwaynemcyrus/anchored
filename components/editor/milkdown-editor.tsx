"use client";

import { useEffect, useRef } from "react";
import { Editor, rootCtx, defaultValueCtx } from "@milkdown/core";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { commonmark } from "@milkdown/preset-commonmark";
import { gfm } from "@milkdown/preset-gfm";
import { listener, listenerCtx } from "@milkdown/plugin-listener";
import { history } from "@milkdown/plugin-history";
import { replaceAll } from "@milkdown/utils";
import { blockTransformsPlugin } from "@/lib/editor/milkdown-plugins/block-transforms";
import { backspaceHandlerPlugin } from "@/lib/editor/milkdown-plugins/backspace-handler";
import { inlineTransformsPlugin } from "@/lib/editor/milkdown-plugins/inline-transforms";
import { pasteHandlerPlugin } from "@/lib/editor/milkdown-plugins/paste-handler";
import { rawMarkdownEditPlugin } from "@/lib/editor/milkdown-plugins/raw-markdown-edit";
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
  const editorRef = useRef<Editor | null>(null);
  const isExternalUpdate = useRef(false);
  const lastMarkdownRef = useRef<string>("");

  // Keep onChange ref current
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const { get, loading } = useEditor((root) => {
    return Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        // Start empty - we'll hydrate after editor is ready
        ctx.set(defaultValueCtx, "");

        // Set up listener for content changes
        ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
          lastMarkdownRef.current = markdown;
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
      .use(backspaceHandlerPlugin)
      .use(inlineTransformsPlugin)
      .use(pasteHandlerPlugin)
      .use(rawMarkdownEditPlugin);
  }, []);

  // Store editor reference and handle auto-focus
  useEffect(() => {
    if (loading) return;

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
  }, [get, loading, autoFocus]);

  // Sync external value changes without clobbering local input.
  useEffect(() => {
    if (loading) return;
    const editor = editorRef.current;
    if (!editor) return;
    if (value === lastMarkdownRef.current) return;

    isExternalUpdate.current = true;

    try {
      editor.action(replaceAll(value));
      lastMarkdownRef.current = value;
    } catch (e) {
      console.error("Failed to hydrate editor content:", e);
    }

    isExternalUpdate.current = false;
  }, [value, loading]);

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
