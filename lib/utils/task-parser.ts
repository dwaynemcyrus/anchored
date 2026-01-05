import { addDays, startOfDay } from "date-fns";
import type { TaskLocation, TaskStatus } from "@/types/database";

export interface ParsedTask {
  title: string;
  due_date: string | null;
  status: TaskStatus;
  task_location: TaskLocation;
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
 * - "@anytime", "@inbox" → sets task_location, "@active" or "@backlog" → sets status
 * - "#project-name" → looks up project by title (fuzzy match)
 * - Everything else becomes the task title
 *
 * Examples:
 * - "Call dentist tomorrow" → { title: "Call dentist", due_date: tomorrow, status: "active" }
 * - "Buy milk #errands" → { title: "Buy milk", project_id: matched_id }
 * - "Review docs @anytime" → { title: "Review docs", task_location: "anytime" }
 */
export function parseTaskInput(
  input: string,
  projects: Project[] = [],
  defaultStatus: TaskStatus = "backlog",
  defaultLocation: TaskLocation = "inbox"
): ParsedTask {
  let title = input.trim();
  let due_date: string | null = null;
  let status: TaskStatus = defaultStatus;
  let task_location: TaskLocation = defaultLocation;
  let project_id: string | null = null;
  let projectMatch: string | null = null;

  // Extract status/location tags (@active, @backlog, @anytime, @inbox)
  const statusMatch = title.match(/@(active|backlog|anytime|inbox)\b/i);
  if (statusMatch) {
    const tag = statusMatch[1].toLowerCase();
    if (tag === "active") {
      status = "active";
    } else if (tag === "backlog") {
      status = "backlog";
    } else if (tag === "anytime") {
      task_location = "anytime";
    } else if (tag === "inbox") {
      task_location = "inbox";
    }
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
      task_location = "project";
    }
    title = title.replace(projectTagMatch[0], "").trim();
  }

  // Extract due date (tomorrow, today)
  const todayMatch = title.match(/\btoday\b/i);
  const tomorrowMatch = title.match(/\btomorrow\b/i);

  if (tomorrowMatch) {
    const tomorrow = addDays(startOfDay(new Date()), 1);
    due_date = tomorrow.toISOString();
    // If no explicit status set, default to "active" for dated tasks
    if (!statusMatch) {
      status = "active";
    }
    title = title.replace(tomorrowMatch[0], "").trim();
  } else if (todayMatch) {
    due_date = startOfDay(new Date()).toISOString();
    // If no explicit status set, default to "active" for dated tasks
    if (!statusMatch) {
      status = "active";
    }
    title = title.replace(todayMatch[0], "").trim();
  }

  // Clean up extra whitespace
  title = title.replace(/\s+/g, " ").trim();

  return {
    title,
    due_date,
    status,
    task_location,
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
export const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "backlog", label: "Backlog" },
  { value: "anytime", label: "Anytime" },
  { value: "inbox", label: "Inbox" },
];

/**
 * Filter status options based on search term
 */
export function getStatusSuggestions(
  searchTerm: string
): { value: string; label: string }[] {
  if (!searchTerm) return STATUS_OPTIONS;

  const normalizedSearch = searchTerm.toLowerCase();
  return STATUS_OPTIONS.filter(
    (opt) =>
      opt.value.startsWith(normalizedSearch) ||
      opt.label.toLowerCase().startsWith(normalizedSearch)
  );
}
