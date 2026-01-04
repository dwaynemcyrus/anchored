"use client";

import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { ProjectWithTaskCount } from "@/lib/hooks/use-projects";
import styles from "./project-list.module.css";

type ProjectStatus =
  | "active"
  | "paused"
  | "complete"
  | "archived"
  | "cancelled";

const statusLabels: Record<ProjectStatus, string> = {
  active: "Active",
  paused: "Paused",
  complete: "Complete",
  archived: "Archived",
  cancelled: "Cancelled",
};

const statusMenuLabels: Record<ProjectStatus, string> = {
  active: "Activate",
  paused: "Pause",
  complete: "Complete",
  archived: "Archive",
  cancelled: "Cancel",
};

const statusOptions: ProjectStatus[] = [
  "active",
  "paused",
  "complete",
  "archived",
  "cancelled",
];

interface ProjectListProps {
  projects: ProjectWithTaskCount[];
  onStatusChange: (project: ProjectWithTaskCount, status: ProjectStatus) => void;
}

export function ProjectList({ projects, onStatusChange }: ProjectListProps) {
  const router = useRouter();

  if (projects.length === 0) {
    return <div className={styles.state}>No projects yet.</div>;
  }

  return (
    <div className={styles.list}>
      {projects.map((project) => (
        <div
          key={project.id}
          className={styles.item}
          onClick={() => router.push(`/projects/${project.id}`)}
        >
          <div className={styles.title}>{project.title}</div>
          <div className={styles.meta}>
            <span className={styles.metaText}>
              {project.task_count}{" "}
              {project.task_count === 1 ? "task" : "tasks"}
            </span>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  className={styles.statusButton}
                  onClick={(event) => event.stopPropagation()}
                  aria-label="Change project status"
                >
                  {statusLabels[project.status as ProjectStatus] || "Status"}
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className={styles.menuContent}
                  align="start"
                  sideOffset={6}
                >
                  {statusOptions.map((status) => (
                    <DropdownMenu.Item
                      key={status}
                      className={styles.menuItem}
                      onSelect={(event) => {
                        event.preventDefault();
                        if (status === project.status) return;
                        if (status === "archived" || status === "cancelled") {
                          const ok = window.confirm(
                            `Are you sure you want to ${statusMenuLabels[status].toLowerCase()} this project?`
                          );
                          if (!ok) return;
                        }
                        onStatusChange(project, status);
                      }}
                    >
                      <span className={styles.menuItemLabel}>
                        {statusMenuLabels[status]}
                      </span>
                      {project.status === status && (
                        <span className={styles.menuItemCheck}>✓</span>
                      )}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>
      ))}
    </div>
  );
}
