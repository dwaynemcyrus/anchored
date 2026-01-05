"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { TaskWithDetails } from "@/lib/hooks/use-tasks";
import { useTasks, useToggleTaskComplete } from "@/lib/hooks/use-tasks";
import styles from "./task-list.module.css";

interface TaskListProps {
  tasks?: TaskWithDetails[];
  isLoading?: boolean;
  error?: Error | null;
  onToggleComplete?: (task: TaskWithDetails) => void;
  selectedId?: string | null;
  emptyText?: string;
  linkBase?: string;
  linkSuffix?: string;
}

export function TaskList({
  tasks,
  isLoading,
  error,
  onToggleComplete,
  selectedId,
  emptyText = "No tasks yet.",
  linkBase = "/tasks",
  linkSuffix = "",
}: TaskListProps = {}) {
  const { data: fetchedTasks, isLoading: isFetching, error: fetchError } = useTasks();
  const toggleComplete = useToggleTaskComplete();
  const params = useParams();
  const resolvedSelectedId =
    selectedId ??
    (typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : null);
  const resolvedTasks = tasks ?? fetchedTasks;
  const resolvedLoading = isLoading ?? isFetching;
  const resolvedError = error ?? fetchError;
  const handleToggleComplete = onToggleComplete ?? toggleComplete.mutate;

  if (resolvedLoading) {
    return <div className={styles.state}>Loading tasks...</div>;
  }

  if (resolvedError) {
    return <div className={styles.state}>Failed to load tasks.</div>;
  }

  if (!resolvedTasks || resolvedTasks.length === 0) {
    return <div className={styles.state}>{emptyText}</div>;
  }

  return (
    <ul className={styles.list}>
      {resolvedTasks.map((task) => (
        <li key={task.id}>
          <Link
            href={`${linkBase}/${task.id}${linkSuffix}`}
            className={
              task.id === resolvedSelectedId
                ? `${styles.item} ${styles.itemActive}`
                : styles.item
            }
          >
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={task.status === "done" || task.status === "cancel"}
              onChange={(event) => {
                event.preventDefault();
                handleToggleComplete(task);
              }}
              onClick={(event) => event.stopPropagation()}
            />
            <span
              className={
                task.status === "done" || task.status === "cancel"
                  ? styles.titleDone
                  : styles.titleText
              }
            >
              {task.title}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
