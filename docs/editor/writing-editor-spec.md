# Anchored Writing Editor — Schema + UX Spec (Phase 2)

Status: working spec
Scope: editor schema + UX flows only (no implementation details)
Source of truth for Phase 2 writing surface decisions.

## Core Decisions (Locked)
- Anchored is the only authoring surface.
- Supabase is the single source of truth.
- `collection` replaces `content_type`.
- `visibility` is independent of `status`.
- `date` is an editorial field (separate from `published_at`).
- `document_versions` exists with manual snapshots plus publish snapshots.
- Snapshot cap is 24 per document.

## Visibility Semantics
- `public`: eligible for public export.
- `personal`: personal-only, not public and not in private community.
- `private`: internal-only, never exported.

## Document Schema (Phase 2)
Canonical columns (existing or required):
- `id`, `user_id`
- `title`, `slug`
- `body_md`
- `summary`
- `status` (`draft | published | archived`)
- `visibility` (`public | personal | private`)
- `collection` (open text; current: `notes | essays | linked`)
- `canonical`
- `tags` (array)
- `date` (editorial date)
- `published_at`, `created_at`, `updated_at`
- `metadata` (JSON for collection-specific fields)

Collection-specific metadata:
- `notes`: `source` (text), `chains` (text)
- `essays`: `resources` (array), `visual` (boolean)
- `linked`: `source_url` (text), `source_title` (text)

## Document Versions (Snapshots)
Snapshots are stored in `document_versions` for recovery and publishing history.

Creation rules:
- Manual "Save snapshot" button creates a snapshot.
- Publishing also creates a snapshot automatically.
- Autosave does not create snapshots.

Retention:
- Keep the newest 24 snapshots per document.
- On create: if count > 24, delete the oldest by `created_at`.

Minimum snapshot fields:
- `id`, `document_id`, `created_at`
- `title`, `slug`, `summary`
- `body_md`
- `status`, `visibility`, `collection`
- `metadata`, `canonical`, `tags`, `date`
- `published_at` (if publishing)
- `snapshot_reason` (`manual | publish`)

## Editor UX Flows
Create:
- New document starts as `draft`, `visibility=private`, `collection` = last used.
- `slug` auto-generated from `title`, with manual override.

Write:
- Distraction-free editor with autosave (debounced).
- Status + timestamps update on save.

Preview:
- Live preview toggle (split or tab).

Wiki-links:
- `[[` opens doc suggestions by title/slug.
- Links are stored as plain text in `body_md`.

Frontmatter panel:
- Structured UI for `title`, `summary`, `collection`, `visibility`, `status`,
  `tags`, `canonical`, `date`, plus collection-specific metadata fields.

Publish:
- Manual publish sets `status=published` and `published_at=now`.
- Publish triggers export (public site build pipeline).

Archive:
- Archive sets `status=archived`. Document remains in DB.
