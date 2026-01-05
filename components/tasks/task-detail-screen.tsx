"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { format } from "date-fns";
import { useTask, useUpdateTask, useDeleteTask, useCreateTask } from "@/lib/hooks/use-tasks";
import { useCreateProject, useProject } from "@/lib/hooks/use-projects";
import pageStyles from "@/app/(app)/tasks/page.module.css";
import styles from "./task-detail-screen.module.css";

interface TaskDetailScreenProps {
  mode: "create" | "edit";
  taskId?: string;
  projectId?: string | null;
  returnTo?: string | null;
}

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
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const createProject = useCreateProject();

  const handleDismiss = useCallback(() => {
    if (returnTo) {
      router.push(returnTo);
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
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
        status: "inbox",
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

  const handleWontDo = async () => {
    if (!task) return;
    await updateTask.mutateAsync({ id: task.id, status: "cancel" });
    handleDismiss();
  };

  const handlePinToTop = async () => {
    if (!task) return;
    await updateTask.mutateAsync({ id: task.id, sort_order: -1 });
  };

  const handleConvertToProject = async () => {
    if (!task) return;
    const projectResult = await createProject.mutateAsync({
      title: task.title,
      outcome: task.title,
      purpose: "Converted from task",
      description: task.notes ?? null,
      status: "backlog",
    });
    await updateTask.mutateAsync({
      id: task.id,
      project_id: projectResult.id,
      task_location: "project",
    });
  };

  const projectLabel = project?.title || task?.project?.title || "no project";
  const statusLabel = task?.status ?? "inbox";

  let content = (
    <div className={styles.content}>
      <textarea
        key={task?.id ?? "new-title"}
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
        key={task?.id ?? "new-notes"}
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
                  <DropdownMenu.Item className={styles.menuItem} onSelect={handleWontDo}>
                    Wont do
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className={styles.menuItem} onSelect={handlePinToTop}>
                    Pin to top
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className={styles.menuItem} onSelect={handleConvertToProject}>
                    Convert to project
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
    </div>
  );
}
