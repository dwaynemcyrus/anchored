"use client";

import { useState } from "react";
import Link from "next/link";
import { format, isBefore, isSameDay, startOfDay } from "date-fns";
import { QuickAdd } from "@/components/tasks/quick-add";
import { SortableTaskList } from "@/components/tasks/sortable-task-list";
import { TaskList } from "@/components/tasks/task-list";
import { TaskDetailDrawer } from "@/components/tasks/task-detail-drawer";
import { TaskListSkeleton } from "@/components/skeletons";
import {
  useDueTasks,
  useInboxTasks,
  useScheduledTasks,
  useTasks,
  useToggleTaskComplete,
  type TaskWithDetails,
} from "@/lib/hooks/use-tasks";
import { useHabits } from "@/lib/hooks/use-habits";

export default function TodayPage() {
  const now = new Date();
  const todayLabel = format(now, "EEEE, MMMM d, yyyy");
  const todayDate = startOfDay(now);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Fetch tasks with status "today"
  const { data: tasks, isLoading: isLoadingToday } = useTasks({
    status: "today",
  });
  const { data: dueTasks, isLoading: isLoadingDue } = useDueTasks({
    to: todayDate,
    excludeDone: true,
  });
  const { data: inboxTasks, isLoading: inboxLoading } = useInboxTasks();
  const { data: scheduledTasks, isLoading: scheduledLoading } =
    useScheduledTasks();
  const { data: habits, isLoading: habitsLoading } = useHabits({
    active: true,
  });
  const toggleComplete = useToggleTaskComplete();

  const handleToggleComplete = (task: TaskWithDetails) => {
    toggleComplete.mutate(task);
  };

  const handleTaskClick = (task: TaskWithDetails) => {
    setSelectedTaskId(task.id);
  };

  const isLoading = isLoadingToday || isLoadingDue;
  const allDueTasks = dueTasks || [];
  const todayTasks = tasks || [];
  const inboxCount = inboxTasks?.length || 0;
  const scheduledCount = scheduledTasks?.length || 0;
  const habitsTotal = habits?.length || 0;
  const habitsCompleted =
    habits?.filter((habit) => habit.completedToday).length || 0;
  const summaryLoading = inboxLoading || scheduledLoading || habitsLoading;

  const parseDueDate = (dueDate: string) => startOfDay(new Date(dueDate));
  const isOverdue = (task: TaskWithDetails) =>
    !!task.due_date && isBefore(parseDueDate(task.due_date), todayDate);
  const isDueToday = (task: TaskWithDetails) =>
    !!task.due_date && isSameDay(parseDueDate(task.due_date), todayDate);

  const overdueTasks = allDueTasks.filter(isOverdue);
  const overdueIds = new Set(overdueTasks.map((task) => task.id));

  const dueTodayTasks = allDueTasks.filter(
    (task) => isDueToday(task) && task.status !== "today"
  );

  // Separate active and completed tasks, sort by sort_order
  const activeTodayTasks = todayTasks
    .filter((t) => t.status !== "done" && !overdueIds.has(t.id))
    .sort(
    (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
  );
  const completedToday = todayTasks.filter((t) => t.status === "done");
  const hasActiveTasks =
    overdueTasks.length > 0 ||
    dueTodayTasks.length > 0 ||
    activeTodayTasks.length > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Today</h1>
        <p className="text-muted-foreground">{todayLabel}</p>
      </div>

      {/* Quick Add */}
      <QuickAdd
        defaultStatus="today"
        placeholder="Add a task for today... (# for project, @ for status)"
      />

      {/* Summary */}
      <div className="rounded-lg border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            href="/inbox"
            className="flex items-center justify-between rounded-md border border-transparent px-3 py-2 text-sm transition-colors hover:border-border hover:bg-accent"
          >
            <span className="text-muted-foreground">Inbox</span>
            <span className="font-medium">
              {summaryLoading ? "—" : inboxCount}
            </span>
          </Link>
          <Link
            href="/scheduled"
            className="flex items-center justify-between rounded-md border border-transparent px-3 py-2 text-sm transition-colors hover:border-border hover:bg-accent"
          >
            <span className="text-muted-foreground">Scheduled</span>
            <span className="font-medium">
              {summaryLoading ? "—" : scheduledCount}
            </span>
          </Link>
          <Link
            href="/habits"
            className="flex items-center justify-between rounded-md border border-transparent px-3 py-2 text-sm transition-colors hover:border-border hover:bg-accent"
          >
            <span className="text-muted-foreground">Habits</span>
            <span className="font-medium">
              {summaryLoading ? "—" : `${habitsCompleted}/${habitsTotal}`}
            </span>
          </Link>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <Link
            href="#overdue"
            className="hover:text-foreground transition-colors"
          >
            Overdue: {isLoading ? "—" : overdueTasks.length}
          </Link>
          <Link
            href="#due-today"
            className="hover:text-foreground transition-colors"
          >
            Due Today: {isLoading ? "—" : dueTodayTasks.length}
          </Link>
        </div>
      </div>

      {/* Tasks */}
      <div className="space-y-6">
        {isLoading ? (
          <TaskListSkeleton count={3} />
        ) : (
          <>
            {/* Overdue */}
            {overdueTasks.length > 0 && (
              <section id="overdue" className="space-y-3">
                <h2 className="text-sm font-medium text-destructive">
                  Overdue ({overdueTasks.length})
                </h2>
                <TaskList
                  tasks={overdueTasks}
                  onToggleComplete={handleToggleComplete}
                  onTaskClick={handleTaskClick}
                  showProject
                  showStatus
                />
              </section>
            )}

            {/* Due Today (not already in Today status) */}
            {dueTodayTasks.length > 0 && (
              <section id="due-today" className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground">
                  Due Today ({dueTodayTasks.length})
                </h2>
                <TaskList
                  tasks={dueTodayTasks}
                  onToggleComplete={handleToggleComplete}
                  onTaskClick={handleTaskClick}
                  showProject
                  showStatus
                />
              </section>
            )}

            {/* Active Today Tasks */}
            {activeTodayTasks.length > 0 ? (
              <SortableTaskList
                tasks={activeTodayTasks}
                onToggleComplete={handleToggleComplete}
                onTaskClick={handleTaskClick}
                showProject
                emptyMessage="No tasks for today"
              />
            ) : !hasActiveTasks ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                <p>No tasks for today</p>
                <p className="text-sm mt-1">
                  Add a task above or move tasks from your inbox
                </p>
              </div>
            ) : null}

            {/* Completed Tasks */}
            {completedToday.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground">
                  Completed ({completedToday.length})
                </h2>
                <TaskList
                  tasks={completedToday}
                  onToggleComplete={handleToggleComplete}
                  onTaskClick={handleTaskClick}
                  showProject
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Task Detail Drawer */}
      <TaskDetailDrawer
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
      />
    </div>
  );
}
