"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import type { Project } from "@/types/database";
import type { TaskWithDetails } from "@/lib/hooks/use-tasks";
import type { ProjectActivity } from "@/lib/hooks/use-project-activity";
import styles from "./project-info-sheet.module.css";

type InfoTab = "statistics" | "details" | "resources";

interface ProjectInfoSheetProps {
  open: boolean;
  onClose: () => void;
  project: Project;
  tasks?: TaskWithDetails[];
  activity?: ProjectActivity[];
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return format(new Date(value), "MMM d, yyyy h:mm a");
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return format(new Date(value), "MMM d, yyyy");
}

function formatDuration(totalSeconds: number) {
  if (!totalSeconds) return "0m";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  return `${minutes}m`;
}

function getActivityLabel(entry: ProjectActivity) {
  switch (entry.action) {
    case "created":
      return "Project created";
    case "active":
      return "Status set to Active";
    case "paused":
      return "Project paused";
    case "cancelled":
      return "Project cancelled";
    case "complete":
      return "Project completed";
    case "archived":
      return "Project archived";
    case "task_completed":
      return "Task completed";
    case "task_cancelled":
      return "Task cancelled";
    default:
      return entry.action;
  }
}

export function ProjectInfoSheet({
  open,
  onClose,
  project,
  tasks = [],
  activity = [],
}: ProjectInfoSheetProps) {
  const [tab, setTab] = useState<InfoTab>("details");

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setTab("details");
      return;
    }
    onClose();
  };

  const stats = useMemo(() => {
    const completedCount = tasks.filter((task) => task.status === "done").length;
    const waitingCount = tasks.filter((task) => task.status === "waiting").length;
    const pausedCount = tasks.filter((task) => task.status === "paused").length;
    const activeCount = tasks.filter(
      (task) => !["done", "cancel", "waiting", "paused"].includes(task.status)
    ).length;
    const totalSeconds = tasks.reduce(
      (sum, task) => sum + (task.time_tracked_seconds || 0),
      0
    );

    const findActivityDate = (action: ProjectActivity["action"]) =>
      activity.find((entry) => entry.action === action)?.created_at ?? null;

    return {
      completedCount,
      waitingCount,
      pausedCount,
      activeCount,
      totalSeconds,
      lastActivityAt: activity[0]?.created_at ?? null,
      createdAt: project.created_at,
      startedAt: project.started_at,
      cancelledAt: findActivityDate("cancelled"),
      completedAt: findActivityDate("complete"),
      archivedAt: findActivityDate("archived"),
    };
  }, [activity, project.created_at, project.started_at, tasks]);

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.sheet} aria-label="Project info">
          <VisuallyHidden>
            <Dialog.Title>Project info</Dialog.Title>
          </VisuallyHidden>
          <div className={styles.header}>
            <div className={styles.title}>Info</div>
            <Dialog.Close className={styles.close} type="button">
              Close
            </Dialog.Close>
          </div>

          <div className={styles.tabs} role="tablist">
            {(["statistics", "details", "resources"] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={styles.tabButton}
                data-active={tab === item}
                role="tab"
                aria-selected={tab === item}
                onClick={() => setTab(item)}
              >
                {item[0].toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>

          {tab === "statistics" && (
            <div className={styles.section}>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{stats.completedCount}</div>
                  <div className={styles.statLabel}>Completed</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{stats.activeCount}</div>
                  <div className={styles.statLabel}>Active</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{stats.waitingCount}</div>
                  <div className={styles.statLabel}>Waiting</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{stats.pausedCount}</div>
                  <div className={styles.statLabel}>Paused</div>
                </div>
              </div>

              <div className={styles.metaList}>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Created</span>
                  <span className={styles.metaValue}>
                    {formatDate(stats.createdAt)}
                  </span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Started</span>
                  <span className={styles.metaValue}>
                    {formatDate(stats.startedAt)}
                  </span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Completed</span>
                  <span className={styles.metaValue}>
                    {formatDate(stats.completedAt)}
                  </span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Cancelled</span>
                  <span className={styles.metaValue}>
                    {formatDate(stats.cancelledAt)}
                  </span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Archived</span>
                  <span className={styles.metaValue}>
                    {formatDate(stats.archivedAt)}
                  </span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Last activity</span>
                  <span className={styles.metaValue}>
                    {formatDateTime(stats.lastActivityAt)}
                  </span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Total time</span>
                  <span className={styles.metaValue}>
                    {formatDuration(stats.totalSeconds)}
                  </span>
                </div>
              </div>

              <div className={styles.activity}>
                <div className={styles.activityTitle}>Activity log</div>
                <div className={styles.activityList}>
                  {activity.length === 0 && (
                    <div className={styles.activityEmpty}>No activity yet.</div>
                  )}
                  {activity.map((entry) => (
                    <div key={entry.id} className={styles.activityRow}>
                      <div className={styles.activityText}>
                        {getActivityLabel(entry)}
                        {entry.reason ? `: ${entry.reason}` : ""}
                      </div>
                      <div className={styles.activityDate}>
                        {formatDateTime(entry.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "details" && (
            <div className={styles.section}>
              <div className={styles.detailBlock}>
                <div className={styles.detailLabel}>Outcome</div>
                <div className={styles.detailValue}>{project.outcome}</div>
              </div>
              <div className={styles.detailBlock}>
                <div className={styles.detailLabel}>Purpose</div>
                <div className={styles.detailValue}>{project.purpose}</div>
              </div>
              <div className={styles.detailBlock}>
                <div className={styles.detailLabel}>Description</div>
                <div className={styles.detailValue}>
                  {project.description || "No description yet."}
                </div>
              </div>
            </div>
          )}

          {tab === "resources" && (
            <div className={styles.section}>
              <div className={styles.resourcesTitle}>Linked resources</div>
              <ul className={styles.resourcesList}>
                <li className={styles.resourceItem}>No linked notes yet.</li>
                <li className={styles.resourceItem}>Add wiki-links to surface here.</li>
              </ul>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
