"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { InlineError } from "@/components/error-boundary";
import { ProjectDetailModal } from "@/components/projects/project-detail-modal";
import { ProjectList } from "@/components/projects/project-list";
import { ProjectOptionsMenu } from "@/components/projects/project-options-menu";
import {
  useCreateProject,
  useProjects,
  useUpdateProject,
  type ProjectWithTaskCount,
} from "@/lib/hooks/use-projects";
import styles from "./page.module.css";

type ProjectStatus =
  | "active"
  | "paused"
  | "complete"
  | "archived"
  | "cancelled";

export default function ProjectsPage() {
  const router = useRouter();
  const { data: projects = [], isLoading, error } = useProjects();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreate = () => {
    setIsModalOpen(true);
  };

  const handleSave = async (values: {
    title: string;
    description: string | null;
  }) => {
    const project = await createProject.mutateAsync({
      title: values.title,
      description: values.description,
      status: "active",
    });
    router.push(`/projects/${project.id}`);
  };

  const handleStatusChange = async (
    project: ProjectWithTaskCount,
    status: ProjectStatus
  ) => {
    await updateProject.mutateAsync({ id: project.id, status });
  };

  if (error) {
    return <InlineError message={`Error loading projects: ${error.message}`} />;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.title}>Projects</div>
        <div className={styles.actions}>
          <button type="button" className={styles.textButton} onClick={handleCreate}>
            New
          </button>
          <ProjectOptionsMenu />
        </div>
      </div>
      <div className={styles.subtitle}>Organize your work into projects.</div>
      {isLoading ? (
        <div className={styles.state}>Loading projects...</div>
      ) : (
        <ProjectList projects={projects} onStatusChange={handleStatusChange} />
      )}
      <ProjectDetailModal
        open={isModalOpen}
        mode="create"
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        isSaving={createProject.isPending}
      />
    </div>
  );
}
