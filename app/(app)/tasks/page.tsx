"use client";

import { useRouter } from "next/navigation";
import { TaskList } from "@/components/tasks/task-list";
import { TaskOptionsMenu } from "@/components/tasks/task-options-menu";
import styles from "./page.module.css";

export default function TaskListPage() {
  const router = useRouter();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.title}>Tasks</div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.textButton}
            onClick={() => router.push("/tasks/new")}
          >
            New
          </button>
          <TaskOptionsMenu />
        </div>
      </div>
      <div className={styles.scroll}>
        <TaskList />
      </div>
    </div>
  );
}
