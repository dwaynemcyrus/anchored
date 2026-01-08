"use client";

import Link from "next/link";
import type { ProjectWithTaskCount } from "@/lib/hooks/use-projects";
import styles from "./project-list.module.css";

type ProjectStatus =
  | "backlog"
  | "active"
  | "paused"
  | "complete"
  | "archived"
  | "cancelled";

const statusLabels: Record<ProjectStatus, string> = {
  backlog: "Backlog",
  active: "Active",
  paused: "Paused",
  complete: "Complete",
  archived: "Archived",
  cancelled: "Cancelled",
};

const statusOrder: ProjectStatus[] = [
  "backlog",
  "active",
  "paused",
  "complete",
  "archived",
  "cancelled",
];

interface ProjectListProps {
  projects: ProjectWithTaskCount[];
}

export function ProjectList({ projects }: ProjectListProps) {
  if (projects.length === 0) {
    return <div className={styles.state}>No projects yet.</div>;
  }

  const grouped = projects.reduce<Record<ProjectStatus, ProjectWithTaskCount[]>>(
    (acc, project) => {
      const status = (project.status as ProjectStatus) || "backlog";
      if (!acc[status]) acc[status] = [];
      acc[status].push(project);
      return acc;
    },
    {
      backlog: [],
      active: [],
      paused: [],
      complete: [],
      archived: [],
      cancelled: [],
    }
  );

  return (
    <div className={styles.list}>
      {statusOrder.map((status) => {
        const items = grouped[status];
        if (!items || items.length === 0) return null;
        return (
          <div key={status} className={styles.section}>
            <div className={styles.sectionTitle}>{statusLabels[status]}</div>
            <div className={styles.sectionList}>
              {items.map((project) => (
                <div key={project.id} className={styles.item}>
                  <Link
                    href={`/projects/${project.id}`}
                    className={styles.linkArea}
                  >
                    <div className={styles.title}>{project.title}</div>
                    <div className={styles.metaRow}>
                      <span className={styles.metaText}>
                        {project.task_count}{" "}
                        {project.task_count === 1 ? "task" : "tasks"}
                      </span>
                      <span className={styles.metaText}>
                        {statusLabels[project.status as ProjectStatus] || "Status"}
                      </span>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
