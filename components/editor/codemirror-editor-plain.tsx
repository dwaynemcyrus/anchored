"use client";

import { useEffect, useRef, useCallback } from "react";
import { EditorSelection, EditorState, Transaction } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import styles from "./codemirror-editor-plain.module.css";

export type CodeMirrorPlainEditorProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  autoFocus?: boolean;
};

export function CodeMirrorPlainEditor({
  value,
  onChange,
  className = "",
  autoFocus = false,
}: CodeMirrorPlainEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const isExternalUpdate = useRef(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const createUpdateListener = useCallback(() => {
    return EditorView.updateListener.of((update) => {
      if (update.docChanged && !isExternalUpdate.current) {
        onChangeRef.current(update.state.doc.toString());
      }
    });
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.lineWrapping,
        createUpdateListener(),
      ],
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentValue = view.state.doc.toString();
    if (currentValue === value) return;

    isExternalUpdate.current = true;

    const maxPos = value.length;
    const nextRanges = view.state.selection.ranges.map((range) => {
      const anchor = Math.min(range.anchor, maxPos);
      const head = Math.min(range.head, maxPos);
      return EditorSelection.range(anchor, head);
    });
    const nextSelection = EditorSelection.create(
      nextRanges,
      Math.min(view.state.selection.mainIndex, nextRanges.length - 1)
    );

    view.dispatch({
      changes: {
        from: 0,
        to: currentValue.length,
        insert: value,
      },
      selection: nextSelection,
      annotations: [Transaction.userEvent.of("external")],
    });

    isExternalUpdate.current = false;
  }, [value]);

  return (
    <div
      ref={containerRef}
      className={`${styles.editorContainer} ${className}`}
      data-testid="codemirror-plain-editor"
    />
  );
}
