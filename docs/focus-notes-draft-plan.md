# Focus Notes Draft Persistence Plan

Goal: Make focus notes persist across in-app navigation and browser refresh for a limited time, and keep the draft in sync between the Focus sheet and the Quick Stop modal. TTL: 8 hours.

## Requirements
- Draft notes persist across route changes and full page refresh.
- Draft notes appear in both the Focus sheet and Quick Stop modal.
- Drafts expire after 8 hours.
- Each task maintains its own draft.
- Draft clears after the time entry is saved (stop/end flow).

## Implementation Plan
1. Storage helper
   - Add a small localStorage helper that reads/writes drafts keyed by task ID.
   - Store `{ value, updatedAt }` for each task.
   - On read, drop entries older than 8 hours.
   - Keep storage in a single key, e.g. `focus_notes_drafts`.

2. In-memory state
   - Maintain a `focusNotesByTask` map in state for fast reads/updates.
   - On page mount, hydrate the map from localStorage, filtering by TTL.

3. Focus sheet integration
   - When a task is selected, read its draft from `focusNotesByTask`.
   - On textarea change, update `focusNotesByTask` and write to localStorage.

4. Quick stop modal integration
   - Use the same `focusNotesByTask` map, keyed by the task being stopped.
   - Show the same draft text as the Focus sheet.
   - On note change, update `focusNotesByTask` and write to localStorage.

5. Clearing drafts
   - When Stop/End completes successfully, remove that task’s draft from:
     - `focusNotesByTask`
     - localStorage

6. Edge cases
   - If there is no active task ID, keep the textarea disabled or empty.
   - If the draft is empty, store an empty string or remove the draft entry.
   - Ensure the TTL pruning runs on load and on every read.

## TTL Details
- TTL: 8 hours (28,800,000 ms).
- Compare `Date.now()` to `updatedAt`.
- Drop any draft older than TTL before hydrating state.

## Success Checklist
- Switch between Focus and Inbox, return to Focus: note is still there.
- Refresh the page: note persists if within 8 hours.
- Stop/End focus: note is saved and draft is cleared.
- Draft appears identically in Focus sheet and Quick Stop modal.
