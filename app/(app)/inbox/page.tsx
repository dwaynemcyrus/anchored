"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useInboxTasks,
  useUpdateTaskStatus,
  useUpdateTaskLocation,
  useDeleteTask,
  useSetNowSlot,
} from "@/lib/hooks/use-tasks";
import styles from "./inbox.module.css";

export default function InboxPage() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState<"default" | "action" | "position">("default");

  // Fetch inbox tasks and projects
  const { data: tasks, isLoading } = useInboxTasks();

  // Mutations
  const updateTaskStatus = useUpdateTaskStatus();
  const updateTaskLocation = useUpdateTaskLocation();
  const deleteTask = useDeleteTask();
  const setNowSlot = useSetNowSlot();

  const isAnyProcessing =
    updateTaskStatus.isPending ||
    updateTaskLocation.isPending ||
    deleteTask.isPending ||
    setNowSlot.isPending;

  const orderedTasks = useMemo(
    () => (tasks ? [...tasks].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)) : []),
    [tasks]
  );
  const taskCount = orderedTasks.length;
  const currentTask = orderedTasks[currentIndex];

  useEffect(() => {
    if (!taskCount) {
      setCurrentIndex(0);
      return;
    }
    if (currentIndex >= taskCount) {
      setCurrentIndex(taskCount - 1);
    }
  }, [currentIndex, taskCount]);

  useEffect(() => {
    setMode("default");
  }, [currentTask?.id]);

  const handleAction = () => {
    if (!currentTask) return;
    setMode("action");
  };

  const handleThinking = () => {
    if (!currentTask) return;
    updateTaskLocation.mutate({ id: currentTask.id, task_location: "anytime" });
    setMode("default");
  };

  const handleKill = () => {
    if (!currentTask) return;
    deleteTask.mutate(currentTask.id);
    setMode("default");
  };

  const handleSingleAction = () => {
    if (!currentTask) return;
    setMode("position");
  };

  const handleProjectAction = () => {
    if (!currentTask) return;
    setMode("default");
    router.push("/projects/new");
  };

  const handleCommandNow = () => {
    if (!currentTask) return;
    setNowSlot.mutate({ taskId: currentTask.id, slot: "primary" });
    setMode("default");
  };

  const handlePutInNext = () => {
    if (!currentTask) return;
    updateTaskStatus.mutate({ id: currentTask.id, status: "active" });
    setMode("default");
  };

  const handleLater = () => {
    if (!currentTask) return;
    updateTaskLocation.mutate({ id: currentTask.id, task_location: "anytime" });
    setMode("default");
  };

  return (
    <div className={styles.review}>
      <div className="flex items-center justify-end">
        <Link href="/" className={styles.endReview}>
          End review
        </Link>
      </div>
      <div className={styles.rule} />
      <div className={styles.title}>INBOX — REVIEW</div>
      <div className={styles.rule} />

      {isLoading ? (
        <div className={styles.empty}>Loading inbox...</div>
      ) : taskCount === 0 ? (
        <div className={styles.empty}>Inbox empty.</div>
      ) : (
        <>
          <div className={styles.counter}>
            Item {currentIndex + 1} of {taskCount}
          </div>

          <div className={styles.prompt}>
            "{currentTask?.title}"
          </div>

          <div className={styles.rule} />

          {mode === "action" ? (
            <>
              <div className={styles.questionTitle}>ACTION</div>
              <div className={styles.rule} />
              <div className={styles.question}>
                Can this be done
                <br />
                in a single sitting?
              </div>
              <div className={styles.actionsStack}>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={handleSingleAction}
                  disabled={isAnyProcessing}
                >
                  YES — SINGLE ACTION
                </button>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={handleProjectAction}
                  disabled={isAnyProcessing}
                >
                  NO — PROJECT
                </button>
              </div>
            </>
          ) : mode === "position" ? (
            <>
              <div className={styles.questionTitle}>POSITION ACTION</div>
              <div className={styles.rule} />
              <div className={styles.question}>Where does this belong?</div>
              <div className={styles.actionsStack}>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={handleCommandNow}
                  disabled={isAnyProcessing}
                >
                  COMMAND NOW
                </button>
                <button
                  type="button"
                  className={`${styles.actionButton} ${styles.actionButtonDefault}`}
                  onClick={handlePutInNext}
                  disabled={isAnyProcessing}
                >
                  PUT IN NEXT
                </button>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={handleLater}
                  disabled={isAnyProcessing}
                >
                  LATER
                </button>
              </div>
            </>
          ) : (
            <>
              <div className={styles.question}>
                Is this something to do,
                <br />
                or something to think about?
              </div>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={handleAction}
                  disabled={isAnyProcessing}
                >
                  ACTION
                </button>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={handleThinking}
                  disabled={isAnyProcessing}
                >
                  THINKING
                </button>
              </div>
              <button
                type="button"
                className={`${styles.actionButton} ${styles.killButton}`}
                onClick={handleKill}
                disabled={isAnyProcessing}
              >
                KILL
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
