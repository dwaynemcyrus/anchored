"use client";

import { useEffect } from "react";
import { NewTaskCard } from "@/components/tasks/new-task-card";
import styles from "./capture-button.module.css";

interface CaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  isRapid: boolean;
  onToggleRapid: (next: boolean) => void;
}

export function CaptureModal({
  isOpen,
  onClose,
  isRapid,
  onToggleRapid,
}: CaptureModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleSaved = () => {
    if (!isRapid) {
      onClose();
    }
  };

  return (
    <div className={styles.modalRoot}>
      <div className={styles.overlay} onClick={onClose} />
      <div
        className={`${styles.modalContainer} ${styles.actionModalContainer}`}
        role="dialog"
        aria-modal="true"
        aria-label="Capture"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
      >
        <div className={styles.modal}>
          <div className={styles.modalHeader}>
            <span className={styles.modalTitle}>Capture</span>
            <button
              type="button"
              className={styles.closeButton}
              onClick={onClose}
            >
              Close
            </button>
          </div>
          <NewTaskCard
            onSaved={handleSaved}
            focusOnMount
            focusOnSave={isRapid}
            footerLeft={
              <div className={styles.rapidToggle}>
                <label className={styles.rapidToggleLabel}>
                  <span className={styles.rapidToggleText}>Rapid input</span>
                  <span className={styles.rapidSwitch}>
                    <input
                      type="checkbox"
                      className={styles.rapidSwitchInput}
                      checked={isRapid}
                      onChange={(event) => onToggleRapid(event.target.checked)}
                      aria-label="Rapid input"
                    />
                    <span className={styles.rapidSwitchTrack}>
                      <span className={styles.rapidSwitchThumb} />
                    </span>
                  </span>
                </label>
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
}
