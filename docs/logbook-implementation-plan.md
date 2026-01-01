# Logbook Implementation Plan

## Overview

Implement a "Logbook" feature (modeled after Things 3) that serves as the terminal ledger for completed and deleted items, with soft-delete, restore, and 60-day auto-purge for deleted items only.

---

## Phase 1: Database Schema Changes

### 1.1 New Fields for `tasks` Table

```sql
-- Already exists: completed_at TIMESTAMPTZ NULL

-- New fields:
deleted_at TIMESTAMPTZ NULL
deleted_reason TEXT NULL  -- 'user_deleted' | 'project_deleted'
deleted_parent_id UUID NULL  -- references projects.id for cascade tracking
```

### 1.2 New Fields for `projects` Table

```sql
completed_at TIMESTAMPTZ NULL
deleted_at TIMESTAMPTZ NULL
```

### 1.3 New Fields for `habits` Table

```sql
deleted_at TIMESTAMPTZ NULL
```

Note: Habits don't need `completed_at` (they have daily `habit_entries`) or cascade tracking (no child entities).

### 1.4 Indexes

```sql
-- For logbook queries
CREATE INDEX idx_tasks_completed_at ON tasks(completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX idx_tasks_deleted_at ON tasks(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_projects_completed_at ON projects(completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX idx_projects_deleted_at ON projects(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_habits_deleted_at ON habits(deleted_at) WHERE deleted_at IS NOT NULL;

-- Partial index for active items (optimize normal queries)
CREATE INDEX idx_tasks_active ON tasks(owner_id, status)
  WHERE completed_at IS NULL AND deleted_at IS NULL;
CREATE INDEX idx_projects_active ON projects(owner_id)
  WHERE completed_at IS NULL AND deleted_at IS NULL;
CREATE INDEX idx_habits_active ON habits(owner_id)
  WHERE deleted_at IS NULL;
```

### 1.5 Migration File

Create: `supabase/migrations/YYYYMMDD_add_logbook_fields.sql`

**Key considerations:**
- All existing queries that fetch tasks/projects must be updated to exclude `deleted_at IS NOT NULL`
- The `completed_at` field already exists and is used; no change needed there
- RLS policies remain unchanged (owner-based)

---

## Phase 2: Update Existing Queries

### 2.1 Tasks Queries (`use-tasks.ts`)

Update all task fetching to exclude deleted items by default:

```typescript
// Add to all task queries:
.is("deleted_at", null)
```

**Files to modify:**
- `/lib/hooks/use-tasks.ts` - All query functions
- Any server actions or API routes fetching tasks

### 2.2 Projects Queries (`use-projects.ts`)

Update project fetching to exclude deleted projects:

```typescript
// Add to useProjects query:
.is("deleted_at", null)
```

**Files to modify:**
- `/lib/hooks/use-projects.ts`

### 2.3 Habits Queries (`use-habits.ts`)

Update habit fetching to exclude deleted habits:

```typescript
// Add to useHabits query:
.is("deleted_at", null)
```

**Files to modify:**
- `/lib/hooks/use-habits.ts`

---

## Phase 3: Data Access Layer (Hooks)

### 3.1 New Hook: `use-logbook.ts`

Location: `/lib/hooks/use-logbook.ts`

**Query Keys:**
```typescript
export const logbookKeys = {
  all: ["logbook"] as const,
  lists: () => [...logbookKeys.all, "list"] as const,
  completed: (filters) => [...logbookKeys.lists(), "completed", filters] as const,
  deleted: (filters) => [...logbookKeys.lists(), "deleted", filters] as const,
};
```

**Functions to implement:**

| Function | Purpose |
|----------|---------|
| `useLogbookItems({ state, entityType, dateRange, limit })` | Fetch completed OR deleted items with date filtering |
| `useRestoreTask()` | Restore a completed or deleted task |
| `useRestoreProject()` | Restore a completed or deleted project (with cascade) |
| `useRestoreHabit()` | Restore a deleted habit |
| `useSoftDeleteTask()` | Soft delete a task |
| `useSoftDeleteProject()` | Soft delete a project with cascade |
| `useSoftDeleteHabit()` | Soft delete a habit |
| `useHardDeleteTask()` | Permanently delete from logbook |
| `useHardDeleteProject()` | Permanently delete project |
| `useHardDeleteHabit()` | Permanently delete habit |
| `useCompleteProject()` | Mark project as completed |

