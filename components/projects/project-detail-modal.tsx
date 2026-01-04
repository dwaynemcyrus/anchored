"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import styles from "./project-detail-modal.module.css";

interface ProjectDetailModalProps {
  open: boolean;
  mode: "create" | "edit";
  initialTitle?: string;
  initialDescription?: string | null;
  onClose: () => void;
  onSave: (values: { title: string; description: string | null }) => Promise<void>;
  isSaving?: boolean;
}

export function ProjectDetailModal({
  open,
  mode,
  initialTitle = "",
  initialDescription = "",
  onClose,
  onSave,
  isSaving = false,
}: ProjectDetailModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription || "");
  const titleRef = useRef<HTMLTextAreaElement | null>(null);
  const notesRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(initialTitle);
    setDescription(initialDescription || "");
  }, [open, initialTitle, initialDescription]);

  useLayoutEffect(() => {
    if (!titleRef.current) return;
    titleRef.current.style.height = "auto";
    titleRef.current.style.height = `${titleRef.current.scrollHeight}px`;
  }, [title]);

  useLayoutEffect(() => {
    if (!notesRef.current) return;
    notesRef.current.style.height = "auto";
    notesRef.current.style.height = `${notesRef.current.scrollHeight}px`;
  }, [description]);

  const handleSave = async () => {
    const nextTitle = title.trim();
    if (!nextTitle || isSaving) return;
    await onSave({
      title: nextTitle,
      description: description.trim() ? description.trim() : null,
    });
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.sheet} aria-label="Project details">
          <VisuallyHidden>
            <Dialog.Title>
              {mode === "create" ? "New Project" : "Edit Project"}
            </Dialog.Title>
          </VisuallyHidden>
          <div className={styles.header}>
            <Dialog.Close className={styles.close} type="button">
              Close
            </Dialog.Close>
            <button
              type="button"
              className={styles.save}
              onClick={handleSave}
              disabled={isSaving || !title.trim()}
            >
              {mode === "create" ? "Save" : "Save"}
            </button>
          </div>
          <div className={styles.content}>
            <textarea
              ref={titleRef}
              className={styles.titleInput}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Project title"
              rows={1}
              aria-label="Project title"
              style={{ resize: "none" }}
            />
            <textarea
              ref={notesRef}
              className={styles.notesInput}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Notes..."
              rows={2}
              aria-label="Project notes"
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
