"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectForm, type ProjectFormValues } from "@/components/projects/project-form";
import { useCreateProject } from "@/lib/hooks/use-projects";

export default function NewProjectPage() {
  const router = useRouter();
  const createProject = useCreateProject();

  const handleSubmit = async (values: ProjectFormValues) => {
    const payload = {
      ...values,
      start_date: values.start_date?.toISOString() || null,
      due_date: values.due_date?.toISOString() || null,
    };

    const project = await createProject.mutateAsync(payload);
    router.push(`/projects/${project.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-semibold">New Project</h1>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Project Details</h2>
        <ProjectForm
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          isLoading={createProject.isPending}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Tasks</h2>
          <Button size="sm" disabled>
            Add Task
          </Button>
        </div>
        <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
          Save the project to add tasks.
        </div>
      </div>
    </div>
  );
}
