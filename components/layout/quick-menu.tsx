"use client";

import { useEffect, useState } from "react";
import { NewTaskCard } from "@/components/tasks/new-task-card";
import styles from "./quick-menu.module.css";

export function QuickMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNewActionOpen, setIsNewActionOpen] = useState(false);

  useEffect(() => {
    if (!isMenuOpen && !isNewActionOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        setIsNewActionOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen, isNewActionOpen]);

  const handleOpenNewAction = () => {
    setIsMenuOpen(false);
    setIsNewActionOpen(true);
  };

  const handleCloseAll = () => {
    setIsMenuOpen(false);
    setIsNewActionOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className={styles.quickMenuButton}
        onClick={() => setIsMenuOpen((open) => !open)}
      >
        Quick Menu
      </button>

      {isMenuOpen && (
        <div className={styles.modalRoot}>
          <div className={styles.overlay} onClick={handleCloseAll} />
          <div
            className={`${styles.modalContainer} ${styles.menuModalContainer}`}
            role="dialog"
            aria-modal="true"
            aria-label="Quick Menu"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                handleCloseAll();
              }
            }}
          >
            <div className={styles.modal}>
              <div className={styles.modalHeader}>
                <span className={styles.modalTitle}>Quick Menu</span>
                <button
                  type="button"
                  className={styles.closeButton}
                  onClick={handleCloseAll}
                >
                  Close
                </button>
              </div>
              <div className={styles.menuList}>
                <button
                  type="button"
                  className={styles.menuItem}
                  onClick={handleOpenNewAction}
                >
                  <div className={styles.menuTitle}>New Action</div>
                  <div className={styles.menuSubtext}>
                    Quickly add an action to your inbox.
                  </div>
                </button>
                <button type="button" className={styles.menuItem}>
                  <div className={styles.menuTitle}>New Project</div>
                  <div className={styles.menuSubtext}>
                    Define a clear SMART goal, then break it down.
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isNewActionOpen && (
        <div className={styles.modalRoot}>
          <div className={styles.overlay} onClick={handleCloseAll} />
          <div
            className={`${styles.modalContainer} ${styles.actionModalContainer}`}
            role="dialog"
            aria-modal="true"
            aria-label="New Action"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                handleCloseAll();
              }
            }}
          >
            <div className={styles.modal}>
              <div className={styles.modalHeader}>
                <span className={styles.modalTitle}>New Action</span>
                <button
                  type="button"
                  className={styles.closeButton}
                  onClick={handleCloseAll}
                >
                  Close
                </button>
              </div>
              <NewTaskCard onSaved={handleCloseAll} focusOnMount />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