**Date Range Filtering:**
```typescript
interface LogbookFilters {
  state: 'completed' | 'deleted';
  entityType?: 'task' | 'project' | 'habit' | 'all';
  dateRange: { from: Date; to: Date };  // Default: last 30 days
}
```

### 3.2 Update `use-tasks.ts`

**Modify `useToggleTaskComplete`:**
- Keep existing behavior (already sets `completed_at`)
- Ensure it clears `deleted_at` if restoring from deleted state

**Modify `useDeleteTask`:**
- Change from hard delete to soft delete
- Set `deleted_at = now()`
- Set `deleted_reason = 'user_deleted'`

### 3.3 Update `use-projects.ts`

**Add `useCompleteProject`:**
- Set `completed_at = now()` on project
- Tasks remain active (completion is about the project goal, not tasks)

**Add `useSoftDeleteProject`:**
- Set `deleted_at = now()` on project
- Cascade: Update all project tasks with:
  - `deleted_at = now()`
  - `deleted_reason = 'project_deleted'`
  - `deleted_parent_id = project.id`

### 3.4 Update `use-habits.ts`

**Add `useSoftDeleteHabit`:**
- Set `deleted_at = now()` on habit
- Habit entries are preserved (historical data)
- Deleted habits don't appear in active habit views

---

## Phase 4: Restore Logic

### 4.1 Restore Completed Task

```typescript
async function restoreCompletedTask(taskId: string) {
  // 1. Fetch task to get project_id
  // 2. Check if project exists and is not deleted
  // 3. If project missing/deleted: set task_location = 'inbox', project_id = null
  // 4. Clear completed_at
  // 5. Set status to last known (default: 'today')
  // Return: { restored: true, movedToInbox: boolean }
}
```

### 4.2 Restore Deleted Task

```typescript
async function restoreDeletedTask(taskId: string) {
  // 1. Check deleted_at is within 60 days
  // 2. Fetch task to get project_id, completed_at state
  // 3. If project missing/deleted: set task_location = 'inbox', project_id = null
  // 4. Clear deleted_at, deleted_reason, deleted_parent_id
  // 5. Clear completed_at (deletion supersedes completion)
  // 6. Set status to 'today' (or last known active status)
  // Return: { restored: true, movedToInbox: boolean }
}
```

### 4.3 Restore Completed Project

```typescript
async function restoreCompletedProject(projectId: string) {
  // 1. Fetch project
  // 2. Clear completed_at
  // 3. Project returns to active state
  // 4. Tasks are NOT affected (they remain in their current state)
  // Return: { restored: true }
}
```

### 4.4 Restore Deleted Project

```typescript
async function restoreDeletedProject(projectId: string) {
  // 1. Check deleted_at is within 60 days
  // 2. Clear project deleted_at
  // 3. Find tasks where:
  //    - deleted_parent_id = projectId
  //    - deleted_reason = 'project_deleted'
  //    - NOT independently deleted after project (check timestamps)
  // 4. For qualifying tasks: clear deleted_at, deleted_reason, deleted_parent_id
  // 5. Do NOT restore tasks where deleted_reason = 'user_deleted' after project deletion
  // Return: { projectRestored: true, tasksRestored: number }
}
```

### 4.5 Restore Deleted Habit

```typescript
async function restoreDeletedHabit(habitId: string) {
  // 1. Check deleted_at is within 60 days
  // 2. Clear deleted_at
  // 3. Habit returns to active state
  // 4. Historical habit_entries are preserved and visible again
  // Return: { restored: true }
}
```

---

## Phase 5: Auto-Purge Job

### 5.1 Supabase Edge Function + Cron

Create: `supabase/functions/purge-deleted-items/index.ts`

```typescript
// Runs daily via Supabase cron
// DELETE FROM tasks WHERE deleted_at < now() - interval '60 days'
// DELETE FROM projects WHERE deleted_at < now() - interval '60 days'
// DELETE FROM habits WHERE deleted_at < now() - interval '60 days'
// NEVER touch completed_at items (they persist forever)
```

**Cron schedule:** `0 3 * * *` (3 AM daily)

**Why Supabase Edge Function:**
- Keeps database logic close to data
- Runs regardless of frontend deployment state
- No cold start issues for scheduled jobs

