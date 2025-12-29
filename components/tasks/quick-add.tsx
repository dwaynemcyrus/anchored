"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  parseTaskInput,
  extractCurrentTag,
  getProjectSuggestions,
  getStatusSuggestions,
  STATUS_OPTIONS,
  type Project,
} from "@/lib/utils/task-parser";
import { useCreateTask } from "@/lib/hooks/use-tasks";
import { useProjects } from "@/lib/hooks/use-projects";
import type { TaskStatus } from "@/types/database";

interface QuickAddProps {
  defaultProjectId?: string | null;
  defaultStatus?: TaskStatus;
  placeholder?: string;
  className?: string;
  onSuccess?: () => void;
}

interface Suggestion {
  type: "project" | "status";
  value: string;
  label: string;
  id?: string;
}

export function QuickAdd({
  defaultProjectId = null,
  defaultStatus = "inbox",
  placeholder = "Add a task... (# for project, @ for status)",
  className,
  onSuccess,
}: QuickAddProps) {
  const [input, setInput] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const { data: projects } = useProjects();
  const createTask = useCreateTask();

  const projectList: Project[] = useMemo(
    () => projects?.map((p) => ({ id: p.id, title: p.title })) || [],
    [projects]
  );

  // Update suggestions based on input
  useEffect(() => {
    const tag = extractCurrentTag(input, cursorPosition);

    if (tag.type === "project") {
      const projectSuggestions = getProjectSuggestions(tag.value, projectList);
      setSuggestions(
        projectSuggestions.map((p) => ({
          type: "project",
          value: p.title,
          label: p.title,
          id: p.id,
        }))
      );
      setShowSuggestions(projectSuggestions.length > 0);
      setSelectedIndex(0);
    } else if (tag.type === "status") {
      const statusSuggestions = getStatusSuggestions(tag.value);
      setSuggestions(
        statusSuggestions.map((s) => ({
          type: "status",
          value: s.value,
          label: s.label,
        }))
      );
      setShowSuggestions(statusSuggestions.length > 0);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  }, [input, cursorPosition, projectList]);

  // Global keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const applySuggestion = useCallback(
    (suggestion: Suggestion) => {
      const tag = extractCurrentTag(input, cursorPosition);
      if (tag.startIndex === -1) return;

      // Replace the tag with the suggestion
      const before = input.slice(0, tag.startIndex);
      const after = input.slice(cursorPosition);

      let newInput: string;
      if (suggestion.type === "project") {
        // Use the project title, handling spaces with quotes if needed
        const projectName = suggestion.value.includes(" ")
          ? `"${suggestion.value}"`
          : suggestion.value;
        newInput = `${before}#${projectName} ${after}`.trim();
      } else {
        newInput = `${before}@${suggestion.value} ${after}`.trim();
      }

      setInput(newInput);
      setShowSuggestions(false);

      // Focus back on input
      setTimeout(() => {
        inputRef.current?.focus();
        const newPosition = newInput.length;
        inputRef.current?.setSelectionRange(newPosition, newPosition);
      }, 0);
    },
    [input, cursorPosition]
  );

  const handleSubmit = async () => {
    if (!input.trim() || createTask.isPending) return;

    const parsed = parseTaskInput(input, projectList, defaultStatus);

    // Use default project if no project was specified
    const finalProjectId = parsed.project_id || defaultProjectId;

    if (!parsed.title) return;

    try {
      await createTask.mutateAsync({
        title: parsed.title,
        status: parsed.status,
        due_date: parsed.due_date,
        project_id: finalProjectId,
      });

      setInput("");
      setShowSuggestions(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to create task:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
          break;
        case "Tab":
        case "Enter":
          if (suggestions[selectedIndex]) {
            e.preventDefault();
            applySuggestion(suggestions[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setShowSuggestions(false);
          break;
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    setCursorPosition(e.target.selectionStart || 0);
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    setCursorPosition(target.selectionStart || 0);
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Plus className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onSelect={handleSelect}
          onClick={handleSelect}
          placeholder={placeholder}
          disabled={createTask.isPending}
          className="pl-9 pr-9"
        />
        {createTask.isPending && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.type}-${suggestion.value}`}
              type="button"
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
                index === selectedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"
              )}
              onClick={() => applySuggestion(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span className="text-muted-foreground">
                {suggestion.type === "project" ? "#" : "@"}
              </span>
              <span>{suggestion.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Keyboard shortcut hint */}
      <div className="mt-1 text-xs text-muted-foreground">
        Press{" "}
        <kbd className="rounded border bg-muted px-1 py-0.5 text-[10px]">
          {typeof navigator !== "undefined" &&
          navigator.platform.includes("Mac")
            ? "⌘"
            : "Ctrl"}
          +K
        </kbd>{" "}
        to focus
      </div>
    </div>
  );
}

// Compact version for inline use
export function QuickAddInline({
  defaultProjectId = null,
  defaultStatus = "inbox",
  placeholder = "Add a task...",
  className,
  onSuccess,
}: QuickAddProps) {
  const [input, setInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: projects } = useProjects();
  const createTask = useCreateTask();

  const projectList: Project[] = useMemo(
    () => projects?.map((p) => ({ id: p.id, title: p.title })) || [],
    [projects]
  );

  const handleSubmit = async () => {
    if (!input.trim() || createTask.isPending) return;

    const parsed = parseTaskInput(input, projectList, defaultStatus);
    const finalProjectId = parsed.project_id || defaultProjectId;

    if (!parsed.title) return;

    try {
      await createTask.mutateAsync({
        title: parsed.title,
        status: parsed.status,
        due_date: parsed.due_date,
        project_id: finalProjectId,
      });

      setInput("");
      setIsExpanded(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to create task:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      setIsExpanded(false);
      setInput("");
    }
  };

  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={() => {
          setIsExpanded(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground",
          className
        )}
      >
        <Plus className="h-4 w-4" />
        {placeholder}
      </button>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <Input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (!input.trim()) {
            setIsExpanded(false);
          }
        }}
        placeholder={placeholder}
        disabled={createTask.isPending}
        autoFocus
      />
      {createTask.isPending && (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}
