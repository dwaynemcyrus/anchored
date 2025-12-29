"use client";

import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Archive, FolderKanban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ProjectWithTaskCount } from "@/lib/hooks/use-projects";

interface ProjectListProps {
  projects: ProjectWithTaskCount[];
  onEdit: (project: ProjectWithTaskCount) => void;
  onArchive: (id: string) => void;
}

const statusConfig = {
  active: { label: "Active", variant: "default" as const },
  completed: { label: "Completed", variant: "secondary" as const },
  archived: { label: "Archived", variant: "outline" as const },
};

function ProjectCard({
  project,
  onEdit,
  onArchive,
  onClick,
}: {
  project: ProjectWithTaskCount;
  onEdit: () => void;
  onArchive: () => void;
  onClick: () => void;
}) {
  const config = statusConfig[project.status];

  return (
    <div
      className="group relative rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 rounded-md bg-primary/10 p-2">
            <FolderKanban className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-medium truncate">{project.title}</h3>
            {project.description && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                {project.description}
              </p>
            )}
            <div className="mt-2 flex items-center gap-2">
              <Badge variant={config.variant}>{config.label}</Badge>
              <span className="text-xs text-muted-foreground">
                {project.task_count} {project.task_count === 1 ? "task" : "tasks"}
              </span>
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            {project.status !== "archived" && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive();
                }}
              >
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function ProjectList({ projects, onEdit, onArchive }: ProjectListProps) {
  const router = useRouter();

  // Group projects by status
  const activeProjects = projects.filter((p) => p.status === "active");
  const completedProjects = projects.filter((p) => p.status === "completed");
  const archivedProjects = projects.filter((p) => p.status === "archived");

  const handleClick = (projectId: string) => {
    router.push(`/projects/${projectId}`);
  };

  return (
    <div className="space-y-8">
      {/* Active Projects */}
      {activeProjects.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">
            Active ({activeProjects.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={() => onEdit(project)}
                onArchive={() => onArchive(project.id)}
                onClick={() => handleClick(project.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Completed Projects */}
      {completedProjects.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">
            Completed ({completedProjects.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {completedProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={() => onEdit(project)}
                onArchive={() => onArchive(project.id)}
                onClick={() => handleClick(project.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Archived Projects */}
      {archivedProjects.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">
            Archived ({archivedProjects.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {archivedProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={() => onEdit(project)}
                onArchive={() => onArchive(project.id)}
                onClick={() => handleClick(project.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