---

## Phase 6: UI Components

### 6.1 Navigation Update

**File:** `/components/layout/sidebar.tsx`

Add Logbook to navigation array:
```typescript
{ name: "Logbook", href: "/logbook", icon: Archive }
```

Position: After "Review", before any settings/footer items.

### 6.2 Logbook Page

**File:** `/app/(app)/logbook/page.tsx`

**Structure:**
```
┌─────────────────────────────────────────┐
│ [Archive Icon]                          │
│ Logbook                                 │
│ Completed and deleted items             │
├─────────────────────────────────────────┤
│ [Completed] [Deleted]     [Date Range ▾]│
│                           Last 30 days  │
├─────────────────────────────────────────┤
│ January 2026                            │
│ ├─ Task Title                           │
│ │  Completed Tue, Jan 14                │
│ ├─ Project: Project Name                │
│ │  Completed Mon, Jan 13                │
│ ├─ Task Title                           │
│ │  Completed Mon, Jan 13                │
│                                         │
│ December 2025                           │
│ ├─ Habit: Morning Routine               │
│ │  Deleted Wed, Dec 18 · Purges in 42d  │
│ ├─ Task Title                           │
│ │  Deleted Wed, Dec 18 · Purges in 42d  │
└─────────────────────────────────────────┘
```

**Date Range Options:**
- Last 7 days
- Last 30 days (default)
- Last 90 days
- This year
- All time
- Custom range (date picker)

### 6.3 New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `LogbookToggle` | `/components/logbook/logbook-toggle.tsx` | Completed/Deleted state switch |
| `LogbookDateRange` | `/components/logbook/logbook-date-range.tsx` | Date range dropdown + custom picker |
| `LogbookList` | `/components/logbook/logbook-list.tsx` | Grouped list by month |
| `LogbookItem` | `/components/logbook/logbook-item.tsx` | Single item with subtext (handles task/project/habit) |
| `LogbookItemActions` | `/components/logbook/logbook-item-actions.tsx` | Restore, Permanent Delete |
| `DeleteConfirmDialog` | `/components/logbook/delete-confirm-dialog.tsx` | Soft delete confirmation |
| `ProjectDeleteDialog` | `/components/logbook/project-delete-dialog.tsx` | With cascade warning |
| `HabitDeleteDialog` | `/components/logbook/habit-delete-dialog.tsx` | Habit delete confirmation |

### 6.4 Logbook Item Display

**Entity type indicator (prefix):**
- Tasks: No prefix (default)
- Projects: `Project:` prefix
- Habits: `Habit:` prefix

**Completed subtext:**
```
Completed Tue, Mar 5
```

**Deleted subtext:**
```
Deleted Tue, Mar 5 · Purges in 42 days
```

**Purge countdown calculation:**
```typescript
const purgeDate = addDays(new Date(deleted_at), 60);
const daysRemaining = differenceInDays(purgeDate, new Date());
// Show "Purges in X days" or "Purges today" or "Purges tomorrow"
```

### 6.5 Delete Confirmation Dialogs

**Task Delete:**
```
Delete Task?
This task will be moved to the Logbook and permanently deleted after 60 days.
[Cancel] [Delete]
```

**Project Delete:**
```
Delete Project?
⚠️ All tasks associated with this project will also be moved to the Logbook.
[Cancel] [Delete]
```

**Habit Delete:**
```
Delete Habit?
This habit will be moved to the Logbook and permanently deleted after 60 days.
Historical entries will be preserved.
[Cancel] [Delete]
```

---

## Phase 7: Update Existing Delete UX

### 7.1 Task Deletion Points

Update these locations to use soft delete with confirmation:

| Location | Current Behavior | New Behavior |
|----------|------------------|--------------|
| `TaskDetailDrawer` | Hard delete with confirm | Soft delete with confirm |
| `InboxProcessor` | Hard delete (no confirm?) | Soft delete with confirm |
| Task context menus | Hard delete | Soft delete with confirm |

### 7.2 Project Deletion Points

| Location | Current Behavior | New Behavior |
|----------|------------------|--------------|
| Project settings/detail | Hard delete | Soft delete + cascade warning |

### 7.3 Habit Deletion Points

