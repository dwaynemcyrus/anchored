"use client";

import { useEffect, useRef, useState } from "react";
import { useCreateTask } from "@/lib/hooks/use-tasks";
import styles from "./quick-capture-sheet.module.css";

interface QuickCaptureSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickCaptureSheet({ isOpen, onClose }: QuickCaptureSheetProps) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const createTask = useCreateTask();

  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const isSaving = createTask.isPending;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = title.trim();

    if (!trimmed) {
      setError("Title is required.");
      return;
    }

    setError(null);

    try {
      await createTask.mutateAsync({
        title: trimmed,
        notes: null,
        project_id: null,
        task_location: "inbox",
        status: "pending",
        start_date: null,
        due_date: null,
      });
      setTitle("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save action.");
    }
  };

  return (
    <div className={styles.sheetRoot} role="presentation">
      <div className={styles.overlay} onClick={onClose} />
      <form
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label="Quick capture"
        onSubmit={handleSubmit}
      >
        <div className={styles.header}>
          <span className={styles.title}>Quick Capture</span>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <input
          ref={inputRef}
          className={styles.input}
          type="text"
          placeholder="Capture"
          aria-label="Quick capture"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={isSaving}
        />
        {error && <div className={styles.error}>{error}</div>}
        <div className={styles.footer}>
          <button
            type="submit"
            className={styles.save}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
