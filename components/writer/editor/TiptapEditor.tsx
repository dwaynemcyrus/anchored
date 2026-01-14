"use client";

import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import Highlight from "@tiptap/extension-highlight";
import { Markdown } from "tiptap-markdown";
import { useEffect, useRef } from "react";
import { FocusMode } from "@/lib/writer/tiptap/extensions/FocusMode";
import { TypewriterMode } from "@/lib/writer/tiptap/extensions/TypewriterMode";
import { HybridMarks } from "@/lib/writer/tiptap/extensions/HybridMarks";
import { HybridBlocks } from "@/lib/writer/tiptap/extensions/HybridBlocks";
import { KeyboardShortcuts } from "@/lib/writer/tiptap/extensions/KeyboardShortcuts";
import { Callout } from "@/lib/writer/tiptap/extensions/Callout";
import { EditorToolbar } from "./EditorToolbar";
import {
  WikiLink,
  type WikiLinkSuggestionItem,
} from "@/lib/writer/tiptap/extensions/WikiLink";
import { createWikiLinkSuggestion } from "@/lib/writer/tiptap/suggestions/wikiLinkSuggestion";
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

// Helper to get typewriter mode state from editor storage
function getTypewriterModeEnabled(editor: Editor): boolean {
  const storage = editor.storage as { typewriterMode?: { enabled: boolean } };
  return storage.typewriterMode?.enabled ?? false;
}

// LocalStorage keys
const FOCUS_MODE_KEY = "writer-focus-mode";
const TYPEWRITER_MODE_KEY = "writer-typewriter-mode";

export type TiptapEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  focusMode?: boolean;
  onFocusModeChange?: (enabled: boolean) => void;
  typewriterMode?: boolean;
  onTypewriterModeChange?: (enabled: boolean) => void;
  onWikiLinkClick?: (slug: string) => void;
  validateWikiLink?: (slug: string) => boolean;
  getWikiLinkSuggestions?: (
    query: string
  ) => Promise<WikiLinkSuggestionItem[]>;
  onSave?: () => void;
};

export function TiptapEditor({
  value,
  onChange,
  placeholder = "Start writing...",
  className = "",
  autoFocus = false,
  focusMode: controlledFocusMode,
  onFocusModeChange,
  typewriterMode: controlledTypewriterMode,
  onTypewriterModeChange,
  onWikiLinkClick,
  validateWikiLink,
  getWikiLinkSuggestions,
  onSave,
}: TiptapEditorProps) {
  const isExternalUpdate = useRef(false);
  const lastInternalValue = useRef(value);
  const onChangeRef = useRef(onChange);

  // Keep onChange ref up to date
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Determine if modes are controlled or uncontrolled
  const isFocusControlled = controlledFocusMode !== undefined;
  const isTypewriterControlled = controlledTypewriterMode !== undefined;

  const initialFocusMode = isFocusControlled
    ? controlledFocusMode
    : typeof window !== "undefined"
      ? localStorage.getItem(FOCUS_MODE_KEY) === "true"
      : false;

  const initialTypewriterMode = isTypewriterControlled
    ? controlledTypewriterMode
    : typeof window !== "undefined"
      ? localStorage.getItem(TYPEWRITER_MODE_KEY) === "true"
      : false;

  const editor = useEditor({
    immediatelyRender: false, // Required for Next.js SSR
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
        className: "is-focus-active",
      }),
      TypewriterMode,
      HybridMarks,
      HybridBlocks,
      KeyboardShortcuts.configure({
        onSave,
      }),
      Callout,
      Highlight.configure({
        HTMLAttributes: {
          class: styles.highlight,
        },
      }),
      Table.configure({
        resizable: false,
        HTMLAttributes: {
          class: styles.table,
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
      WikiLink.configure({
        onNavigate: onWikiLinkClick,
        validateLink: validateWikiLink,
        suggestion: getWikiLinkSuggestions
          ? createWikiLinkSuggestion({
              getSuggestions: getWikiLinkSuggestions,
            })
          : undefined,
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
      lastInternalValue.current = markdown;
      onChangeRef.current(markdown);
    },
  });

  // Initialize modes from localStorage or props
  useEffect(() => {
    if (!editor) return;
    editor.commands.setFocusMode(initialFocusMode);
    editor.commands.setTypewriterMode(initialTypewriterMode);
  }, [editor, initialFocusMode, initialTypewriterMode]);

  // Sync controlled focus mode prop
  useEffect(() => {
    if (!editor || !isFocusControlled) return;
    const currentEnabled = getFocusModeEnabled(editor);
    if (currentEnabled !== controlledFocusMode) {
      editor.commands.setFocusMode(controlledFocusMode);
    }
  }, [editor, controlledFocusMode, isFocusControlled]);

  // Sync controlled typewriter mode prop
  useEffect(() => {
    if (!editor || !isTypewriterControlled) return;
    const currentEnabled = getTypewriterModeEnabled(editor);
    if (currentEnabled !== controlledTypewriterMode) {
      editor.commands.setTypewriterMode(controlledTypewriterMode);
    }
  }, [editor, controlledTypewriterMode, isTypewriterControlled]);

  // Handle mode toggles (from keyboard shortcuts)
  useEffect(() => {
    if (!editor) return;

    const handleTransaction = () => {
      // Focus mode
      const focusEnabled = getFocusModeEnabled(editor);
      if (!isFocusControlled) {
        localStorage.setItem(FOCUS_MODE_KEY, String(focusEnabled));
      }
      onFocusModeChange?.(focusEnabled);

      // Typewriter mode
      const typewriterEnabled = getTypewriterModeEnabled(editor);
      if (!isTypewriterControlled) {
        localStorage.setItem(TYPEWRITER_MODE_KEY, String(typewriterEnabled));
      }
      onTypewriterModeChange?.(typewriterEnabled);
    };

    editor.on("transaction", handleTransaction);
    return () => {
      editor.off("transaction", handleTransaction);
    };
  }, [editor, isFocusControlled, isTypewriterControlled, onFocusModeChange, onTypewriterModeChange]);

  // Handle external value updates (e.g., loading document, restoring version)
  // Skip if value matches what we last set internally (from typing)
  useEffect(() => {
    if (!editor) return;

    // If this value came from our own onChange, skip the sync
    if (value === lastInternalValue.current) return;

    const currentMarkdown = getMarkdown(editor);
    if (currentMarkdown === value) return;

    isExternalUpdate.current = true;
    lastInternalValue.current = value;

    const { from, to } = editor.state.selection;

    editor.commands.setContent(value);

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

  // Get current mode states
  const isFocusModeEnabled = editor ? getFocusModeEnabled(editor) : false;
  const isTypewriterModeEnabled = editor ? getTypewriterModeEnabled(editor) : false;

  return (
    <div
      className={`${styles.editorContainer} ${className}`}
      data-focus-mode={isFocusModeEnabled ? "true" : undefined}
      data-typewriter-mode={isTypewriterModeEnabled ? "true" : undefined}
      data-typewriter-scroll
    >
      {editor && <EditorToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
