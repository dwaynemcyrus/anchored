Logbook built with pure CSS no Typescript, no animations.

Goal: Implement a “Logbook” feature (modeled after Things 3) that serves as the **terminal ledger** for completed and deleted items, with **confirmed soft-delete**, **restore**, and **60-day auto-purge for deleted items only**.

────────────────────────
NON-NEGOTIABLE RULES
────────────────────────

Core semantics
- The Logbook is the terminal state for items that are **no longer active**.
- There are TWO distinct terminal states:
  1) **Completed** (archival, permanent)
  2) **Deleted** (soft-deleted, time-boxed)

These states must NEVER be conflated.

────────────────────────
COMPLETION RULES
────────────────────────

- Completing a task:
  - Removes it from all active views
  - Moves it into the Logbook
  - Sets `completed_at`
  - Does NOT set `deleted_at`
- Completed items:
  - Are read-only
  - Do NOT auto-purge
  - Persist indefinitely unless explicitly deleted later
- Completed items may be restored (un-completed) explicitly.
- Completion is archival, not erasure.

────────────────────────
DELETION RULES
────────────────────────

Deletion semantics
- Deleting an item NEVER immediately hard-deletes it.
- **Soft delete requires explicit user confirmation.**
- Deleted items move to the Logbook and are removed from all normal views.
- Deleted items are read-only except for Restore and Permanent Delete.
- Auto-purge: deleted items are permanently deleted after **60 days** from `deleted_at`.
- Restore returns the item to its **last known state**.
- “Permanent delete” is allowed only inside the Logbook (confirmation OK).
- Deletion rules apply consistently across entities.

Project-specific deletion
- **Soft deleting a Project must require confirmation AND display a warning message:**
  > “All tasks associated with this project will also be moved to the Logbook.”
- Soft deleting a Project cascades soft-delete to all related tasks.
- Restoring a Project restores its tasks unless a task was deleted independently afterward.

────────────────────────
LOGBOOK VISIBILITY & NAVIGATION
────────────────────────

- Logbook is a first-class destination.
- Entry point exists in the **main left-side navigation list**.
- No badge counts, no attention-grabbing indicators.

────────────────────────
LOGBOOK LIST BEHAVIOR (REQUIRED)
────────────────────────

Sorting & grouping
- Logbook items are sorted by **calendar day (newest first)**.
- Items are **grouped under month headers** (e.g. “March 2026”).
- Calendar day is the primary unit of meaning.

State filtering (required)
- Logbook UI must include a **layout switch / toggle** to filter:
  - **Completed**
  - **Deleted**
- Only one state is visible at a time.
- “All” view is optional but not required.

Subtext (required)
- Each item MUST display state-specific metadata subtext:
  - Completed example:
    - `Completed Tue, Mar 5`
  - Deleted example:
    - `Deleted Tue, Mar 5 · Purges in 42 days`
- Purge countdown is derived from `deleted_at` and the fixed 60-day rule.

────────────────────────
TECH ASSUMPTIONS
────────────────────────
(adapt as needed to the repo)

- Next.js App Router
- Supabase (Postgres)
- React Query (or similar)
- TypeScript everywhere

────────────────────────
DELIVERABLES
────────────────────────

1) **Data model / DB**
- Add fields (minimum: tasks, projects):
  - `completed_at TIMESTAMPTZ NULL`
  - `deleted_at TIMESTAMPTZ NULL`
  - `deleted_by UUID NULL` (if applicable)
- Add indexes:
  - `(completed_at)`
  - `(deleted_at)`
  - Partial index for active items:
    - `WHERE completed_at IS NULL AND deleted_at IS NULL`
- Implement cascading soft-delete for projects → tasks.
- Ensure normal queries exclude completed and deleted items by default.
- Logbook queries explicitly include completed OR deleted items.

2) **Auto-purge job**
- Permanently delete records where:
  `deleted_at < now() - interval '60 days'`
- Completed items are NEVER purged automatically.
- Implement via ONE of:
  - SQL function + pg_cron
  - Supabase scheduled Edge Function
  - Next.js Route Handler + Vercel Cron
- Must be idempotent and safe.

3) **Server / data access layer**
- Implement functions (tasks first, extensible):
  - `completeTask(id)`
  - `restoreCompletedTask(id)`
  - `softDeleteTask(id)`
  - `softDeleteProject(id)` (cascade)
  - `restoreTask(id)`
  - `hardDeleteTask(id)`
  - `listLogbookItems({ state: 'completed' | 'deleted', limit, cursor })`
