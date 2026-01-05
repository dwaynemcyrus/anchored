"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useLayoutEffect, useRef, useState } from "react";
import styles from "./project-detail-modal.module.css";

interface ProjectDetailModalProps {
  open: boolean;
  mode: "create" | "edit";
  initialTitle?: string;
  initialOutcome?: string | null;
  initialPurpose?: string | null;
  initialDescription?: string | null;
  onClose: () => void;
  onSave: (values: {
    title: string;
    outcome: string;
    purpose: string;
    description: string | null;
  }) => Promise<void>;
  isSaving?: boolean;
}

export function ProjectDetailModal({
  open,
  mode,
  initialTitle = "",
  initialOutcome = "",
  initialPurpose = "",
  initialDescription = "",
  onClose,
  onSave,
  isSaving = false,
}: ProjectDetailModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [outcome, setOutcome] = useState(initialOutcome || "");
  const [purpose, setPurpose] = useState(initialPurpose || "");
  const [description, setDescription] = useState(initialDescription || "");
  const titleRef = useRef<HTMLTextAreaElement | null>(null);
  const outcomeRef = useRef<HTMLTextAreaElement | null>(null);
  const purposeRef = useRef<HTMLTextAreaElement | null>(null);
  const notesRef = useRef<HTMLTextAreaElement | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setTitle(initialTitle);
      setOutcome(initialOutcome || "");
      setPurpose(initialPurpose || "");
      setDescription(initialDescription || "");
      return;
    }
    onClose();
  };

  useLayoutEffect(() => {
    if (!titleRef.current) return;
    titleRef.current.style.height = "auto";
    titleRef.current.style.height = `${titleRef.current.scrollHeight}px`;
  }, [title]);

  useLayoutEffect(() => {
    if (!outcomeRef.current) return;
    outcomeRef.current.style.height = "auto";
    outcomeRef.current.style.height = `${outcomeRef.current.scrollHeight}px`;
  }, [outcome]);

  useLayoutEffect(() => {
    if (!purposeRef.current) return;
    purposeRef.current.style.height = "auto";
    purposeRef.current.style.height = `${purposeRef.current.scrollHeight}px`;
  }, [purpose]);

  useLayoutEffect(() => {
    if (!notesRef.current) return;
    notesRef.current.style.height = "auto";
    notesRef.current.style.height = `${notesRef.current.scrollHeight}px`;
  }, [description]);

  const handleSave = async () => {
    const nextTitle = title.trim();
    const nextOutcome = outcome.trim();
    const nextPurpose = purpose.trim();
    if (!nextTitle || !nextOutcome || !nextPurpose || isSaving) return;
    await onSave({
      title: nextTitle,
      outcome: nextOutcome,
      purpose: nextPurpose,
      description: description.trim() ? description.trim() : null,
    });
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
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
              disabled={isSaving || !title.trim() || !outcome.trim() || !purpose.trim()}
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
              ref={outcomeRef}
              className={styles.notesInput}
              value={outcome}
              onChange={(event) => setOutcome(event.target.value)}
              placeholder="Outcome"
              rows={2}
              aria-label="Project outcome"
              style={{ resize: "none" }}
            />
            <textarea
              ref={purposeRef}
              className={styles.notesInput}
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              placeholder="Purpose"
              rows={2}
              aria-label="Project purpose"
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
