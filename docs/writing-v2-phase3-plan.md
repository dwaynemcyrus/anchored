# Phase 3: Document Management & Polish

## Overview
Enhance document management with version history, backlinks, statistics, and quality-of-life features.

## Current State
- Tiptap editor with hybrid markdown, focus mode, typewriter mode (Phase 1)
- Command palette, search, daily notes, tags, collections (Phase 2)
- Snapshots are created on publish/manual save but no UI to view them
- No backlinks, stats, or export functionality

## Implementation Chunks

### Chunk 1: Version History Panel
**Goal:** View and restore document snapshots

**Tasks:**
- Create `/components/writer/documents/VersionHistory.tsx`
- List snapshots with date, reason (manual/publish), and preview
- Show diff or full content on selection
- Add "Restore" action to revert document to snapshot
- Integrate into Info sheet or as separate panel
- Use existing `useDocumentVersions` hook

**Files to create:**
- `/components/writer/documents/VersionHistory.tsx`
- `/components/writer/documents/VersionHistory.module.css`

**Files to modify:**
- `/app/(app)/writing/[documentId]/page.tsx` - add version history trigger

**Commit:** `feat: add version history panel`

---

### Chunk 2: Version Diff View
**Goal:** Compare snapshot to current document

**Tasks:**
- Create simple diff display (additions/deletions)
- Highlight changed sections
- Show metadata changes (title, tags, status)
- Use color coding: green for additions, red for deletions

**Files to create:**
- `/components/writer/documents/VersionDiff.tsx`
- `/components/writer/documents/VersionDiff.module.css`
- `/lib/utils/diff.ts` - simple line-based diff algorithm

**Commit:** `feat: add version diff view`

---

### Chunk 3: Backlinks
**Goal:** Show documents that link to the current document

**Tasks:**
- Create `/lib/hooks/use-backlinks.ts`
- Query documents where `body_md` contains `[[slug]]` pattern
- Create `/components/writer/documents/BacklinksPanel.tsx`
- Display as list with title and snippet of linking context
- Click to navigate to linking document
- Show count in header/info panel

**Files to create:**
- `/lib/hooks/use-backlinks.ts`
- `/components/writer/documents/BacklinksPanel.tsx`
- `/components/writer/documents/BacklinksPanel.module.css`

**Files to modify:**
- `/app/(app)/writing/[documentId]/page.tsx` - add backlinks section

**Commit:** `feat: add backlinks panel`

---

### Chunk 4: Document Statistics
**Goal:** Show word count, reading time, character count

**Tasks:**
- Create `/lib/utils/document-stats.ts` with calculation functions
- Word count (split on whitespace)
- Character count (with/without spaces)
- Reading time (words / 200 wpm)
- Paragraph count
- Create `/components/writer/documents/DocumentStats.tsx`
- Show in footer or info panel
- Update in real-time as user types

**Files to create:**
- `/lib/utils/document-stats.ts`
- `/components/writer/documents/DocumentStats.tsx`
- `/components/writer/documents/DocumentStats.module.css`

**Files to modify:**
- `/app/(app)/writing/[documentId]/page.tsx` - integrate stats display

**Commit:** `feat: add document statistics`

---

### Chunk 5: Document Actions Menu
**Goal:** Delete, duplicate, and archive documents

**Tasks:**
- Add `useDeleteDocument` mutation to use-documents.ts
- Add `useDuplicateDocument` mutation
- Create actions dropdown in editor header
- Confirmation dialog for delete (using Radix AlertDialog)
- Duplicate creates copy with "(Copy)" suffix
- Archive changes status to "archived"
- Navigate to /writing after delete

**Files to create:**
- `/components/writer/documents/DocumentActions.tsx`
- `/components/writer/documents/DocumentActions.module.css`

**Files to modify:**
- `/lib/hooks/use-documents.ts` - add delete/duplicate mutations
- `/app/(app)/writing/[documentId]/page.tsx` - add actions menu

**Commit:** `feat: add document actions menu`

---

### Chunk 6: Export to Markdown
**Goal:** Download document as .md file

