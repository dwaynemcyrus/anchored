"use client";

import { useSidebarStore } from "@/lib/stores/sidebar-store";
import styles from "./mobile-drawer.module.css";

export function FloatingMenuButton() {
  const { open, isOpen } = useSidebarStore();

  if (isOpen) {
    return null;
  }

  return (
    <div className={styles.floatingButtonWrapper}>
      <button
        type="button"
        className={styles.floatingButton}
        aria-label="Open menu"
        aria-expanded={isOpen}
        onClick={open}
      >
        <span className={styles.hamburger} aria-hidden="true">
          <span className={styles.hamburgerLine} />
          <span className={styles.hamburgerLine} />
          <span className={styles.hamburgerLine} />
        </span>
        <span className={styles.srOnly}>Open menu</span>
      </button>
    </div>
  );
}
