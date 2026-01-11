# Phase 1: Tiptap Editor Implementation Plan

## Overview
Replace CodeMirror with Tiptap to enable Bear-style hybrid markdown editing in the writing app.

## Current State
- CodeMirror 6 editor at `/components/editor/codemirror-editor-plain.tsx`
- Simple interface: `value: string`, `onChange: (value: string) => void`
- Auto-save at page level (800ms debounce)
- CSS Modules for all styling (no Tailwind)

## Implementation Chunks

### Chunk 1: Tiptap Foundation
**Goal:** Install Tiptap and create basic editor component

**Tasks:**
- Install Tiptap packages (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm`)
- Create `/components/writer/editor/TiptapEditor.tsx`
- Create `/components/writer/editor/TiptapEditor.module.css`
- Implement controlled component with `value`/`onChange` props
- Add markdown serialization (Tiptap JSON <-> markdown string)

**Files to create:**
- `/components/writer/editor/TiptapEditor.tsx`
- `/components/writer/editor/TiptapEditor.module.css`

**Commit:** `feat: add Tiptap editor foundation`

---

### Chunk 2: Writing Page Integration
**Goal:** Replace CodeMirror with Tiptap in the writing page

**Tasks:**
- Update `/app/(app)/writing/[documentId]/page.tsx` to use TiptapEditor
- Verify auto-save works correctly
- Test document loading and saving

**Files to modify:**
- `/app/(app)/writing/[documentId]/page.tsx`

**Commit:** `feat: integrate Tiptap into writing page`

---

### Chunk 3: Editor Prose Styling
**Goal:** Style the editor content for good typography

**Tasks:**
- Style headings (h1-h6)
- Style paragraphs, lists, blockquotes
- Style code blocks and inline code
- Style links
- Add placeholder text styling

**Files to modify:**
- `/components/writer/editor/TiptapEditor.module.css`

**Commit:** `style: add Tiptap prose styles`

---

### Chunk 4: Focus Mode
**Goal:** Dim non-active paragraphs for distraction-free writing

**Tasks:**
- Create focus mode extension or CSS approach
- Track active paragraph based on cursor position
- Dim other paragraphs to 30% opacity
- Add toggle state and keyboard shortcut (Cmd+Shift+F)
- Persist preference in localStorage

**Files to create/modify:**
- `/lib/writer/tiptap/extensions/FocusMode.ts`
- `/components/writer/editor/TiptapEditor.tsx`
- `/components/writer/editor/TiptapEditor.module.css`

**Commit:** `feat: add focus mode`

---

### Chunk 5: Typewriter Mode
**Goal:** Keep current line vertically centered

**Tasks:**
- Create typewriter scrolling extension
- Scroll to center cursor position on typing
- Add toggle state and keyboard shortcut (Cmd+Shift+T)
- Disable on manual scroll, re-enable on typing
- Persist preference in localStorage

**Files to create/modify:**
- `/lib/writer/tiptap/extensions/TypewriterMode.ts`
- `/components/writer/editor/TiptapEditor.tsx`

**Commit:** `feat: add typewriter mode`

---

### Chunk 6: WikiLink Extension (Basic)
**Goal:** Parse and render `[[wiki-links]]`

**Tasks:**
- Create WikiLink node extension
- Parse `[[slug]]` and `[[slug|Display Text]]` syntax
- Render as styled link
- Different styling for existing vs non-existent documents
- Click to navigate

**Files to create:**
- `/lib/writer/tiptap/extensions/WikiLink.ts`

**Commit:** `feat: add wiki-link extension`

---

### Chunk 7: WikiLink Autocomplete
**Goal:** Show document suggestions when typing `[[`

**Tasks:**
- Create suggestion plugin for WikiLink
- Query documents using `useDocumentSuggestions` hook
- Show dropdown with matching documents
- Insert selected document as wiki-link
- Keyboard navigation (arrows, enter, escape)

**Files to modify:**
- `/lib/writer/tiptap/extensions/WikiLink.ts`

**Commit:** `feat: add wiki-link autocomplete`

---

### Chunk 8: Hybrid Markdown Rendering
**Goal:** Bear-style editing - show formatted text, reveal syntax on cursor

**Tasks:**
- Create cursor-aware decorations for marks (bold, italic, code)
- Show `**` when cursor is inside bold text
- Show `*` when cursor is inside italic text
- Show backticks when cursor is inside inline code
- Smooth transitions between states

**Files to create/modify:**
- `/lib/writer/tiptap/extensions/HybridMarks.ts`
- `/components/writer/editor/TiptapEditor.module.css`

**Commit:** `feat: add hybrid markdown rendering`

---

### Chunk 9: Callout Extension (Optional - can defer)
**Goal:** Obsidian-style callout blocks

**Tasks:**
- Create Callout node extension
- Support types: note, tip, warning, danger
- Parse `> [!type] Title` syntax
- Render as colored box with icon
- Cursor-aware rendering (show raw syntax when editing)

**Files to create:**
- `/lib/writer/tiptap/extensions/Callout.ts`
- Callout styles in TiptapEditor.module.css

**Commit:** `feat: add callout extension`

---

### Chunk 10: Floating Toolbar
**Goal:** Show formatting options on text selection

**Tasks:**
- Create toolbar component
- Show on text selection, hide when collapsed
- Buttons: Bold, Italic, Code, Link, Heading
- Position above selection
- Use Radix UI Popover for positioning

**Files to create:**
- `/components/writer/editor/EditorToolbar.tsx`
- `/components/writer/editor/EditorToolbar.module.css`

**Commit:** `feat: add floating editor toolbar`

---

### Chunk 11: Keyboard Shortcuts
**Goal:** Standard editor shortcuts

**Tasks:**
- Cmd+B: Bold
- Cmd+I: Italic
- Cmd+Shift+X: Strikethrough
- Cmd+Shift+C: Inline code
- Cmd+K: Insert link
- Cmd+S: Manual save
- Configure in Tiptap extensions

**Files to modify:**
- `/components/writer/editor/TiptapEditor.tsx`

**Commit:** `feat: add editor keyboard shortcuts`

---

## Deferred to Phase 2+
- Footnote extension
- Full callout extension (if skipped in Phase 1)

## Verification

After each chunk:
1. Run `npm run build` to check for TypeScript errors
2. Run `npm run dev` and test the feature manually
3. Verify auto-save still works
4. Check for console errors

## Dependencies to Install

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/pm @tiptap/extension-link @tiptap/extension-placeholder @tiptap/suggestion
```

## File Structure

```
/components/writer/
  /editor/
    TiptapEditor.tsx
    TiptapEditor.module.css
    EditorToolbar.tsx
    EditorToolbar.module.css

/lib/writer/
  /tiptap/
    /extensions/
      FocusMode.ts
      TypewriterMode.ts
      WikiLink.ts
      HybridMarks.ts
      Callout.ts
```
