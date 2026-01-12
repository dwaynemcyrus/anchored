# Phase 2: Collections, Daily Notes & Search Implementation Plan

## Overview
Extend the writing app with document organization (collections & tags), daily notes workflow, command palette search, and UI polish.

## Phase 1 Completion Status
All 11 chunks completed:
- Tiptap Editor with markdown serialization
- Focus Mode & Typewriter Mode
- WikiLink extension with autocomplete
- Hybrid markdown rendering (Bear-style)
- Callout extension (Obsidian-style)
- Floating toolbar
- Keyboard shortcuts

## Phase 2 Goals
1. **Collections & Tags** - Organize documents by type and topic
2. **Daily Notes** - Quick daily journaling workflow
3. **Command Palette** - Fast search and navigation (Cmd+K)
4. **UI Polish** - Loading states, empty states, animations

---

## Implementation Chunks

### Chunk 1: Command Palette Foundation
**Goal:** Install cmdk and create base Command Palette component

**Tasks:**
- Install `cmdk` package
- Create `/components/writer/ui/CommandPalette.tsx`
- Create `/components/writer/ui/CommandPalette.module.css`
- Basic modal with input and list
- Global keyboard shortcut (Cmd+K)
- Close on escape, click outside

**Files to create:**
- `/components/writer/ui/CommandPalette.tsx`
- `/components/writer/ui/CommandPalette.module.css`

**Commit:** `feat: add command palette foundation`

---

### Chunk 2: Document Search in Command Palette
**Goal:** Search documents by title from command palette

**Tasks:**
- Integrate with existing `useDocumentSuggestions` hook
- Show recent documents when no query
- Filter documents as user types (debounced 150ms)
- Display title, collection badge, date
- Navigate to document on select (Enter or click)
- Keyboard navigation (arrow keys)

**Files to modify:**
- `/components/writer/ui/CommandPalette.tsx`
- `/lib/hooks/use-documents.ts` (if needed)

**Commit:** `feat: add document search to command palette`

---

### Chunk 3: Full-Text Search
**Goal:** Search document content, not just titles

**Tasks:**
- Create Supabase function for full-text search (if not exists)
- Add `useFullTextSearch` hook
- Query `search_vector` column with `ts_rank`
- Show content snippets with highlighted matches
- Fallback to title search if no content matches

**Database (if needed):**
```sql
-- Ensure search_vector exists and is indexed
ALTER TABLE documents ADD COLUMN IF NOT EXISTS search_vector tsvector;
CREATE INDEX IF NOT EXISTS idx_documents_search ON documents USING GIN(search_vector);
```

**Files to create/modify:**
- `/lib/hooks/use-search.ts`
- `/components/writer/ui/CommandPalette.tsx`

**Commit:** `feat: add full-text search`

---

### Chunk 4: Command Palette Actions
**Goal:** Add quick actions to command palette

**Tasks:**
- Add action groups: Documents, Actions, Navigation
- Actions: New Document, Today's Note, Toggle Focus Mode, Toggle Typewriter Mode
- Show keyboard shortcuts next to actions
- Filter actions by query
- Execute action on select

**Actions to support:**
| Action | Shortcut |
|--------|----------|
| New Document | Cmd+N |
| Today's Note | Cmd+D |
| Toggle Focus Mode | Cmd+Shift+F |
| Toggle Typewriter Mode | Cmd+Shift+T |
| Save | Cmd+S |

**Files to modify:**
- `/components/writer/ui/CommandPalette.tsx`

**Commit:** `feat: add command palette actions`

---

### Chunk 5: Daily Notes - Core Logic
**Goal:** Create/open daily notes with Cmd+D

**Tasks:**
- Create `useDailyNote` hook
- Generate slug: `daily-YYYY-MM-DD`
- Generate title: `January 12, 2026` (formatted)
- Check if today's note exists
- Create if not, navigate if exists
- Set collection to `daily`
- Auto-tag with `daily`

**Files to create:**
- `/lib/hooks/use-daily-note.ts`

**Files to modify:**
- `/lib/writer/tiptap/extensions/KeyboardShortcuts.ts` (add Cmd+D)

**Commit:** `feat: add daily notes core logic`

---

### Chunk 6: Daily Notes - Navigation
**Goal:** Navigate between daily notes

**Tasks:**
- Add previous day shortcut: Cmd+Shift+[
- Add next day shortcut: Cmd+Shift+]
- Only active when viewing a daily note
- Create note if it doesn't exist (or just navigate to date)
- Show date in header when viewing daily note

