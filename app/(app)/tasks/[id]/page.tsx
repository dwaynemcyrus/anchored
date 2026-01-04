"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { TaskCreateModal } from "@/components/tasks/task-create-modal";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";
import { TaskList } from "@/components/tasks/task-list";
import { TaskOptionsMenu } from "@/components/tasks/task-options-menu";
import styles from "../page.module.css";

export default function TaskDetailRoute() {
  const params = useParams();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const taskId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : null;

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
      {taskId ? <TaskDetailModal taskId={taskId} /> : null}
      <TaskCreateModal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  );
}
