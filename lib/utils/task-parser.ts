import { addDays, startOfDay } from "date-fns";
import type { TaskStatus } from "@/types/database";

export interface ParsedTask {
  title: string;
  due_date: string | null;
  status: TaskStatus;
  project_id: string | null;
  projectMatch: string | null; // The matched project name for display
}

export interface Project {
  id: string;
  title: string;
}

/**
 * Parse natural language task input
 *
 * Supported patterns:
 * - "tomorrow" or "today" → sets due_date and status
 * - "@anytime", "@today", "@inbox" → sets status
 * - "#project-name" → looks up project by title (fuzzy match)
 * - Everything else becomes the task title
 *
 * Examples:
 * - "Call dentist tomorrow" → { title: "Call dentist", due_date: tomorrow, status: "today" }
 * - "Buy milk #errands" → { title: "Buy milk", project_id: matched_id }
 * - "Review docs @anytime" → { title: "Review docs", status: "anytime" }
 */
export function parseTaskInput(
  input: string,
  projects: Project[] = [],
  defaultStatus: TaskStatus = "inbox"
): ParsedTask {
  let title = input.trim();
  let due_date: string | null = null;
  let status: TaskStatus = defaultStatus;
  let project_id: string | null = null;
  let projectMatch: string | null = null;

  // Extract status (@today, @anytime, @inbox)
  const statusMatch = title.match(/@(today|anytime|inbox)\b/i);
  if (statusMatch) {
    status = statusMatch[1].toLowerCase() as TaskStatus;
    title = title.replace(statusMatch[0], "").trim();
  }

  // Extract project (#project-name)
  const projectTagMatch = title.match(/#(\S+)/);
  if (projectTagMatch) {
    const projectName = projectTagMatch[1].toLowerCase();
    const matchedProject = findProjectByName(projectName, projects);
    if (matchedProject) {
      project_id = matchedProject.id;
      projectMatch = matchedProject.title;
    }
    title = title.replace(projectTagMatch[0], "").trim();
  }

  // Extract due date (tomorrow, today)
  const todayMatch = title.match(/\btoday\b/i);
  const tomorrowMatch = title.match(/\btomorrow\b/i);

  if (tomorrowMatch) {
    const tomorrow = addDays(startOfDay(new Date()), 1);
    due_date = tomorrow.toISOString();
    // If no explicit status set, default to "today" for dated tasks
    if (!statusMatch) {
      status = "today";
    }
    title = title.replace(tomorrowMatch[0], "").trim();
  } else if (todayMatch) {
    due_date = startOfDay(new Date()).toISOString();
    // If no explicit status set, default to "today" for dated tasks
    if (!statusMatch) {
      status = "today";
    }
    title = title.replace(todayMatch[0], "").trim();
  }

  // Clean up extra whitespace
  title = title.replace(/\s+/g, " ").trim();

  return {
    title,
    due_date,
    status,
    project_id,
    projectMatch,
  };
}

/**
 * Fuzzy match project by name
 * Matches if project title starts with or contains the search term
 */
function findProjectByName(
  searchTerm: string,
  projects: Project[]
): Project | null {
  const normalizedSearch = searchTerm.toLowerCase();

  // First, try exact match
  const exactMatch = projects.find(
    (p) => p.title.toLowerCase() === normalizedSearch
  );
  if (exactMatch) return exactMatch;

  // Then, try starts-with match
  const startsWithMatch = projects.find((p) =>
    p.title.toLowerCase().startsWith(normalizedSearch)
  );
  if (startsWithMatch) return startsWithMatch;

  // Finally, try contains match
  const containsMatch = projects.find((p) =>
    p.title.toLowerCase().includes(normalizedSearch)
  );
  if (containsMatch) return containsMatch;

  return null;
}

/**
 * Get project suggestions for autocomplete
 */
export function getProjectSuggestions(
  searchTerm: string,
  projects: Project[],
  limit: number = 5
): Project[] {
  if (!searchTerm) return projects.slice(0, limit);

  const normalizedSearch = searchTerm.toLowerCase();

  return projects
    .filter(
      (p) =>
        p.title.toLowerCase().startsWith(normalizedSearch) ||
        p.title.toLowerCase().includes(normalizedSearch)
    )
    .slice(0, limit);
}

/**
 * Extract current tag being typed (for suggestions)
 */
export function extractCurrentTag(
  input: string,
  cursorPosition: number
): { type: "project" | "status" | null; value: string; startIndex: number } {
  // Get text up to cursor
  const textBeforeCursor = input.slice(0, cursorPosition);

  // Check for project tag (#)
  const projectMatch = textBeforeCursor.match(/#(\S*)$/);
  if (projectMatch) {
    return {
      type: "project",
      value: projectMatch[1],
      startIndex: projectMatch.index!,
    };
  }

  // Check for status tag (@)
  const statusMatch = textBeforeCursor.match(/@(\S*)$/);
  if (statusMatch) {
    return {
      type: "status",
      value: statusMatch[1],
      startIndex: statusMatch.index!,
    };
  }

  return { type: null, value: "", startIndex: -1 };
}

/**
 * Status options for suggestions
 */
export const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "anytime", label: "Anytime" },
  { value: "inbox", label: "Inbox" },
];

/**
 * Filter status options based on search term
 */
export function getStatusSuggestions(
  searchTerm: string
): { value: TaskStatus; label: string }[] {
  if (!searchTerm) return STATUS_OPTIONS;

  const normalizedSearch = searchTerm.toLowerCase();
  return STATUS_OPTIONS.filter(
    (opt) =>
      opt.value.startsWith(normalizedSearch) ||
      opt.label.toLowerCase().startsWith(normalizedSearch)
  );
}
