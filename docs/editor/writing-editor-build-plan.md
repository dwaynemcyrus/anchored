# Anchored Writing Editor — Build Plan (Phase 2)

Status: working plan
Scope: writing editor only (no public export, no search, no graph, no AI)

## Goals
- Anchored is the only place writing happens.
- Distraction-free markdown editor with live preview.
- Frontmatter editing with collection-specific fields.
- Manual publish and manual snapshots.
- Stored in Supabase; no Git in write path.

## Non-Goals (Phase 2)
- Search, graph view, AI, collaboration.
- Full revision history UI.
- Public site export pipeline (trigger only).

## Milestones

### 1) Data & Schema
- Create migration: rename `documents.content_type` -> `documents.collection` (open text; current: `notes | essays | linked`).
- Update `visibility` check to `public | personal | private`.
- Add columns:
  - `canonical` (text)
  - `tags` (text[])
  - `date` (date)
- Add `document_versions` table:
  - Fields: `id`, `document_id`, `created_at`, `title`, `slug`, `summary`,
    `body_md`, `status`, `visibility`, `collection`, `metadata`, `canonical`,
    `tags`, `date`, `published_at`, `snapshot_reason`
  - Indexes: `document_id`, `created_at` (desc)
  - RLS: owner-only, matching `documents.user_id`
- Add retention policy: keep newest 24 snapshots per document
  - Enforced in app logic during snapshot creation.
- Update `types/database.ts` to match new schema.

### 2) Data Access Layer
- Add hooks for documents:
  - `useDocuments` (list by collection/status/visibility)
  - `useDocument` (by id)
  - `useCreateDocument`
  - `useUpdateDocument` (debounced autosave)
  - `usePublishDocument`
  - `useCreateSnapshot`
- Wiki-link suggestions:
  - `useDocumentSuggestions` (title/slug query)
- Ensure all hooks use React Query patterns used in tasks/habits.

### 3) Routes & Screens
- `app/(app)/writing/page.tsx`: document list
  - filter by `collection`, `status`, `visibility`
  - "New document" action
- `app/(app)/writing/[documentId]/page.tsx`: editor surface
  - split view editor/preview toggle
  - frontmatter panel
  - status/visibility controls
  - publish + snapshot actions
- Optional: `app/(app)/writing/[documentId]/preview` if preview needs isolation

### 4) Editor Components
- `components/editor/markdown-editor.tsx`
  - markdown editing surface
  - debounced autosave
  - `[[` wiki-link suggestions
- `components/editor/preview-pane.tsx`
  - markdown render
  - resolve wiki-links to local routes
- `components/editor/frontmatter-panel.tsx`
  - canonical fields
  - conditional fields for `notes | essays | linked`
- `components/editor/version-menu.tsx`
  - snapshot list (last 24)
  - restore snapshot action (optional Phase 2.1)

### 5) Publish + Snapshot Behavior
- Manual "Save snapshot" button creates `document_versions` row.
- Publish:
  - set `status=published`, `published_at=now`
  - create snapshot with `snapshot_reason=publish`
  - trigger export job (stubbed hook or API call).

### 6) Styling & Layout
- CSS Modules only.
- Semantic class names (`editor-surface`, `frontmatter-panel`, etc.).
- Distraction-free layout (no heavy UI chrome).

## MVP Validation Checklist
- Create new doc in < 2 seconds.
- Autosave works without manual action.
- Frontmatter edits persist correctly.
- Manual publish creates snapshot.
- Snapshot count capped at 24.
- Wiki-link suggestions show and insert correctly.

- [ ] Wire CodeMirror 6 in for editor