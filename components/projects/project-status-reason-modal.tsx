"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useLayoutEffect, useRef, useState } from "react";
import styles from "./project-detail-modal.module.css";

interface ProjectStatusReasonModalProps {
  open: boolean;
  statusLabel: string;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
  isSaving?: boolean;
}

export function ProjectStatusReasonModal({
  open,
  statusLabel,
  onClose,
  onSubmit,
  isSaving = false,
}: ProjectStatusReasonModalProps) {
  const [reason, setReason] = useState("");
  const reasonRef = useRef<HTMLTextAreaElement | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setReason("");
      return;
    }
    onClose();
  };

  useLayoutEffect(() => {
    if (!reasonRef.current) return;
    reasonRef.current.style.height = "auto";
    reasonRef.current.style.height = `${reasonRef.current.scrollHeight}px`;
  }, [reason]);

  const handleSubmit = async () => {
    const trimmed = reason.trim();
    if (!trimmed || isSaving) return;
    await onSubmit(trimmed);
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.sheet} aria-label="Project status reason">
          <VisuallyHidden>
            <Dialog.Title>Reason for {statusLabel}</Dialog.Title>
          </VisuallyHidden>
          <div className={styles.header}>
            <Dialog.Close className={styles.close} type="button">
              Close
            </Dialog.Close>
            <button
              type="button"
              className={styles.save}
              onClick={handleSubmit}
              disabled={isSaving || !reason.trim()}
            >
              Submit
            </button>
          </div>
          <div className={styles.content}>
            <textarea
              ref={reasonRef}
              className={styles.notesInput}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={`Reason for ${statusLabel.toLowerCase()}...`}
              rows={2}
              aria-label="Reason"
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
