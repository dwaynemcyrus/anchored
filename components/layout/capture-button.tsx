"use client";

import { useState } from "react";
import { CaptureModal } from "./capture-modal";
import styles from "./capture-button.module.css";

export function CaptureButton() {
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [isRapid, setIsRapid] = useState(false);

  return (
    <>
      <button
        type="button"
        className={styles.captureButton}
        onClick={() => setIsCaptureOpen((open) => !open)}
      >
        Capture
      </button>

      <CaptureModal
        isOpen={isCaptureOpen}
        onClose={() => setIsCaptureOpen(false)}
        isRapid={isRapid}
        onToggleRapid={setIsRapid}
      />
    </>
  );
}
