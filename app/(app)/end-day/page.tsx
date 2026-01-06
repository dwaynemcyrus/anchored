"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./end-day.module.css";
import {
  useAnytimeTasks,
  useDeleteTask,
  useInboxTasks,
  useNextTasks,
  useTasks,
  useUpdateTask,
  useUpdateTaskStatus,
  type TaskWithDetails,
} from "@/lib/hooks/use-tasks";

type ReviewScreen = 0 | 1 | 2 | 3 | 4;

function sortByOrder(a: TaskWithDetails, b: TaskWithDetails) {
  return (a.sort_order || 0) - (b.sort_order || 0);
}

export default function EndDayPage() {
  const router = useRouter();
  const [screen, setScreen] = useState<ReviewScreen>(0);
  const [todayIndex, setTodayIndex] = useState(0);
  const [inboxIndex, setInboxIndex] = useState(0);
  const [selectedNextIds, setSelectedNextIds] = useState<string[]>([]);
  const [flagSelections, setFlagSelections] = useState<string[]>([]);
  const [flaggingCompleted, setFlaggingCompleted] = useState(false);
  const [isFlagging, setIsFlagging] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const { data: todayTasks, isLoading: todayLoading } = useTasks({
    status: "active",
  });
  const { data: inboxTasks, isLoading: inboxLoading } = useInboxTasks();
  const { data: anytimeTasks, isLoading: anytimeLoading } = useAnytimeTasks();
  const { data: nextTasks, isLoading: nextLoading } = useNextTasks();

  const updateTask = useUpdateTask();
  const updateTaskStatus = useUpdateTaskStatus();
  const deleteTask = useDeleteTask();

  const orderedTodayTasks = useMemo(() => {
    return (todayTasks || [])
      .filter((task) => task.status === "active" && !task.now_slot)
      .sort(sortByOrder);
  }, [todayTasks]);

  const orderedInboxTasks = useMemo(
    () =>
      (inboxTasks || [])
        .filter((task) => task.task_location === "inbox")
        .sort(sortByOrder),
    [inboxTasks]
  );

  const orderedNextTasks = useMemo(
    () =>
      (nextTasks || [])
        .filter((task) => task.next_task)
        .sort(sortByOrder),
    [nextTasks]
  );

  const flaggableAnytimeTasks = useMemo(
    () =>
      (anytimeTasks || [])
        .filter((task) => task.task_location === "anytime" && !task.next_task)
        .sort(sortByOrder),
    [anytimeTasks]
  );

  const todayCount = orderedTodayTasks.length;
  const inboxCount = orderedInboxTasks.length;
  const nextCount = orderedNextTasks.length;
  const currentTodayTask = orderedTodayTasks[todayIndex];
  const currentInboxTask = orderedInboxTasks[inboxIndex];

  const reservedNow =
    todayTasks?.filter(
      (task) => task.now_slot === "primary" || task.now_slot === "secondary"
    ).length || 0;
  const alreadySelectedTodayCount = orderedTodayTasks.length;
  const remainingSlots = Math.max(0, 5 - reservedNow - alreadySelectedTodayCount);

  const isProcessing =
    updateTask.isPending ||
    updateTaskStatus.isPending ||
    deleteTask.isPending ||
    isFlagging ||
    isConfirming;

  useEffect(() => {
    if (!todayCount) {
      setTodayIndex(0);
      return;
    }
    if (todayIndex >= todayCount) {
      setTodayIndex(todayCount - 1);
    }
  }, [todayIndex, todayCount]);

  useEffect(() => {
    if (!inboxCount) {
      setInboxIndex(0);
      return;
    }
    if (inboxIndex >= inboxCount) {
      setInboxIndex(inboxCount - 1);
    }
  }, [inboxIndex, inboxCount]);

  useEffect(() => {
    if (screen === 1) {
      setTodayIndex(0);
    }
    if (screen === 2) {
      setInboxIndex(0);
    }
    if (screen !== 3) {
      setSelectedNextIds([]);
      setFlagSelections([]);
      setFlaggingCompleted(false);
    }
  }, [screen]);

  useEffect(() => {
    if (screen === 1 && !todayLoading && todayCount === 0) {
      setScreen(2);
    }
  }, [screen, todayLoading, todayCount]);

  useEffect(() => {
    if (screen === 2 && !inboxLoading && inboxCount === 0) {
      setScreen(3);
    }
  }, [screen, inboxLoading, inboxCount]);

  const handleNext = (task: TaskWithDetails) => {
    updateTask.mutate({
      id: task.id,
      status: "anytime",
      task_location: "anytime",
      next_task: true,
    });
  };

  const handleLater = (task: TaskWithDetails) => {
    updateTask.mutate({
      id: task.id,
      status: "anytime",
      task_location: "anytime",
      next_task: false,
    });
  };

  const handleDone = (task: TaskWithDetails) => {
    updateTaskStatus.mutate({ id: task.id, status: "done" });
  };

  const handleDelete = (task: TaskWithDetails) => {
    deleteTask.mutate(task.id);
  };

  const toggleSelection = (taskId: string) => {
    setSelectedNextIds((prev) => {
      if (prev.includes(taskId)) {
        return prev.filter((id) => id !== taskId);
      }
      if (prev.length >= remainingSlots) {
        return prev;
      }
      return [...prev, taskId];
    });
  };

  const toggleFlagSelection = (taskId: string) => {
    setFlagSelections((prev) => {
      if (prev.includes(taskId)) {
        return prev.filter((id) => id !== taskId);
      }
      return [...prev, taskId];
    });
  };

  const handleConfirmNext = async () => {
    if (isConfirming) return;
    setIsConfirming(true);
    try {
      await Promise.all(
        selectedNextIds.map((id) =>
          updateTask.mutateAsync({ id, status: "active", next_task: false })
        )
      );
      setSelectedNextIds([]);
      setScreen(4);
    } catch (error) {
      console.error("Failed to confirm next tasks:", error);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleFlagForNext = async () => {
    if (isFlagging) return;
    setIsFlagging(true);
    try {
      await Promise.all(
        flagSelections.map((id) =>
          updateTask.mutateAsync({
            id,
            status: "anytime",
            task_location: "anytime",
            next_task: true,
          })
        )
      );
      setFlagSelections([]);
      setFlaggingCompleted(true);
    } catch (error) {
      console.error("Failed to flag next tasks:", error);
    } finally {
      setIsFlagging(false);
    }
  };

  const showFlaggingList =
    screen === 3 && !nextLoading && nextCount === 0 && !flaggingCompleted;

  return (
    <div className={styles.wrapper}>
      <div className={styles.review}>
      {screen === 0 && (
        <>
          <div className={styles.rule} />
          <div className={styles.title}>END REVIEW</div>
          <div className={styles.rule} />
          <div className={styles.prompt}>End-of-day review.</div>
          <div className={styles.rule} />
          <div className={styles.actionsStack}>
            <button
              type="button"
              className={styles.actionButton}
              onClick={() => setScreen(1)}
              disabled={isProcessing}
            >
              Continue
            </button>
          </div>
        </>
      )}

      {screen === 1 && (
        <>
          <div className={styles.rule} />
          <div className={styles.title}>END REVIEW — TODAY</div>
          <div className={styles.rule} />

          {todayLoading ? (
            <div className={styles.empty}>Loading today...</div>
          ) : todayCount === 0 ? (
            <div className={styles.empty}>Today is clear.</div>
          ) : (
            <>
              <div className={styles.counter}>
                Item {todayIndex + 1} of {todayCount}
              </div>
              <div className={styles.prompt}>&quot;{currentTodayTask?.title}&quot;</div>
              <div className={styles.rule} />
              <div className={styles.questionTitle}>Choose outcome</div>
              <div className={styles.rule} />
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => currentTodayTask && handleDone(currentTodayTask)}
                  disabled={isProcessing}
                >
                  Done
                </button>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => currentTodayTask && handleDelete(currentTodayTask)}
                  disabled={isProcessing}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => currentTodayTask && handleNext(currentTodayTask)}
                  disabled={isProcessing}
                >
                  Next
                </button>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => currentTodayTask && handleLater(currentTodayTask)}
                  disabled={isProcessing}
                >
                  Later
                </button>
              </div>
            </>
          )}
        </>
      )}

      {screen === 2 && (
        <>
          <div className={styles.rule} />
          <div className={styles.title}>END REVIEW — INBOX</div>
          <div className={styles.rule} />

          {inboxLoading ? (
            <div className={styles.empty}>Loading inbox...</div>
          ) : inboxCount === 0 ? (
            <div className={styles.empty}>Inbox empty.</div>
          ) : (
            <>
              <div className={styles.counter}>
                Item {inboxIndex + 1} of {inboxCount}
              </div>
              <div className={styles.prompt}>&quot;{currentInboxTask?.title}&quot;</div>
              <div className={styles.rule} />
              <div className={styles.questionTitle}>Decide now</div>
              <div className={styles.rule} />
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => currentInboxTask && handleNext(currentInboxTask)}
                  disabled={isProcessing}
                >
                  Next
                </button>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => currentInboxTask && handleLater(currentInboxTask)}
                  disabled={isProcessing}
                >
                  Later
                </button>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => currentInboxTask && handleDone(currentInboxTask)}
                  disabled={isProcessing}
                >
                  Done
                </button>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => currentInboxTask && handleDelete(currentInboxTask)}
                  disabled={isProcessing}
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </>
      )}

      {screen === 3 && (
        <>
          <div className={styles.rule} />
          <div className={styles.title}>DECIDE NEXT</div>
          <div className={styles.rule} />

          {(nextLoading || todayLoading) && (
            <div className={styles.empty}>Loading next tasks...</div>
          )}

          {!nextLoading && !todayLoading && (
            <>
              <div className={styles.stats}>
                <div className={styles.statLine}>Today capacity: 5</div>
                <div className={styles.statLine}>Already reserved (Now): {reservedNow}</div>
                <div className={styles.statLine}>Slots remaining: {remainingSlots}</div>
              </div>

              {showFlaggingList ? (
                <>
                  <div className={styles.question}>
                    Nothing flagged for Next.
                    <br />
                    Select from Anytime.
                  </div>
                  {anytimeLoading ? (
                    <div className={styles.empty}>Loading Anytime...</div>
                  ) : flaggableAnytimeTasks.length === 0 ? (
                    <div className={styles.empty}>No Anytime tasks.</div>
                  ) : (
                    <div className={styles.checklist}>
                      {flaggableAnytimeTasks.map((task) => (
                        <label key={task.id} className={styles.checkRow}>
                          <input
                            type="checkbox"
                            className={styles.checkbox}
                            checked={flagSelections.includes(task.id)}
                            onChange={() => toggleFlagSelection(task.id)}
                            disabled={isProcessing}
                          />
                          <span>{task.title}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {flagSelections.length > 0 && (
                    <div className={styles.selectionCount}>
                      {flagSelections.length} selected
                    </div>
                  )}
                  <div className={styles.actionsStack}>
                    <button
                      type="button"
                      className={styles.actionButton}
                      onClick={handleFlagForNext}
                      disabled={isProcessing}
                    >
                      Continue
                    </button>
                  </div>
                </>
              ) : nextCount === 0 ? (
                <>
                  <div className={styles.empty}>Nothing flagged for Next.</div>
                  <div className={styles.actionsStack}>
                    <button
                      type="button"
                      className={styles.actionButton}
                      onClick={handleConfirmNext}
                      disabled={isProcessing}
                    >
                      Confirm Next
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.question}>
                    Select up to {remainingSlots} item
                    {remainingSlots === 1 ? "" : "s"}.
                  </div>
                  <div className={styles.checklist}>
                    {orderedNextTasks.map((task) => {
                      const isChecked = selectedNextIds.includes(task.id);
                      const isDisabled =
                        remainingSlots === 0 ||
                        (selectedNextIds.length >= remainingSlots && !isChecked);
                      return (
                        <label key={task.id} className={styles.checkRow}>
                          <input
                            type="checkbox"
                            className={styles.checkbox}
                            checked={isChecked}
                            onChange={() => toggleSelection(task.id)}
                            disabled={isDisabled || isProcessing}
                          />
                          <span>{task.title}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div className={styles.selectionCount}>
                    {selectedNextIds.length} of {remainingSlots} selected
                  </div>
                  <div className={styles.actionsStack}>
                    <button
                      type="button"
                      className={styles.actionButton}
                      onClick={handleConfirmNext}
                      disabled={isProcessing}
                    >
                      Confirm Next
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {screen === 4 && (
        <>
          <div className={styles.rule} />
          <div className={styles.title}>DAY CLOSED</div>
          <div className={styles.rule} />
          <div className={styles.prompt}>
            Inbox empty.
            <br />
            Today is set.
          </div>
          <div className={styles.rule} />
          <div className={styles.actionsStack}>
            <button
              type="button"
              className={styles.actionButton}
              onClick={() => router.push("/")}
              disabled={isProcessing}
            >
              Close
            </button>
          </div>
        </>
      )}
      </div>
    </div>
  );
}
