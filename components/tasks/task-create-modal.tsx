"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useLayoutEffect, useRef, useState } from "react";
import styles from "./task-detail-modal.module.css";

interface TaskCreateModalProps {
  open: boolean;
  onClose: () => void;
}

export function TaskCreateModal({ open, onClose }: TaskCreateModalProps) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const titleRef = useRef<HTMLTextAreaElement | null>(null);
  const notesRef = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    setTitle("");
    setNotes("");
  }, [open]);

  useLayoutEffect(() => {
    if (!titleRef.current) return;
    titleRef.current.style.height = "auto";
    titleRef.current.style.height = `${titleRef.current.scrollHeight}px`;
  }, [title]);

  useLayoutEffect(() => {
    if (!notesRef.current) return;
    notesRef.current.style.height = "auto";
    notesRef.current.style.height = `${notesRef.current.scrollHeight}px`;
  }, [notes]);

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.sheet} aria-label="New task">
          <VisuallyHidden>
            <Dialog.Title>New task</Dialog.Title>
          </VisuallyHidden>
          <div className={styles.header}>
            <Dialog.Close className={styles.close} type="button">
              Close
            </Dialog.Close>
            <button type="button" className={styles.more}>
              More
            </button>
          </div>
          <div className={styles.content}>
            <textarea
              className={styles.titleInput}
              ref={titleRef}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Task title"
              rows={1}
              aria-label="Task title"
              style={{ resize: "none" }}
            />
            <textarea
              className={styles.notesInput}
              ref={notesRef}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Notes..."
              rows={2}
              aria-label="Task notes"
            />
            <div className={styles.meta}>
              <span className={styles.badge}>inbox</span>
              <span className={styles.metaText}>no project</span>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