- Ensure restore logic respects state correctly.

4) **UI**
- Add **Logbook** to the left-side navigation.
- Logbook screen:
  - Minimal, typography-first, dark-mode friendly
  - Month headers + day-sorted items
  - Layout switch to toggle **Completed / Deleted**
  - Each item shows:
    - Title
    - Required subtext
  - Actions:
    - Restore
    - Overflow → Permanent Delete (deleted only)
- Deletion UX:
  - Confirmation required for all soft deletes
  - Project delete confirmation includes cascade warning

5) **Tests / validation**
- Tests for:
  - Completion moves item to Logbook
  - Completed items persist
  - Soft delete removes from active views
  - Project cascade delete
  - Restore behavior
  - Auto-purge deletes only deleted items after 60 days
- Include a short manual QA checklist.


────────────────────────
RESTORE SEMANTICS (FORMAL SPEC — NON-NEGOTIABLE)
────────────────────────

Definition
- Restore means: **return an item to the last valid active state it had before entering its most recent terminal state**.
- Restore is NOT undo, NOT time travel, and NOT a merge of states.
- Restore always respects the **most recent user intent**.

Terminal states
- Completed
- Deleted

Restore always exits the most recent terminal state only.

────────────────────────
RESTORE RULES BY STATE
────────────────────────

1) Completed → Restore
- Remove `completed_at`
- Item returns to active state
- Restore item to:
  - Its last known container (project) IF it still exists
  - Otherwise restore to Inbox
- Restore never fails for completed items
- Show subtle, non-blocking banner if container is missing:
  - “Original project no longer exists. Item restored to Inbox.”

2) Deleted → Restore (time-bound)
- Restore is allowed ONLY if `deleted_at` is within the 60-day purge window
- Remove `deleted_at`
- Restore item to its last known active state
- If original container no longer exists:
  - Restore item to Inbox
- If item has already been auto-purged:
  - Restore is impossible
  - Item must not appear anywhere in UI or API

3) Completed → Deleted → Restore
- Deletion supersedes completion
- Restore returns item to **active, not completed**
- `completed_at` remains cleared
- Restore exits the most recent terminal state only

────────────────────────
PROJECT ↔ TASK CASCADE RESTORE (CRITICAL)
────────────────────────

Required data fields
- Tasks must track deletion cause, e.g.:
  - `deleted_reason` ENUM ('user_deleted', 'project_deleted')
  - `deleted_parent_id` (nullable)

Scenario A: Project deleted → tasks cascade deleted → project restored
- Restore project
- Restore ONLY tasks where:
  - `deleted_reason = 'project_deleted'`
  - AND task was not independently deleted afterward
- Tasks return to their previous state under the restored project

Scenario B: Project deleted → user later deletes a task → project restored
- Restore project
- DO NOT restore tasks that were:
  - Deleted independently by user after project deletion
- User intent takes precedence over cascade restore

Scenario C: Task deleted independently → project still active → restore task
- Restore task normally
- Project remains unchanged

────────────────────────
RESTORE FAILURE & SAFETY RULES
────────────────────────

- Restore must NEVER:
  - Recreate purged data
  - Guess missing relationships
  - Prompt the user with choices
  - Merge completed + deleted states
  - Restore into Strategy or Writing contexts

- Restore logic must be deterministic and silent.
- If restore conditions are not met, action should be unavailable or no-op.

────────────────────────
RESTORE DECISION TABLE (AUTHORITATIVE)
────────────────────────

| Situation                                   | Result                          |
|--------------------------------------------|---------------------------------|
| Completed item restored                     | Active item                     |
| Deleted item restored (≤ 60 days)           | Active item                     |
| Deleted item restored (> 60 days)           | Impossible                      |
| Project restored                            | Restore cascade-deleted tasks   |
| Task deleted after project deletion         | Do NOT restore                  |
| Original container missing                  | Restore to Inbox                |

Implement restore logic to follow this table exactly.

────────────────────────
IMPLEMENTATION REQUIREMENTS
────────────────────────

- Follow existing repo patterns.
- Use descriptive semantic CSS (no Tailwind).
- Avoid unnecessary dependencies.
- Clearly mark migrations, new files, and modified files.
- Provide clean diffs or full files where appropriate.

Start by inspecting the repository and proposing an implementation plan before writing code.