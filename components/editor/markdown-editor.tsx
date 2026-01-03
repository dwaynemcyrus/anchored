"use client";

import { useMemo, useRef, useState } from "react";
import { useDocumentSuggestions } from "@/lib/hooks/use-documents";
import styles from "./markdown-editor.module.css";

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [cursorPosition, setCursorPosition] = useState(0);

  const queryMatch = useMemo(() => {
    const snippet = value.slice(0, cursorPosition);
    return snippet.match(/\[\[([^\]]*)$/);
  }, [value, cursorPosition]);

  const suggestionQuery = queryMatch?.[1] ?? "";
  const { data: suggestions = [] } = useDocumentSuggestions(suggestionQuery);
  const showSuggestions = Boolean(queryMatch) && suggestions.length > 0;

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
    setCursorPosition(event.target.selectionStart ?? event.target.value.length);
  };

  const handleSelect = (event: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = event.currentTarget;
    setCursorPosition(target.selectionStart ?? target.value.length);
  };

  const insertSuggestion = (title: string) => {
    const startIndex = value.lastIndexOf("[[", cursorPosition);
    if (startIndex === -1) {
      return;
    }

    const prefix = value.slice(0, startIndex);
    const suffix = value.slice(cursorPosition);
    const insertion = `[[${title}]]`;
    const nextValue = `${prefix}${insertion}${suffix}`;
    onChange(nextValue);

    const nextCursor = prefix.length + insertion.length;
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(nextCursor, nextCursor);
      setCursorPosition(nextCursor);
    });
  };

  return (
    <div className={styles.editorRoot}>
      <textarea
        ref={textareaRef}
        className={styles.editorInput}
        value={value}
        onChange={handleChange}
        onSelect={handleSelect}
        placeholder={placeholder}
      />

      {showSuggestions && (
        <div className={styles.suggestions} role="listbox">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              className={styles.suggestionItem}
              onClick={() => insertSuggestion(suggestion.title)}
            >
              <span className={styles.suggestionTitle}>
                {suggestion.title}
              </span>
              <span className={styles.suggestionSlug}>
                {suggestion.slug}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
