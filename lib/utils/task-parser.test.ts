/**
 * Task Parser Tests
 *
 * Run with: npx tsx lib/utils/task-parser.test.ts
 *
 * Examples from Phase 1 brief:
 * - "Call dentist tomorrow" → title: "Call dentist", due_date: tomorrow, status: "active"
 * - "Buy milk #errands" → title: "Buy milk", project matched
 * - "Review docs @anytime" → title: "Review docs", task_location: "anytime"
 */

import { parseTaskInput, getProjectSuggestions, extractCurrentTag } from "./task-parser";

// Mock projects for testing
const mockProjects = [
  { id: "1", title: "Errands" },
  { id: "2", title: "Work" },
  { id: "3", title: "Side Project" },
  { id: "4", title: "Home Improvement" },
];

console.log("=== Task Parser Tests ===\n");

// Test 1: "Call dentist tomorrow"
console.log('Test 1: "Call dentist tomorrow"');
const result1 = parseTaskInput("Call dentist tomorrow", mockProjects);
console.log("  Result:", {
  title: result1.title,
  status: result1.status,
  has_due_date: !!result1.due_date,
});
console.log(
  "  Expected: title='Call dentist', status='active', has_due_date=true"
);
console.log(
  "  PASS:",
  result1.title === "Call dentist" &&
    result1.status === "active" &&
    result1.due_date !== null
);
console.log();

// Test 2: "Buy milk #errands"
console.log('Test 2: "Buy milk #errands"');
const result2 = parseTaskInput("Buy milk #errands", mockProjects);
console.log("  Result:", {
  title: result2.title,
  projectMatch: result2.projectMatch,
  project_id: result2.project_id,
});
console.log("  Expected: title='Buy milk', projectMatch='Errands'");
console.log(
  "  PASS:",
  result2.title === "Buy milk" && result2.projectMatch === "Errands"
);
console.log();

// Test 3: "Review docs @anytime"
console.log('Test 3: "Review docs @anytime"');
const result3 = parseTaskInput("Review docs @anytime", mockProjects);
console.log("  Result:", {
  title: result3.title,
  status: result3.status,
  task_location: result3.task_location,
});
console.log("  Expected: title='Review docs', task_location='anytime'");
console.log(
  "  PASS:",
  result3.title === "Review docs" && result3.task_location === "anytime"
);
console.log();

// Test 4: Combined - "Fix bug #work @active tomorrow"
console.log('Test 4: "Fix bug #work @active tomorrow" (combined)');
const result4 = parseTaskInput("Fix bug #work @active tomorrow", mockProjects);
console.log("  Result:", {
  title: result4.title,
  status: result4.status,
  projectMatch: result4.projectMatch,
  has_due_date: !!result4.due_date,
});
console.log(
  "  Expected: title='Fix bug', status='active', projectMatch='Work', has_due_date=true"
);
console.log(
  "  PASS:",
  result4.title === "Fix bug" &&
    result4.status === "active" &&
    result4.projectMatch === "Work" &&
    result4.due_date !== null
);
console.log();

// Test 5: Plain text - "Just a simple task"
console.log('Test 5: "Just a simple task" (plain text, default status)');
const result5 = parseTaskInput("Just a simple task", mockProjects);
console.log("  Result:", {
  title: result5.title,
  status: result5.status,
  task_location: result5.task_location,
  project_id: result5.project_id,
  due_date: result5.due_date,
});
console.log(
  "  Expected: title='Just a simple task', task_location='inbox' (default)"
);
console.log(
  "  PASS:",
  result5.title === "Just a simple task" &&
    result5.task_location === "inbox" &&
    result5.project_id === null
);
console.log();

// Test 6: Project suggestions
console.log("Test 6: getProjectSuggestions");
const suggestions = getProjectSuggestions("err", mockProjects);
console.log("  Input: 'err'");
console.log(
  "  Result:",
  suggestions.map((p) => p.title)
);
console.log("  Expected: ['Errands']");
console.log(
  "  PASS:",
  suggestions.length === 1 && suggestions[0].title === "Errands"
);
console.log();

// Test 7: Extract current tag
console.log("Test 7: extractCurrentTag");
const tag1 = extractCurrentTag("Buy milk #err", 13);
console.log("  Input: 'Buy milk #err', cursor at position 13");
console.log("  Result:", tag1);
console.log("  Expected: type='project', value='err'");
console.log("  PASS:", tag1.type === "project" && tag1.value === "err");
console.log();

const tag2 = extractCurrentTag("Task @to", 8);
console.log("  Input: 'Task @to', cursor at position 8");
console.log("  Result:", tag2);
console.log("  Expected: type='status', value='to'");
console.log("  PASS:", tag2.type === "status" && tag2.value === "to");
console.log();

// Test 8: Fuzzy project matching
console.log("Test 8: Fuzzy project matching");
const result6 = parseTaskInput("Task #side", mockProjects);
console.log("  Input: '#side'");
console.log("  Result:", result6.projectMatch);
console.log("  Expected: 'Side Project' (contains match)");
console.log("  PASS:", result6.projectMatch === "Side Project");
console.log();

// Test 9: Today keyword
console.log('Test 9: "Meeting today"');
const result7 = parseTaskInput("Meeting today", mockProjects);
console.log("  Result:", {
  title: result7.title,
  status: result7.status,
  has_due_date: !!result7.due_date,
});
console.log("  Expected: title='Meeting', status='active', has_due_date=true");
console.log(
  "  PASS:",
  result7.title === "Meeting" &&
    result7.status === "active" &&
    result7.due_date !== null
);
console.log();

console.log("=== All Tests Complete ===");
