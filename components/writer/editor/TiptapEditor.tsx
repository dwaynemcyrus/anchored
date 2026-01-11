"use client";

import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Markdown } from "tiptap-markdown";
import { useEffect, useRef, useCallback } from "react";
import { FocusMode } from "@/lib/writer/tiptap/extensions/FocusMode";
import styles from "./TiptapEditor.module.css";

// Helper to get markdown from editor (tiptap-markdown extends storage)
function getMarkdown(editor: Editor): string {
  const storage = editor.storage as { markdown?: { getMarkdown: () => string } };
  return storage.markdown?.getMarkdown() ?? "";
}

// Helper to get focus mode state from editor storage
function getFocusModeEnabled(editor: Editor): boolean {
  const storage = editor.storage as { focusMode?: { enabled: boolean } };
  return storage.focusMode?.enabled ?? false;
}

// LocalStorage keys
const FOCUS_MODE_KEY = "writer-focus-mode";

export type TiptapEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  focusMode?: boolean;
  onFocusModeChange?: (enabled: boolean) => void;
};

export function TiptapEditor({
  value,
  onChange,
  placeholder = "Start writing...",
  className = "",
  autoFocus = false,
  focusMode: controlledFocusMode,
  onFocusModeChange,
}: TiptapEditorProps) {
  const isExternalUpdate = useRef(false);
  const onChangeRef = useRef(onChange);

  // Keep onChange ref up to date
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Determine if focus mode is controlled or uncontrolled
  const isControlled = controlledFocusMode !== undefined;
  const initialFocusMode = isControlled
    ? controlledFocusMode
    : typeof window !== "undefined"
      ? localStorage.getItem(FOCUS_MODE_KEY) === "true"
      : false;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: styles.link,
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: styles.taskList,
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: styles.taskItem,
        },
      }),
      FocusMode.configure({
        className: styles.hasFocus,
      }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: value,
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        class: styles.prose,
      },
    },
    onUpdate: ({ editor }) => {
      if (isExternalUpdate.current) return;
      const markdown = getMarkdown(editor);
      onChangeRef.current(markdown);
    },
  });

  // Initialize focus mode from localStorage or prop
  useEffect(() => {
    if (!editor) return;
    editor.commands.setFocusMode(initialFocusMode);
  }, [editor, initialFocusMode]);

  // Sync controlled focus mode prop
  useEffect(() => {
    if (!editor || !isControlled) return;
    const currentEnabled = getFocusModeEnabled(editor);
    if (currentEnabled !== controlledFocusMode) {
      editor.commands.setFocusMode(controlledFocusMode);
    }
  }, [editor, controlledFocusMode, isControlled]);

  // Handle focus mode toggle (from keyboard shortcut)
  useEffect(() => {
    if (!editor) return;

    const handleTransaction = () => {
      const enabled = getFocusModeEnabled(editor);

      // Persist to localStorage if uncontrolled
      if (!isControlled) {
        localStorage.setItem(FOCUS_MODE_KEY, String(enabled));
      }

      // Notify parent if callback provided
      onFocusModeChange?.(enabled);
    };

    editor.on("transaction", handleTransaction);
    return () => {
      editor.off("transaction", handleTransaction);
    };
  }, [editor, isControlled, onFocusModeChange]);

  // Handle external value updates
  useEffect(() => {
    if (!editor) return;

    const currentMarkdown = getMarkdown(editor);
    if (currentMarkdown === value) return;

    // Mark as external update to prevent onChange loop
    isExternalUpdate.current = true;

    // Get current selection to try to preserve cursor position
    const { from, to } = editor.state.selection;

    // Update content
    editor.commands.setContent(value);

    // Try to restore cursor position (clamped to new doc length)
    const newDocLength = editor.state.doc.content.size;
    const newFrom = Math.min(from, newDocLength);
    const newTo = Math.min(to, newDocLength);

    if (newFrom <= newDocLength) {
      editor.commands.setTextSelection({ from: newFrom, to: newTo });
    }

    isExternalUpdate.current = false;
  }, [value, editor]);

  // Cleanup
  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  // Check if focus mode is currently enabled
  const isFocusModeEnabled = editor ? getFocusModeEnabled(editor) : false;

  return (
    <div
      className={`${styles.editorContainer} ${className}`}
      data-focus-mode={isFocusModeEnabled ? "true" : undefined}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
