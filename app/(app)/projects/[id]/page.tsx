"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Archive, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProjectDetailSkeleton } from "@/components/skeletons";
import { InlineError } from "@/components/error-boundary";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ProjectForm,
  type ProjectFormValues,
} from "@/components/projects/project-form";
import { TaskForm, type TaskFormValues } from "@/components/tasks/task-form";
import { QuickAddInline } from "@/components/tasks/quick-add";
import { SortableProjectTaskList } from "@/components/tasks/sortable-task-list";
import {
  useProject,
  useUpdateProject,
  useArchiveProject,
} from "@/lib/hooks/use-projects";
import {
  useTasksByProject,
  useToggleTaskComplete,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  type TaskWithDetails,
} from "@/lib/hooks/use-tasks";

const statusConfig = {
  active: { label: "Active", variant: "default" as const },
  completed: { label: "Completed", variant: "secondary" as const },
  archived: { label: "Archived", variant: "outline" as const },
};

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithDetails | null>(null);
  const [deletingTask, setDeletingTask] = useState<TaskWithDetails | null>(null);

  const { data: project, isLoading: projectLoading, error: projectError } = useProject(id);
  const { data: tasks, isLoading: tasksLoading } = useTasksByProject(id);

  const updateProject = useUpdateProject();
  const archiveProject = useArchiveProject();
  const toggleComplete = useToggleTaskComplete();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const handleUpdateProject = async (values: ProjectFormValues) => {
    await updateProject.mutateAsync({
      id,
      ...values,
    });
    setIsEditDialogOpen(false);
  };

  const handleArchiveProject = async () => {
    await archiveProject.mutateAsync(id);
    setIsArchiveDialogOpen(false);
    router.push("/projects");
  };

  const handleToggleComplete = (task: TaskWithDetails) => {
    toggleComplete.mutate(task);
  };

  const handleTaskClick = (task: TaskWithDetails) => {
    setEditingTask(task);
    setIsTaskDialogOpen(true);
  };

  const handleEditTask = (task: TaskWithDetails) => {
    setEditingTask(task);
    setIsTaskDialogOpen(true);
  };

  const handleDeleteTask = (task: TaskWithDetails) => {
    setDeletingTask(task);
  };

  const handleConfirmDelete = async () => {
    if (deletingTask) {
      await deleteTask.mutateAsync(deletingTask.id);
      setDeletingTask(null);
    }
  };

  const handleAddTask = () => {
    setEditingTask(null);
    setIsTaskDialogOpen(true);
  };

  const handleTaskSubmit = async (values: TaskFormValues) => {
    const taskLocation = values.project_id ? "project" : values.task_location;
    if (editingTask) {
      await updateTask.mutateAsync({
        id: editingTask.id,
        title: values.title,
        notes: values.notes || null,
        project_id: values.project_id,
        task_location: taskLocation,
        start_date: values.start_date?.toISOString() || null,
        due_date: values.due_date?.toISOString() || null,
      });
    } else {
      await createTask.mutateAsync({
        title: values.title,
        notes: values.notes || null,
        project_id: id,
        task_location: "project",
        start_date: values.start_date?.toISOString() || null,
        due_date: values.due_date?.toISOString() || null,
      });
    }
    setIsTaskDialogOpen(false);
    setEditingTask(null);
  };

  const isLoading = projectLoading || tasksLoading;

  if (isLoading) {
    return <ProjectDetailSkeleton />;
  }

  if (projectError || !project) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <InlineError message={projectError?.message || "Project not found"} />
      </div>
    );
  }

  const config = statusConfig[project.status as keyof typeof statusConfig] ?? statusConfig.active;
  const taskCount = tasks?.length || 0;
  const activeTaskCount = tasks?.filter((t) => t.status !== "done").length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/projects")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Projects
        </Button>
      </div>

      {/* Project Info */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{project.title}</h1>
            <Badge variant={config.variant}>{config.label}</Badge>
          </div>
          {project.description && (
            <p className="text-muted-foreground max-w-2xl">
              {project.description}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            {activeTaskCount} active {activeTaskCount === 1 ? "task" : "tasks"}
            {taskCount > activeTaskCount && ` · ${taskCount - activeTaskCount} completed`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditDialogOpen(true)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          {project.status !== "archived" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsArchiveDialogOpen(true)}
            >
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </Button>
          )}
        </div>
      </div>

      {/* Tasks Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Tasks</h2>
          <Button size="sm" onClick={handleAddTask}>
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        </div>

        {/* Quick Add for this project */}
        <QuickAddInline
          defaultProjectId={id}
          defaultStatus="today"
          defaultLocation="project"
          placeholder="Quick add task to this project..."
        />

        <SortableProjectTaskList
          tasks={tasks || []}
          onToggleComplete={handleToggleComplete}
          onTaskClick={handleTaskClick}
          onEdit={handleEditTask}
          onDelete={handleDeleteTask}
        />
      </div>

      {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <ProjectForm
            project={project}
            onSubmit={handleUpdateProject}
            onCancel={() => setIsEditDialogOpen(false)}
            isLoading={updateProject.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive &ldquo;{project.title}&rdquo;?
              The project and its tasks will be moved to the archive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveProject}>
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Task Create/Edit Dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={(open) => {
        setIsTaskDialogOpen(open);
        if (!open) setEditingTask(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "Add Task"}</DialogTitle>
          </DialogHeader>
          <TaskForm
            task={editingTask || undefined}
            defaultProjectId={id}
            defaultLocation="project"
            onSubmit={handleTaskSubmit}
            onCancel={() => {
              setIsTaskDialogOpen(false);
              setEditingTask(null);
            }}
            isLoading={createTask.isPending || updateTask.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Task Confirmation Dialog */}
      <AlertDialog open={!!deletingTask} onOpenChange={(open) => !open && setDeletingTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deletingTask?.title}&rdquo;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