**Tasks:**
- Create export function that builds markdown with frontmatter
- Include YAML frontmatter (title, date, tags, collection, etc.)
- Trigger browser download with `Blob` and `URL.createObjectURL`
- Add "Export" option to document actions menu
- Filename: `{slug}.md`

**Files to create:**
- `/lib/utils/export-markdown.ts`

**Files to modify:**
- `/components/writer/documents/DocumentActions.tsx` - add export option

**Commit:** `feat: add markdown export`

---

### Chunk 7: Copy to Clipboard
**Goal:** Quick copy document content

**Tasks:**
- Copy as plain markdown (body only)
- Copy as markdown with frontmatter
- Copy as HTML (rendered)
- Show toast/feedback on copy
- Add to document actions menu

**Files to modify:**
- `/components/writer/documents/DocumentActions.tsx`
- `/lib/utils/export-markdown.ts` - add clipboard functions

**Commit:** `feat: add copy to clipboard`

---

### Chunk 8: Document List Improvements
**Goal:** Better document browsing experience

**Tasks:**
- Add sort options (updated, created, title, status)
- Add status filter (draft/published/archived)
- Persist filter preferences in localStorage
- Show document count in header
- Empty state for filtered results

**Files to create:**
- `/components/writer/documents/SortSelect.tsx`
- `/components/writer/documents/StatusFilter.tsx`

**Files to modify:**
- `/app/(app)/writing/page.tsx` - integrate new filters

**Commit:** `feat: improve document list filters`

---

### Chunk 9: Keyboard Shortcuts Help
**Goal:** Show available shortcuts in command palette

**Tasks:**
- Create shortcuts reference data structure
- Add "Keyboard Shortcuts" action to command palette
- Show modal with categorized shortcuts
- Categories: Navigation, Editing, Formatting, Modes

**Files to create:**
- `/components/writer/ui/ShortcutsModal.tsx`
- `/components/writer/ui/ShortcutsModal.module.css`
- `/lib/writer/shortcuts.ts` - shortcuts data

**Files to modify:**
- `/components/writer/ui/CommandPalette.tsx` - add shortcuts action

**Commit:** `feat: add keyboard shortcuts help`

---

### Chunk 10: Quick Switcher Enhancement
**Goal:** Recent documents and better navigation

**Tasks:**
- Track recently opened documents in localStorage
- Show "Recent" section in command palette when empty query
- Limit to 5 most recent
- Add Cmd+Shift+O shortcut for "Open Recent"
- Exclude current document from recent list

**Files to create:**
- `/lib/hooks/use-recent-documents.ts`

**Files to modify:**
- `/components/writer/ui/CommandPalette.tsx`
- `/app/(app)/writing/[documentId]/page.tsx` - track opens

**Commit:** `feat: add recent documents`

---

## Verification

After each chunk:
1. Run `npm run build` to check for TypeScript errors
2. Run `npm run dev` and test the feature manually
3. Verify existing features still work
4. Check for console errors

## File Structure

```
/components/writer/
  /documents/
    VersionHistory.tsx
    VersionHistory.module.css
    VersionDiff.tsx
    VersionDiff.module.css
    BacklinksPanel.tsx
    BacklinksPanel.module.css
    DocumentStats.tsx
    DocumentStats.module.css
    DocumentActions.tsx
    DocumentActions.module.css
    SortSelect.tsx
    StatusFilter.tsx

  /ui/
    ShortcutsModal.tsx
    ShortcutsModal.module.css

/lib/
  /hooks/
    use-backlinks.ts
    use-recent-documents.ts

  /utils/
    diff.ts
    document-stats.ts
    export-markdown.ts

  /writer/
    shortcuts.ts
```

## Dependencies

No new npm dependencies required. Uses existing:
- Radix UI (Dialog, AlertDialog, DropdownMenu)
- date-fns for formatting
- Existing Supabase client

## Notes

- Version history uses existing `document_versions` table
- Backlinks query uses ILIKE on body_md (no new indexes needed)
- Export builds proper YAML frontmatter for static site compatibility
- Recent documents stored in localStorage for simplicity
