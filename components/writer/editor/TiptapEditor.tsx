"use client";

import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Markdown } from "tiptap-markdown";
import { useEffect, useRef } from "react";
import styles from "./TiptapEditor.module.css";

// Helper to get markdown from editor (tiptap-markdown extends storage)
function getMarkdown(editor: Editor): string {
  const storage = editor.storage as { markdown?: { getMarkdown: () => string } };
  return storage.markdown?.getMarkdown() ?? "";
}

export type TiptapEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
};

export function TiptapEditor({
  value,
  onChange,
  placeholder = "Start writing...",
  className = "",
  autoFocus = false,
}: TiptapEditorProps) {
  const isExternalUpdate = useRef(false);
  const onChangeRef = useRef(onChange);

  // Keep onChange ref up to date
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Configure starter kit options
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

  // Handle external value updates
  useEffect(() => {
    if (!editor) return;

    const currentMarkdown = getMarkdown(editor);
    if (currentMarkdown === value) return;

    // Mark as external update to prevent onChange loop
    isExternalUpdate.current = true;

    // Get current selection to try to preserve cursor position
    const { from, to } = editor.state.selection;
    const docLength = editor.state.doc.content.size;

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

  return (
    <div className={`${styles.editorContainer} ${className}`}>
      <EditorContent editor={editor} />
    </div>
  );
}