**Files to modify:**
- `/lib/hooks/use-daily-note.ts`
- `/lib/writer/tiptap/extensions/KeyboardShortcuts.ts`
- `/app/(app)/writing/[documentId]/page.tsx`

**Commit:** `feat: add daily note navigation`

---

### Chunk 7: Collection Filter UI
**Goal:** Filter documents by collection in sidebar/list

**Tasks:**
- Create `CollectionFilter` component
- Show collection tabs: All, Notes, Essays, Linked, Daily
- Highlight active collection
- Update document list on filter change
- Persist filter in URL query param or localStorage

**Files to create:**
- `/components/writer/documents/CollectionFilter.tsx`
- `/components/writer/documents/CollectionFilter.module.css`

**Files to modify:**
- `/app/(app)/writing/page.tsx` (document list page)

**Commit:** `feat: add collection filter`

---

### Chunk 8: Tag System - Display & Filter
**Goal:** Display tags on documents and filter by tag

**Tasks:**
- Create `TagBadge` component for displaying tags
- Show tags in document list items
- Create `TagFilter` component (sidebar or dropdown)
- Click tag to filter documents
- Multi-tag filtering (AND logic)
- Show tag count in filter UI

**Files to create:**
- `/components/writer/documents/TagBadge.tsx`
- `/components/writer/documents/TagBadge.module.css`
- `/components/writer/documents/TagFilter.tsx`
- `/components/writer/documents/TagFilter.module.css`

**Commit:** `feat: add tag display and filtering`

---

### Chunk 9: Tag Input with Autocomplete
**Goal:** Add/edit tags on documents with autocomplete

**Tasks:**
- Create `TagInput` component
- Fetch all existing tags for autocomplete
- Comma-separated input with tag pills
- Click to remove tag
- Keyboard: Enter to add, Backspace to remove last
- Integrate into frontmatter panel

**Files to create:**
- `/components/writer/documents/TagInput.tsx`
- `/components/writer/documents/TagInput.module.css`

**Files to modify:**
- `/components/editor/frontmatter-panel.tsx`

**Commit:** `feat: add tag input with autocomplete`

---

### Chunk 10: Collection Metadata Editor
**Goal:** Edit collection-specific metadata fields

**Tasks:**
- Show different fields based on collection type
- Notes: source, chains
- Essays: resources, visual flag
- Linked: source_url, source_title
- Daily: (date only, auto-set)
- Integrate into frontmatter panel

**Metadata by collection:**
```typescript
// Notes
{ source?: string; chains?: string }

// Essays
{ resources?: string[]; visual?: boolean }

// Linked
{ source_url?: string; source_title?: string }

// Daily
{ } // No extra metadata
```

**Files to modify:**
- `/components/editor/frontmatter-panel.tsx`

**Commit:** `feat: add collection metadata editor`

---

### Chunk 11: Loading States
**Goal:** Add loading indicators throughout the app

**Tasks:**
- Create `Skeleton` component for loading placeholders
- Document list loading skeleton
- Editor loading state
- Search results loading
- Button loading states (saving, publishing)

**Files to create:**
- `/components/writer/ui/Skeleton.tsx`
- `/components/writer/ui/Skeleton.module.css`

**Files to modify:**
- Various components to add loading states

**Commit:** `feat: add loading states`

---

### Chunk 12: Empty States
**Goal:** Add helpful empty states

**Tasks:**
- No documents: "Create your first document" with button
- No search results: "No documents match your search"
- No documents in collection: "No {collection} documents yet"
- No tags: "Add tags to organize your documents"

**Files to create:**
- `/components/writer/ui/EmptyState.tsx`
- `/components/writer/ui/EmptyState.module.css`

**Files to modify:**
- `/app/(app)/writing/page.tsx`
- `/components/writer/ui/CommandPalette.tsx`

**Commit:** `feat: add empty states`

---

### Chunk 13: Toast Notifications
**Goal:** Show feedback for user actions

**Tasks:**
- Create `Toast` component using Radix Toast
- Create `ToastProvider` and `useToast` hook
- Toast types: success, error, info
- Auto-dismiss after 3 seconds
- Show on: save, publish, error

**Files to create:**
- `/components/writer/ui/Toast.tsx`
- `/components/writer/ui/Toast.module.css`
- `/lib/hooks/use-toast.ts`

**Commit:** `feat: add toast notifications`

---

