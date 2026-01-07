"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { format } from "date-fns";
import { useTask, useUpdateTask, useDeleteTask, useCreateTask, useTasksByProject } from "@/lib/hooks/use-tasks";
import { TaskStatus } from "@/types/database";
import { useProject } from "@/lib/hooks/use-projects";
import pageStyles from "@/app/(app)/tasks/page.module.css";
import styles from "./task-detail-screen.module.css";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TaskDetailScreenProps {
  mode: "create" | "edit";
  taskId?: string;
  projectId?: string | null;
  returnTo?: string | null;
}

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "backlog", label: "Backlog" },
  { value: "active", label: "Active" },
  { value: "anytime", label: "Anytime" },
  { value: "waiting", label: "Waiting" },
  { value: "done", label: "Complete" },
  { value: "cancel", label: "Cancel" },
];

export function TaskDetailScreen({
  mode,
  taskId,
  projectId,
  returnTo,
}: TaskDetailScreenProps) {
  const router = useRouter();
  const titleRef = useRef<HTMLTextAreaElement | null>(null);
  const notesRef = useRef<HTMLTextAreaElement | null>(null);

  const { data: task, isLoading, error } = useTask(taskId ?? "");
  const resolvedProjectId = projectId ?? task?.project_id ?? null;
  const { data: project } = useProject(resolvedProjectId ?? "");
  const { data: projectTasks } = useTasksByProject(resolvedProjectId ?? "");
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [isMarkNextOpen, setIsMarkNextOpen] = useState(false);

  const handleDismiss = useCallback(() => {
    const shouldUseReturnTo =
      typeof returnTo === "string" && returnTo.includes("view=overview");
    if (shouldUseReturnTo) {
      router.replace(returnTo);
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    if (returnTo) {
      router.replace(returnTo);
      return;
    }
    router.push("/tasks");
  }, [returnTo, router]);

  const resizeTextarea = (element: HTMLTextAreaElement | null) => {
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  };

  useEffect(() => {
    resizeTextarea(titleRef.current);
    resizeTextarea(notesRef.current);
  }, [task?.title, task?.notes]);

  const commitTitle = async () => {
    if (mode !== "edit" || !task || !titleRef.current) return;
    const nextTitle = titleRef.current.value.trim();
    if (!nextTitle || nextTitle === task.title) return;
    await updateTask.mutateAsync({ id: task.id, title: nextTitle });
  };

  const commitNotes = async () => {
    if (mode !== "edit" || !task || !notesRef.current) return;
    const nextNotes = notesRef.current.value.trim();
    const currentNotes = task.notes?.trim() ?? "";
    if (nextNotes === currentNotes) return;
    await updateTask.mutateAsync({
      id: task.id,
      notes: nextNotes.length > 0 ? nextNotes : null,
    });
  };

  const handleSave = async () => {
    const title = titleRef.current?.value.trim() ?? "";
    const notes = notesRef.current?.value.trim() ?? "";
    if (!title) return;

    if (mode === "edit" && task) {
      await updateTask.mutateAsync({
        id: task.id,
        title,
        notes: notes.length > 0 ? notes : null,
      });
    }

    if (mode === "create") {
      await createTask.mutateAsync({
        title,
        notes: notes.length > 0 ? notes : null,
        status: resolvedProjectId ? "backlog" : "pending",
        task_location: resolvedProjectId ? "project" : "inbox",
        project_id: resolvedProjectId ?? null,
        due_date: null,
        start_date: null,
      });
    }

    handleDismiss();
  };

  const handleDelete = async () => {
    if (!task) return;
    await deleteTask.mutateAsync(task.id);
    handleDismiss();
  };

  const currentNextTask =
    projectTasks?.find((projectTask) => projectTask.next_task) || null;

  const projectLabel = project?.title || task?.project?.title || "no project";
  const statusLabel = task?.status ?? (resolvedProjectId ? "backlog" : "pending");

  let content = (
    <div className={styles.content}>
      <textarea
        key={task?.id ? `${task.id}-title` : "new-title"}
        className={styles.titleInput}
        ref={titleRef}
        defaultValue={task?.title ?? ""}
        placeholder="Task title"
        rows={1}
        aria-label="Task title"
        style={{ resize: "none" }}
        onBlur={commitTitle}
        onInput={() => resizeTextarea(titleRef.current)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commitTitle();
          }
        }}
      />
      <textarea
        key={task?.id ? `${task.id}-notes` : "new-notes"}
        className={styles.notesInput}
        ref={notesRef}
        defaultValue={task?.notes ?? ""}
        placeholder="Notes..."
        rows={2}
        aria-label="Task notes"
        onBlur={commitNotes}
        onInput={() => resizeTextarea(notesRef.current)}
      />
      <div className={styles.metaRow}>
        <div className={styles.meta}>
          <span className={styles.badge}>{statusLabel}</span>
          <span className={styles.metaText}>{projectLabel}</span>
        </div>
        <button
          type="button"
          className={styles.saveButton}
          onClick={handleSave}
          disabled={createTask.isPending || updateTask.isPending}
        >
          Save
        </button>
      </div>
      {task?.due_date && (
        <div className={styles.metaText}>
          Due {format(new Date(task.due_date), "MMM d, yyyy")}
        </div>
      )}
    </div>
  );

  if (mode === "edit" && isLoading) {
    content = <div className={styles.state}>Loading task…</div>;
  }

  if (mode === "edit" && error) {
    content = <div className={styles.state}>Failed to load task.</div>;
  }

  if (mode === "edit" && !task && !isLoading && !error) {
    content = <div className={styles.state}>Task not found.</div>;
  }

  return (
    <div className={pageStyles.page}>
      <div className={pageStyles.header}>
        <div className={pageStyles.headerLeft}>
          <button type="button" className={pageStyles.textButton} onClick={handleDismiss}>
            Back
          </button>
        </div>
        <div className={pageStyles.actions}>
          {task ? (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button type="button" className={pageStyles.textButton}>
                  Status
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className={styles.menuContent}
                  align="end"
                  sideOffset={6}
                >
                  {statusOptions.map((option) => (
                    <DropdownMenu.Item
                      key={option.value}
                      className={styles.menuItem}
                      onSelect={() => {
                        if (!task || task.status === option.value) return;
                        updateTask.mutateAsync({ id: task.id, status: option.value });
                      }}
                    >
                      {option.label}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          ) : (
            <button type="button" className={pageStyles.textButton} disabled>
              Status
            </button>
          )}
          <button type="button" className={pageStyles.textButton}>
            Info
          </button>
          {task ? (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button type="button" className={pageStyles.textButton}>
                  More
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className={styles.menuContent}
                  align="end"
                  sideOffset={6}
                >
                  <DropdownMenu.Item className={styles.menuItem} onSelect={handleDelete}>
                    Delete
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className={styles.menuItem}
                    onSelect={() => {
                      if (!resolvedProjectId) return;
                      setIsMarkNextOpen(true);
                    }}
                    disabled={!resolvedProjectId}
                  >
                    Mark next
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          ) : (
            <button type="button" className={pageStyles.textButton} disabled>
              More
            </button>
          )}
        </div>
      </div>

      <div className={pageStyles.scroll}>{content}</div>
      <AlertDialog open={isMarkNextOpen} onOpenChange={setIsMarkNextOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as next?</AlertDialogTitle>
            <AlertDialogDescription>
              {currentNextTask && currentNextTask.id !== task?.id
                ? `This will replace "${currentNextTask.title}" as the current next task.`
                : "This will set this task as the next task for this project."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!task || !resolvedProjectId) return;
                if (currentNextTask && currentNextTask.id !== task.id) {
                  await updateTask.mutateAsync({
                    id: currentNextTask.id,
                    next_task: false,
                  });
                }
                await updateTask.mutateAsync({ id: task.id, next_task: true });
                setIsMarkNextOpen(false);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