| Location | Current Behavior | New Behavior |
|----------|------------------|--------------|
| Habit detail/settings | Hard delete | Soft delete with confirm |

---

## Phase 8: Styling Guidelines

Per spec: "Minimal, typography-first, dark-mode friendly"

- Use existing Tailwind utilities
- Month headers: `text-sm font-medium text-muted-foreground`
- Item titles: `text-sm font-medium`
- Subtext: `text-xs text-muted-foreground`
- Purge warning: `text-xs text-orange-500` (or muted)
- No animations per spec
- Toggle: Use existing `Tabs` or `ToggleGroup` from shadcn/ui

---

## Phase 9: Testing Checklist

### Unit Tests

**Tasks:**
- [ ] Completing task sets `completed_at`, appears in logbook
- [ ] Completed tasks persist indefinitely (no auto-purge)
- [ ] Soft delete sets `deleted_at`, removes from active views
- [ ] Restore completed task clears `completed_at`
- [ ] Restore deleted task clears all delete fields
- [ ] Restore unavailable after purge

**Projects:**
- [ ] Completing project sets `completed_at`, appears in logbook
- [ ] Completed projects persist indefinitely (no auto-purge)
- [ ] Project cascade sets `deleted_reason = 'project_deleted'` on tasks
- [ ] Restore project restores cascade-deleted tasks only
- [ ] Tasks deleted after project deletion are NOT restored
- [ ] Restore completed project clears `completed_at`, tasks unaffected

**Habits:**
- [ ] Soft delete habit sets `deleted_at`, removes from active views
- [ ] Deleted habit entries are preserved
- [ ] Restore deleted habit clears `deleted_at`
- [ ] Restored habit shows historical entries

**Auto-Purge:**
- [ ] Auto-purge only affects items with `deleted_at > 60 days`
- [ ] Completed items are NEVER purged
- [ ] Purge runs for tasks, projects, and habits

### Manual QA

- [ ] Logbook appears in sidebar
- [ ] Toggle switches between Completed/Deleted views
- [ ] Date range filter works (default 30 days)
- [ ] Items grouped by month, sorted by day (newest first)
- [ ] Tasks, projects, and habits all appear correctly
- [ ] Subtext shows correct date and purge countdown
- [ ] Restore returns task to correct location (or Inbox if container missing)
- [ ] Restore shows banner if moved to Inbox
- [ ] Delete confirmation appears for tasks
- [ ] Project delete shows cascade warning
- [ ] Habit delete shows confirmation
- [ ] Permanent delete only available in Deleted view

---

## Implementation Order

1. **Database migration** - Add fields, indexes
2. **Update existing queries** - Exclude deleted items
3. **Soft delete mutations** - Replace hard deletes
4. **Restore mutations** - Implement restore logic
5. **Logbook hook** - Data fetching for logbook
6. **Logbook page + components** - UI
7. **Update delete UX** - Add confirmations everywhere
8. **Auto-purge job** - Scheduled cleanup
9. **Testing** - Unit + manual QA

---

## Files to Create

```
supabase/migrations/YYYYMMDD_add_logbook_fields.sql
supabase/functions/purge-deleted-items/index.ts
lib/hooks/use-logbook.ts
app/(app)/logbook/page.tsx
components/logbook/logbook-toggle.tsx
components/logbook/logbook-date-range.tsx
components/logbook/logbook-list.tsx
components/logbook/logbook-item.tsx
components/logbook/logbook-item-actions.tsx
components/logbook/delete-confirm-dialog.tsx
components/logbook/project-delete-dialog.tsx
components/logbook/habit-delete-dialog.tsx
```

## Files to Modify

```
types/database.ts (regenerate after migration)
lib/hooks/use-tasks.ts
lib/hooks/use-projects.ts
lib/hooks/use-habits.ts
components/layout/sidebar.tsx
components/tasks/task-detail-drawer.tsx
components/review/inbox-processor.tsx
components/habits/* (habit delete touchpoints)
components/projects/* (project delete/complete touchpoints)
```

---

## Decisions

1. **Purge job hosting:** Supabase Edge Function (keeps database logic close to data, runs regardless of frontend deployment)
2. **Completed items view:** Date range filtering, default to last 30 days
3. **Project completion:** Yes, projects will have a `completed_at` field separate from deletion
4. **Habits:** Yes, habits will support soft delete and appear in logbook
