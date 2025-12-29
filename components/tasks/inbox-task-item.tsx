"use client";

import { Sun, FolderOpen, Trash2, Check, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { TaskWithDetails } from "@/lib/hooks/use-tasks";
import type { Project } from "@/types/database";

interface InboxTaskItemProps {
  task: TaskWithDetails;
  projects: Pick<Project, "id" | "title">[];
  onMoveToToday: (task: TaskWithDetails) => void;
  onMoveToAnytime: (task: TaskWithDetails) => void;
  onAssignProject: (task: TaskWithDetails, projectId: string | null) => void;
  onDelete: (task: TaskWithDetails) => void;
  onComplete: (task: TaskWithDetails) => void;
  isProcessing?: boolean;
}

export function InboxTaskItem({
  task,
  projects,
  onMoveToToday,
  onMoveToAnytime,
  onAssignProject,
  onDelete,
  onComplete,
  isProcessing = false,
}: InboxTaskItemProps) {
  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-lg border bg-card p-4 transition-all",
        isProcessing && "opacity-50 pointer-events-none"
      )}
    >
      {/* Task Content */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{task.title}</p>
        {task.project && (
          <p className="text-sm text-muted-foreground truncate">
            {task.project.title}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Today Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onMoveToToday(task)}
          className="h-8 px-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
        >
          <Sun className="h-4 w-4 mr-1" />
          Today
        </Button>

        {/* Anytime Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onMoveToAnytime(task)}
          className="h-8 px-3 text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-950"
        >
          <Layers className="h-4 w-4 mr-1" />
          Anytime
        </Button>

        {/* Project Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-muted-foreground hover:text-foreground"
            >
              <FolderOpen className="h-4 w-4 mr-1" />
              Project
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => onAssignProject(task, null)}
              className={cn(!task.project_id && "bg-accent")}
            >
              No Project
            </DropdownMenuItem>
            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => onAssignProject(task, project.id)}
                className={cn(task.project_id === project.id && "bg-accent")}
              >
                {project.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Complete Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onComplete(task)}
          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
        >
          <Check className="h-4 w-4" />
          <span className="sr-only">Complete</span>
        </Button>

        {/* Delete Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(task)}
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete</span>
        </Button>
      </div>
    </div>
  );
}

// Compact version for mobile or smaller screens
export function InboxTaskItemCompact({
  task,
  projects,
  onMoveToToday,
  onMoveToAnytime,
  onAssignProject,
  onDelete,
  onComplete,
  isProcessing = false,
}: InboxTaskItemProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-3 transition-all space-y-3",
        isProcessing && "opacity-50 pointer-events-none"
      )}
    >
      {/* Task Content */}
      <div className="min-w-0">
        <p className="font-medium">{task.title}</p>
        {task.project && (
          <p className="text-sm text-muted-foreground">{task.project.title}</p>
        )}
      </div>

      {/* Action Buttons - Horizontal scroll on mobile */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onMoveToToday(task)}
          className="h-7 text-xs whitespace-nowrap"
        >
          <Sun className="h-3 w-3 mr-1" />
          Today
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onMoveToAnytime(task)}
          className="h-7 text-xs whitespace-nowrap"
        >
          <Layers className="h-3 w-3 mr-1" />
          Anytime
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs whitespace-nowrap">
              <FolderOpen className="h-3 w-3 mr-1" />
              Project
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={() => onAssignProject(task, null)}>
              No Project
            </DropdownMenuItem>
            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => onAssignProject(task, project.id)}
              >
                {project.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onComplete(task)}
          className="h-7 text-xs whitespace-nowrap text-green-600"
        >
          <Check className="h-3 w-3 mr-1" />
          Done
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelete(task)}
          className="h-7 text-xs whitespace-nowrap text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
