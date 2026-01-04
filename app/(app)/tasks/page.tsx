"use client";

import { useEffect, useState } from "react";
import { TaskCreateModal } from "@/components/tasks/task-create-modal";
import { TaskList } from "@/components/tasks/task-list";
import { TaskOptionsMenu } from "@/components/tasks/task-options-menu";
import styles from "./page.module.css";

export default function TaskListPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const setAppHeight = () => {
      const height = window.visualViewport?.height ?? window.innerHeight;
      root.style.setProperty("--app-height", `${Math.round(height)}px`);
    };
    setAppHeight();
    window.addEventListener("resize", setAppHeight);
    window.visualViewport?.addEventListener("resize", setAppHeight);
    return () => {
      window.removeEventListener("resize", setAppHeight);
      window.visualViewport?.removeEventListener("resize", setAppHeight);
    };
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.title}>Tasks</div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.textButton}
            onClick={() => setIsCreateOpen(true)}
          >
            New
          </button>
          <TaskOptionsMenu />
        </div>
      </div>
      <div className={styles.scroll}>
        <TaskList />
      </div>
      <TaskCreateModal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  );
}
