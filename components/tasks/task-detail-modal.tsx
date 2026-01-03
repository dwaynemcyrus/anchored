"use client";

import { format } from "date-fns";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  useDeleteTask,
  useTask,
  useUpdateTask,
} from "@/lib/hooks/use-tasks";
import { useCreateProject } from "@/lib/hooks/use-projects";
import styles from "./task-detail-modal.module.css";

interface TaskDetailModalProps {
  taskId: string;
}

export function TaskDetailModal({ taskId }: TaskDetailModalProps) {
  const router = useRouter();
  const { data: task, isLoading, error } = useTask(taskId);
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const createProject = useCreateProject();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const titleRef = useRef<HTMLTextAreaElement | null>(null);
  const notesRef = useRef<HTMLTextAreaElement | null>(null);

  const closeSheet = () => {
    router.push("/tasks");
  };

  useEffect(() => {
    setTitle(task?.title ?? "");
    setNotes(task?.notes ?? "");
  }, [task?.title, task?.notes]);

  useLayoutEffect(() => {
    if (!titleRef.current) return;
    titleRef.current.style.height = "auto";
    titleRef.current.style.height = `${titleRef.current.scrollHeight}px`;
  }, [title]);
  useLayoutEffect(() => {
    if (!notesRef.current) return;
    notesRef.current.style.height = "auto";
    notesRef.current.style.height = `${notesRef.current.scrollHeight}px`;
  }, [notes]);

  const commitTitle = async () => {
    const nextTitle = title.trim();
    if (!task || !nextTitle || nextTitle === task.title) return;
    await updateTask.mutateAsync({ id: task.id, title: nextTitle });
  };

  const commitNotes = async () => {
    if (!task) return;
    const nextNotes = notes.trim();
    const currentNotes = task.notes?.trim() ?? "";
    if (nextNotes === currentNotes) return;
    await updateTask.mutateAsync({
      id: task.id,
      notes: nextNotes.length > 0 ? nextNotes : null,
    });
  };

  const handleDelete = async () => {
    if (!task) return;
    await deleteTask.mutateAsync(task.id);
    closeSheet();
  };

  const handleWontDo = async () => {
    if (!task) return;
    await updateTask.mutateAsync({ id: task.id, status: "done" });
  };

  const handlePinToTop = async () => {
    if (!task) return;
    await updateTask.mutateAsync({ id: task.id, sort_order: -1 });
  };

  const handleConvertToProject = async () => {
    if (!task) return;
    const project = await createProject.mutateAsync({
      title: task.title,
      description: task.notes ?? null,
      status: "active",
    });
    await updateTask.mutateAsync({
      id: task.id,
      project_id: project.id,
      task_location: "project",
    });
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && closeSheet()}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.sheet} aria-label="Task details">
          <VisuallyHidden>
            <Dialog.Title>{task?.title ?? "Task details"}</Dialog.Title>
          </VisuallyHidden>
          <div className={styles.header}>
            <Dialog.Close className={styles.close} type="button">
              Close
            </Dialog.Close>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button type="button" className={styles.more}>
                  More
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className={styles.menuContent}
                  align="end"
                  sideOffset={6}
                >
                  <DropdownMenu.Item
                    className={styles.menuItem}
                    onSelect={handleDelete}
                  >
                    Delete
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className={styles.menuItem}
                    onSelect={handleWontDo}
                  >
                    Wont do
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className={styles.menuItem}
                    onSelect={handlePinToTop}
                  >
                    Pin to top
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className={styles.menuItem}
                    onSelect={handleConvertToProject}
                  >
                    Convert to project
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
          {isLoading && <div className={styles.state}>Loading task…</div>}
          {error && <div className={styles.state}>Failed to load task.</div>}

          {!isLoading && !error && task && (
            <div className={styles.content}>
              <textarea
                className={styles.titleInput}
                ref={titleRef}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onBlur={commitTitle}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitTitle();
                  }
                }}
                aria-label="Task title"
                rows={1}
                style={{ resize: "none" }}
              />
              <textarea
                className={styles.notesInput}
                ref={notesRef}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                onBlur={commitNotes}
                placeholder="Notes..."
                rows={2}
                aria-label="Task notes"
              />
              <div className={styles.meta}>
                <span className={styles.badge}>{task.status}</span>
                {task.project?.title && (
                  <span className={styles.metaText}>{task.project.title}</span>
                )}
              </div>
              {task.due_date && (
                <div className={styles.metaText}>
                  Due {format(new Date(task.due_date), "MMM d, yyyy")}
                </div>
              )}
            </div>
          )}

          {!isLoading && !error && !task && (
            <div className={styles.state}>Task not found.</div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
