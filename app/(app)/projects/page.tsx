"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProjectForm, type ProjectFormValues } from "@/components/projects/project-form";
import { ProjectList } from "@/components/projects/project-list";
import { ProjectListSkeleton } from "@/components/skeletons";
import { InlineError } from "@/components/error-boundary";
import {
  useProjects,
  useCreateProject,
  useUpdateProject,
  useArchiveProject,
  type ProjectWithTaskCount,
} from "@/lib/hooks/use-projects";

export default function ProjectsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectWithTaskCount | null>(null);

  const { data: projects, isLoading, error } = useProjects();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const archiveProject = useArchiveProject();

  const handleCreate = () => {
    setEditingProject(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (project: ProjectWithTaskCount) => {
    setEditingProject(project);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (values: ProjectFormValues) => {
    if (editingProject) {
      await updateProject.mutateAsync({ id: editingProject.id, ...values });
    } else {
      await createProject.mutateAsync(values);
    }
    setIsDialogOpen(false);
    setEditingProject(null);
  };

  const handleArchive = async (id: string) => {
    await archiveProject.mutateAsync(id);
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    setEditingProject(null);
  };

  const isMutating =
    createProject.isPending ||
    updateProject.isPending ||
    archiveProject.isPending;

  if (error) {
    return <InlineError message={`Error loading projects: ${error.message}`} />;
  }

  const hasProjects = projects && projects.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">
          Organize your work into projects.
        </p>
        <Button onClick={handleCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <ProjectListSkeleton count={3} />
      ) : hasProjects ? (
        <ProjectList
          projects={projects}
          onEdit={handleEdit}
          onArchive={handleArchive}
        />
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">No projects yet</p>
          <Button onClick={handleCreate} variant="outline" className="mt-4">
            <Plus className="mr-2 h-4 w-4" />
            Create your first project
          </Button>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProject ? "Edit Project" : "New Project"}
            </DialogTitle>
          </DialogHeader>
          <ProjectForm
            project={editingProject || undefined}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isMutating}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