### Chunk 14: Animations & Transitions
**Goal:** Polish UI with smooth animations

**Tasks:**
- Command palette enter/exit animation
- Document list item transitions
- Filter transitions
- Toast slide-in animation
- Skeleton pulse animation
- Focus mode opacity transitions (already done, verify)

**Files to modify:**
- Various CSS modules to add animations

**Commit:** `style: add animations and transitions`

---

### Chunk 15: Footnote Extension
**Goal:** Add footnote support to editor

**Tasks:**
- Create Footnote mark extension
- Syntax: `[^1]` for reference, `[^1]: text` for definition
- Render as superscript number
- Hover to preview footnote content
- Click to jump to definition
- Auto-number footnotes

**Files to create:**
- `/lib/writer/tiptap/extensions/Footnote.ts`

**Files to modify:**
- `/components/writer/editor/TiptapEditor.tsx`
- `/components/writer/editor/TiptapEditor.module.css`

**Commit:** `feat: add footnote extension`

---

## Verification

After each chunk:
1. Run `npm run build` to check for TypeScript errors
2. Run `npm run dev` and test the feature manually
3. Test keyboard shortcuts work correctly
4. Verify existing features still work
5. Check for console errors

---

## Dependencies to Install

```bash
npm install cmdk @radix-ui/react-toast date-fns
```

---

## File Structure After Phase 2

```
/components/writer/
  /editor/
    TiptapEditor.tsx
    TiptapEditor.module.css
    EditorToolbar.tsx
    EditorToolbar.module.css
  /documents/
    CollectionFilter.tsx
    CollectionFilter.module.css
    TagBadge.tsx
    TagBadge.module.css
    TagFilter.tsx
    TagFilter.module.css
    TagInput.tsx
    TagInput.module.css
  /ui/
    CommandPalette.tsx
    CommandPalette.module.css
    Skeleton.tsx
    Skeleton.module.css
    EmptyState.tsx
    EmptyState.module.css
    Toast.tsx
    Toast.module.css

/lib/writer/
  /tiptap/
    /extensions/
      FocusMode.ts
      TypewriterMode.ts
      WikiLink.ts
      HybridMarks.ts
      Callout.ts
      KeyboardShortcuts.ts
      Footnote.ts
    /suggestions/
      wikiLinkSuggestion.tsx

/lib/hooks/
  use-documents.ts (existing)
  use-daily-note.ts
  use-search.ts
  use-toast.ts
```

---

## Keyboard Shortcuts After Phase 2

| Shortcut | Action |
|----------|--------|
| Cmd+K | Open command palette |
| Cmd+N | New document |
| Cmd+D | Today's daily note |
| Cmd+S | Save |
| Cmd+Shift+F | Toggle focus mode |
| Cmd+Shift+T | Toggle typewriter mode |
| Cmd+Shift+[ | Previous daily note |
| Cmd+Shift+] | Next daily note |
| Cmd+B | Bold |
| Cmd+I | Italic |
| Cmd+Shift+X | Strikethrough |
| Cmd+Shift+C | Inline code |
| Cmd+Shift+O | Toggle callout |
| Escape | Close command palette |

---

## Database Considerations

### Full-Text Search Setup (if not exists)
```sql
-- Add search vector column
ALTER TABLE documents ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create index
CREATE INDEX IF NOT EXISTS idx_documents_search ON documents USING GIN(search_vector);

-- Create trigger function
CREATE OR REPLACE FUNCTION documents_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.body_md, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS documents_search_update ON documents;
CREATE TRIGGER documents_search_update
  BEFORE INSERT OR UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION documents_search_trigger();

-- Backfill existing documents
UPDATE documents SET search_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(body_md, '')), 'B');
```

---

## Success Criteria

Phase 2 is complete when:
- [ ] Command palette opens with Cmd+K
- [ ] Can search documents by title and content
- [ ] Can create/open daily notes with Cmd+D
- [ ] Can navigate between daily notes
- [ ] Can filter documents by collection
- [ ] Can filter documents by tags
- [ ] Can add/edit tags with autocomplete
- [ ] Loading states show while fetching data
- [ ] Empty states guide users
- [ ] Toast notifications confirm actions
- [ ] Animations feel smooth and polished
- [ ] Footnotes work in editor

---

## Deferred to Phase 3+

- Wiki-link backlinks panel
- Document link graph
- Slash commands (/)
- Image upload/paste
- Table editing improvements
- Mobile responsive layout
- PWA & offline support
