"use client";

import { useRouter } from "next/navigation";
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

interface ProjectListProps {
  projects: ProjectWithTaskCount[];
}

export function ProjectList({ projects }: ProjectListProps) {
  const router = useRouter();

  if (projects.length === 0) {
    return <div className={styles.state}>No projects yet.</div>;
  }

  return (
    <div className={styles.list}>
      {projects.map((project) => (
        <div key={project.id} className={styles.item}>
          <div
            className={styles.linkArea}
            role="button"
            tabIndex={0}
            onClick={() => router.push(`/projects/${project.id}`)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                router.push(`/projects/${project.id}`);
              }
            }}
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
          </div>
        </div>
      ))}
    </div>
  );
}
