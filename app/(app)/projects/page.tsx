"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { InlineError } from "@/components/error-boundary";
import { ProjectDetailModal } from "@/components/projects/project-detail-modal";
import { ProjectList } from "@/components/projects/project-list";
import { ProjectOptionsMenu } from "@/components/projects/project-options-menu";
import { useCreateProject, useProjects } from "@/lib/hooks/use-projects";
import styles from "./page.module.css";


export default function ProjectsPage() {
  const router = useRouter();
  const { data: projects = [], isLoading, error } = useProjects();
  const createProject = useCreateProject();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreate = () => {
    setIsModalOpen(true);
  };

  const handleSave = async (values: {
    title: string;
    outcome: string;
    purpose: string;
    description: string | null;
  }) => {
    const project = await createProject.mutateAsync({
      title: values.title,
      outcome: values.outcome,
      purpose: values.purpose,
      description: values.description,
      status: "backlog",
    });
    router.push(`/projects/${project.id}`);
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
      <div className={styles.scroll}>
        {isLoading ? (
          <div className={styles.state}>Loading projects...</div>
        ) : (
          <ProjectList projects={projects} />
        )}
      </div>
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
