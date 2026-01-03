"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useTasks, useToggleTaskComplete } from "@/lib/hooks/use-tasks";
import styles from "./task-list.module.css";

export function TaskList() {
  const { data: tasks, isLoading, error } = useTasks();
  const toggleComplete = useToggleTaskComplete();
  const params = useParams();
  const selectedId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : null;

  if (isLoading) {
    return <div className={styles.state}>Loading tasks...</div>;
  }

  if (error) {
    return <div className={styles.state}>Failed to load tasks.</div>;
  }

  if (!tasks || tasks.length === 0) {
    return <div className={styles.state}>No tasks yet.</div>;
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Tasks</h1>
      <ul className={styles.list}>
        {tasks.map((task) => (
          <li key={task.id}>
            <Link
              href={`/tasks/${task.id}`}
              className={
                task.id === selectedId
                  ? `${styles.item} ${styles.itemActive}`
                  : styles.item
              }
            >
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={task.status === "done"}
                onChange={(event) => {
                  event.preventDefault();
                  toggleComplete.mutate(task);
                }}
                onClick={(event) => event.stopPropagation()}
              />
              <span
                className={
                  task.status === "done" ? styles.titleDone : styles.titleText
                }
              >
                {task.title}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
