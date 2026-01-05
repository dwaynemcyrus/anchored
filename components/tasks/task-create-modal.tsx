"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useLayoutEffect, useRef, useState } from "react";
import { useCreateTask } from "@/lib/hooks/use-tasks";
import styles from "./task-detail-modal.module.css";

interface TaskCreateModalProps {
  open: boolean;
  onClose: () => void;
}

export function TaskCreateModal({ open, onClose }: TaskCreateModalProps) {
  const createTask = useCreateTask();
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

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || createTask.isPending) return;
    await createTask.mutateAsync({
      title: trimmedTitle,
      notes: notes.trim() ? notes.trim() : null,
      status: "backlog",
      task_location: "inbox",
      project_id: null,
      due_date: null,
      start_date: null,
    });
    onClose();
  };

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
            <div className={styles.metaRow}>
              <div className={styles.meta}>
                <span className={styles.badge}>backlog</span>
                <span className={styles.metaText}>no project</span>
              </div>
              <button
                type="button"
                className={styles.saveButton}
                onClick={handleSave}
                disabled={createTask.isPending || !title.trim()}
              >
                Save
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
