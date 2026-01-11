# Writing V2 Rebuild Plan

## Scope
- New routes live under `/writing-v2`.
- Use Radix primitives directly (no shadcn/ui wrappers).
- No Tailwind; CSS Modules only (match `/projects`).
- CodeMirror 6 is the editor core (plain text first).
- No database schema changes in this phase.

## Phases

### Phase 1 — Routes + Shell
**Goal:** Stand up list and editor routes with correct header pattern and scroll behavior.
- List header: Back (left), Collections button near Back, New (right).
- Editor header: Back (left), Info | More (right).
- Single inner scroll container (app shell pattern).
- Editor uses CodeMirror 6 in plain-text mode.

**Exit conditions:**
- `/writing-v2` and `/writing-v2/[documentId]` load without errors.
- Typing works in the editor (no markdown rendering yet).

### Phase 2 — List Layout
**Goal:** Match list layout from references.
- Row layout: title, snippet, last edited date.
- No collection label in rows.
- Pinned label omitted for now.

**Exit conditions:**
- List rows match target layout and spacing.
- Scroll behavior matches app shell.

### Phase 3 — Collections Drawer (Fullscreen)
**Goal:** Fullscreen collection drawer.
- Radix Dialog fullscreen overlay.
- Data-driven collections (notes/essays/linked) from existing documents.
- Filter list by selected collection.

**Exit conditions:**
- Drawer opens/closes cleanly and filters correctly.

### Phase 4 — Editor Info Sheet
**Goal:** Right-side full-height Info sheet (desktop + mobile).
- Radix Dialog styled as right-side sheet.
- “Info” triggers sheet.
- Uses a slim info view (reuse/trim FrontmatterPanel).

**Exit conditions:**
- Sheet opens/closes; editor remains usable.

### Phase 5 — Quick Capture Integration
**Goal:** Add “New document” in quick capture.
- Row under input field triggers new document creation.
- Route to `/writing-v2/[documentId]` after create.

**Exit conditions:**
- New doc creates and opens in `/writing-v2`.

### Phase 6 — Markdown Rendering (Deferred Until Layout Locked)
**Goal:** Reintroduce rendering with stable UX.
- Decide line/block hybrid rules.
- Render inactive text with markdown markers hidden.
- Keep editing reliable on iOS.

**Phase 6 Behavior Spec (Bear-like live markdown):**
- Live rendering scope: full document rendered at all times.
- Active edit rules:
  - Caret line is raw (markers visible).
  - All selected lines are raw (markers visible).
  - All other lines rendered with markers hidden.
- Inline formatting:
  - Bold/italic/strikethrough render with markers hidden.
  - Markers appear only when caret touches/adjacent to markers.
  - Underscore emphasis inside words stays literal (no rendering).
- Links:
  - Clickable when not editing.
  - When editing inside, show full `[text](url)` and disable click.
  - If caret is inside label or URL, show both marker sets.
- Code:
  - Inline code renders; backticks visible only when caret touches/adjacent.
  - Code blocks render as plain monospace; fences visible while editing.
- Headings/lists/quotes/HR:
  - Rendered with markers hidden unless caret touches/adjacent.
  - HR shows raw when caret is on the line.
- Task lists:
  - Render checkboxes; clickable when not editing.
  - Raw markers show when editing the line.
- Escapes: hidden in rendered mode.
- No images/embeds in Phase 6.
- Stability priority: consistency over iOS glitch workarounds (no fallback).

**Exit conditions:**
- Rendered view matches expected “Bear-like” behavior.
- No editor errors or selection issues.

## Future Features (Deferred)
- Pinned documents (data model + list ordering).
- Task count in list rows.
- iOS custom toolbar (app-level toolbar; native keyboard cannot be controlled).
- Advanced markdown features (tables, callouts, footnotes, etc.).
- Offline sync/persistence improvements beyond existing adapters.

## Verification
- `npm run build`
- Manual: open `/writing-v2`, create doc, edit, open Info sheet, open Collections drawer.
