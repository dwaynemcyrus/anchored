# Personal Writing App - Project Specification

## Project Overview

A personal writing application inspired by iA Writer, Bear, and Obsidian, combining the best features of each into a unified PWA experience. Built on NextJS, Supabase, and Vercel infrastructure.

**Core Philosophy:** Smooth, bug-free markdown writing experience with live rendering, wiki-links, and seamless organization across private journals and public articles.

-----

## Technical Stack

### Frontend

- **Framework:** NextJS (existing setup)
- **Editor:** Tiptap (ProseMirror-based) for Bear-style live markdown rendering
- **Styling:** CSS Modules with descriptive semantic class names (no Tailwind)
- **UI Components:** Radix UI Primitives (unstyled, accessible components)
- **PWA:** Progressive Web App capabilities for Apple devices
- **Deployment:** Vercel (existing)

### Backend

- **Database:** Supabase PostgreSQL (existing)
- **Authentication:** Supabase Auth (existing)
- **Storage:** Supabase for markdown content
- **Search:** Supabase full-text search

### Key Libraries

- `@tiptap/react` - Editor framework
- `@tiptap/starter-kit` - Base extensions
- `@tiptap/extension-table` - Tables support
- `@tiptap/extension-task-list` - Task lists
- Custom extensions for: wiki-links, callouts, footnotes

-----

## Database Schema

### `documents` Table

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Markdown source
  collection_type TEXT NOT NULL DEFAULT 'note', -- 'journal', 'article', 'note', 'daily'
  metadata JSONB DEFAULT '{}', -- Collection-specific fields
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_collection_type CHECK (
    collection_type IN ('journal', 'article', 'note', 'daily')
  )
);

-- Indexes
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_slug ON documents(slug);
CREATE INDEX idx_documents_collection_type ON documents(collection_type);
CREATE INDEX idx_documents_tags ON documents USING GIN(tags);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);

-- Full-text search
ALTER TABLE documents ADD COLUMN search_vector tsvector;

CREATE INDEX idx_documents_search ON documents USING GIN(search_vector);

CREATE FUNCTION documents_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_search_update
  BEFORE INSERT OR UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION documents_search_trigger();

-- Updated_at trigger
CREATE FUNCTION update_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### `document_links` Table

```sql
CREATE TABLE document_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_doc_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  target_slug TEXT NOT NULL, -- May not exist yet (forward links)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(source_doc_id, target_slug)
);

-- Indexes
CREATE INDEX idx_document_links_source ON document_links(source_doc_id);
CREATE INDEX idx_document_links_target ON document_links(target_slug);
```

### Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_links ENABLE ROW LEVEL SECURITY;

-- Documents policies
CREATE POLICY "Users can view their own documents"
  ON documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
  ON documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
  ON documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
  ON documents FOR DELETE
  USING (auth.uid() = user_id);

-- Document links policies
CREATE POLICY "Users can view links for their documents"
  ON document_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_links.source_doc_id
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage links for their documents"
  ON document_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_links.source_doc_id
      AND documents.user_id = auth.uid()
    )
  );
```

-----

## Application Architecture

### Integration with Existing Codebase

This writing app is built as a **self-contained feature** within Cyrus’s existing NextJS + Supabase platform. It shares infrastructure but maintains clear boundaries.

**Shared Infrastructure:**

- Existing Supabase client and configuration
- Existing authentication system (Supabase Auth)
- Existing user session management
- Existing environment variables and secrets

**New Infrastructure:**

- New database tables: `documents`, `document_links`
- New routes under `/writer` (or chosen namespace)
- Self-contained component library
- Writing-specific utilities and hooks

**Code Organization:**

```
/app
  /dashboard              # Existing dashboard
  /writer                 # NEW: Writing app routes
    page.tsx              # Main writer interface
    layout.tsx            # Writer-specific layout
    /settings
      page.tsx            # Writer preferences
  /api
    /writer               # NEW: Writing-specific API routes
      /documents
        route.ts
      /documents/[id]
        route.ts
      /search
        route.ts
      /links
        route.ts

/components
  /writer                 # NEW: All writing app components
    /editor
      TiptapEditor.tsx
      TiptapEditor.module.css
      EditorToolbar.tsx
      EditorToolbar.module.css
      FocusMode.tsx
      FocusMode.module.css
      TypewriterMode.tsx
    /documents
      DocumentList.tsx
      DocumentList.module.css
      DocumentListItem.tsx
      DocumentListItem.module.css
      CollectionFilter.tsx
      TagFilter.tsx
    /search
      SearchBar.tsx
      SearchBar.module.css
      SearchResults.tsx
      SearchResults.module.css
    /navigation
      Sidebar.tsx
      Sidebar.module.css
      QuickAccess.tsx
    /ui                   # Radix-based primitives
      Dialog.tsx
      Dialog.module.css
      Dropdown.tsx
      Dropdown.module.css
      Command.tsx         # For Cmd+K palette
      Command.module.css

/lib
  /supabase               # Existing Supabase setup
    client.ts             # Shared client
  /writer                 # NEW: Writing-specific code
    /tiptap
      extensions/
        WikiLink.ts
        Callout.ts
        Footnote.ts
      config.ts
    /supabase
      queries.ts          # Writer-specific queries
      migrations.ts       # Database migrations
    /utils
      markdown.ts
      slug.ts
      wiki-links.ts
    
/hooks
  /writer                 # NEW: Writing-specific hooks
    useDocument.ts
    useDocuments.ts
    useSearch.ts
    useHotkeys.ts
    useAutoSave.ts

/styles
  /writer                 # NEW: Writing-specific styles
    globals.module.css    # Writer theme variables
    editor.module.css     # Editor-specific styles
    
/types
  /writer                 # NEW: Writing-specific types
    document.ts
    editor.ts
```

**Database Migrations:**

Create migration files in `/lib/writer/supabase/migrations/`:

- `001_create_documents_table.sql`
- `002_create_document_links_table.sql`
- `003_setup_full_text_search.sql`
- `004_setup_rls_policies.sql`

These can be run via Supabase CLI or dashboard.

**Routing Strategy:**

All writing app routes under `/writer` namespace:

- `/writer` - Main writing interface
- `/writer/settings` - Writer preferences
- `/writer/[slug]` - Direct document access (for sharing/bookmarking)

API routes under `/api/writer`:

- `/api/writer/documents` - CRUD operations
- `/api/writer/search` - Full-text search
- `/api/writer/links` - Wiki-link operations

### CSS & UI Framework Requirements

**No Tailwind CSS. No Shadcn UI.**

This project uses:

1. **CSS Modules** for all component styling
2. **Radix UI Primitives** for accessible UI components

**CSS Modules Approach:**

**Naming Convention:**

- Descriptive, semantic class names (not utility classes)
- BEM-style naming: `.componentName__element--modifier`
- Co-located with components: `Component.tsx` + `Component.module.css`

**Example Structure:**

```css
/* TiptapEditor.module.css */
.editor {
  /* Container styles */
}

.editor__content {
  /* Editable content area */
}

.editor__content--focused {
  /* Focused state */
}

.editor__toolbar {
  /* Toolbar container */
}

.editor__toolbar-button {
  /* Individual toolbar button */
}

.editor__toolbar-button--active {
  /* Active button state */
}
```

**Component Usage:**

```tsx
import styles from './TiptapEditor.module.css';

export function TiptapEditor() {
  return (
    <div className={styles.editor}>
      <div className={styles.editor__toolbar}>
        <button className={styles.editor__toolbarButton}>
          Bold
        </button>
      </div>
      <div className={styles.editor__content}>
        {/* Editor content */}
      </div>
    </div>
  );
}
```

**Global CSS Variables:**

Define design tokens in `/styles/writer/globals.module.css`:

```css
/* globals.module.css */
:root {
  /* Colors - Light Mode */
  --color-background: #ffffff;
  --color-surface: #f7f7f7;
  --color-border: #e0e0e0;
  --color-text-primary: #1a1a1a;
  --color-text-secondary: #6b6b6b;
  --color-accent: #007aff;
  --color-success: #34c759;
  --color-warning: #ff9500;
  --color-error: #ff3b30;
  
  /* Typography */
  --font-sans: 'SF Pro Display', 'Inter', system-ui, sans-serif;
  --font-mono: 'SF Mono', 'JetBrains Mono', monospace;
  
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 2rem;
  
  --line-height-tight: 1.25;
  --line-height-base: 1.5;
  --line-height-loose: 1.6;
  
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;
  
  /* Layout */
  --sidebar-width: 200px;
  --document-list-width: 280px;
  
  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-base: 200ms ease;
  --transition-slow: 300ms ease;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  
  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
}

[data-theme="dark"] {
  /* Colors - Dark Mode */
  --color-background: #1c1c1e;
  --color-surface: #2c2c2e;
  --color-border: #3a3a3c;
  --color-text-primary: #ffffff;
  --color-text-secondary: rgba(235, 235, 245, 0.6);
  --color-accent: #0a84ff;
  --color-success: #30d158;
  --color-warning: #ff9f0a;
  --color-error: #ff453a;
}
```

**Radix UI Primitives:**

Use Radix for accessible, unstyled UI components. Style them with CSS Modules.

**Required Radix Packages:**

```json
{
  "@radix-ui/react-dialog": "^1.0.0",           // Modals
  "@radix-ui/react-dropdown-menu": "^2.0.0",   // Dropdowns
  "@radix-ui/react-popover": "^1.0.0",         // Popovers
  "@radix-ui/react-tooltip": "^1.0.0",         // Tooltips
  "@radix-ui/react-switch": "^1.0.0",          // Toggle switches
  "@radix-ui/react-separator": "^1.0.0",       // Dividers
  "@radix-ui/react-scroll-area": "^1.0.0",     // Custom scrollbars
  "@radix-ui/react-context-menu": "^2.0.0",    // Right-click menus
  "@radix-ui/react-tabs": "^1.0.0"             // Tabs (if needed)
}
```

**Example: Dialog Component with Radix + CSS Modules**

```tsx
// /components/writer/ui/Dialog.tsx
import * as RadixDialog from '@radix-ui/react-dialog';
import styles from './Dialog.module.css';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, title, children }: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={styles.overlay} />
        <RadixDialog.Content className={styles.content}>
          <RadixDialog.Title className={styles.title}>
            {title}
          </RadixDialog.Title>
          <div className={styles.body}>
            {children}
          </div>
          <RadixDialog.Close className={styles.closeButton}>
            ×
          </RadixDialog.Close>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
```

```css
/* Dialog.module.css */
.overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  animation: fadeIn var(--transition-base);
}

.content {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  max-width: 500px;
  width: 90vw;
  box-shadow: var(--shadow-lg);
  animation: slideUp var(--transition-base);
}

.title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-md);
}

.body {
  color: var(--color-text-secondary);
  line-height: var(--line-height-base);
}

.closeButton {
  position: absolute;
  top: var(--spacing-md);
  right: var(--spacing-md);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-2xl);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.closeButton:hover {
  background-color: var(--color-border);
  color: var(--color-text-primary);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { 
    opacity: 0;
    transform: translate(-50%, -48%);
  }
  to { 
    opacity: 1;
    transform: translate(-50%, -50%);
  }
}
```

**Command Palette Component (for Cmd+K):**

Use `cmdk` library (by Radix team) + CSS Modules:

```bash
npm install cmdk
```

```tsx
// /components/writer/ui/Command.tsx
import { Command as CommandPrimitive } from 'cmdk';
import styles from './Command.module.css';

export function Command({ children, ...props }) {
  return (
    <CommandPrimitive className={styles.command} {...props}>
      {children}
    </CommandPrimitive>
  );
}

export function CommandInput({ ...props }) {
  return (
    <CommandPrimitive.Input 
      className={styles.commandInput} 
      {...props} 
    />
  );
}

export function CommandList({ children, ...props }) {
  return (
    <CommandPrimitive.List 
      className={styles.commandList} 
      {...props}
    >
      {children}
    </CommandPrimitive.List>
  );
}

export function CommandItem({ children, ...props }) {
  return (
    <CommandPrimitive.Item 
      className={styles.commandItem} 
      {...props}
    >
      {children}
    </CommandPrimitive.Item>
  );
}
```

**Styling Guidelines:**

1. **Never use inline styles** (except for dynamic positioning/dimensions)
2. **No utility classes** - every class name should be descriptive
3. **Co-locate styles with components** - keep CSS modules next to their components
4. **Use CSS variables** for all colors, spacing, typography
5. **Mobile-first responsive design** using CSS media queries
6. **Dark mode** via `[data-theme="dark"]` attribute
7. **Animations** defined in CSS, not JS (when possible)

**Responsive Breakpoints:**

```css
/* Use these consistently across all components */
@media (max-width: 640px) {
  /* Mobile */
}

@media (min-width: 641px) and (max-width: 1024px) {
  /* Tablet */
}

@media (min-width: 1025px) {
  /* Desktop */
}
```

**Editor-Specific Styling:**

The Tiptap editor content needs special styling. Create dedicated CSS module:

```css
/* /styles/writer/editor.module.css */

/* ProseMirror base styles */
.proseMirror {
  font-family: var(--font-mono);
  font-size: var(--font-size-base);
  line-height: var(--line-height-loose);
  color: var(--color-text-primary);
  outline: none;
  min-height: 100vh;
  padding: var(--spacing-2xl);
}

/* Focus mode - dim paragraphs */
.proseMirror--focusMode p:not(.is-active) {
  opacity: 0.3;
  transition: opacity var(--transition-base);
}

/* Markdown elements when rendered */
.proseMirror h1 {
  font-size: var(--font-size-3xl);
  font-weight: 700;
  margin-top: var(--spacing-xl);
  margin-bottom: var(--spacing-md);
}

.proseMirror strong {
  font-weight: 600;
  color: var(--color-text-primary);
}

.proseMirror a {
  color: var(--color-accent);
  text-decoration: underline;
  cursor: pointer;
}

/* Wiki-link styling */
.wikiLink {
  color: var(--color-accent);
  text-decoration: none;
  border-bottom: 1px solid var(--color-accent);
  cursor: pointer;
}

.wikiLink--missing {
  color: var(--color-error);
  border-bottom: 1px dashed var(--color-error);
}

/* Show markdown syntax when cursor is inside */
.wikiLink--editing::before {
  content: '[[';
  opacity: 0.5;
}

.wikiLink--editing::after {
  content: ']]';
  opacity: 0.5;
}

/* Callout blocks */
.callout {
  margin: var(--spacing-md) 0;
  padding: var(--spacing-md);
  border-left: 4px solid var(--color-accent);
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
}

.callout--note { border-left-color: #3b82f6; }
.callout--warning { border-left-color: #f59e0b; }
.callout--danger { border-left-color: #ef4444; }

/* Show raw markdown for callout when editing */
.callout--editing {
  font-family: var(--font-mono);
  white-space: pre-wrap;
}
```

**Key Principles:**

- **Semantic HTML** - Use proper elements (`<article>`, `<aside>`, `<nav>`)
- **Accessible** - ARIA labels where needed, keyboard navigation
- **Performant** - Minimal CSS, efficient selectors
- **Maintainable** - Clear naming, organized structure
- **Themeable** - All values from CSS variables

**No External CSS Frameworks:**

- ❌ No Tailwind CSS
- ❌ No Shadcn UI
- ❌ No Bootstrap, Material UI, etc.
- ✅ Only: CSS Modules + Radix Primitives + CSS Variables

This gives full control over styling while maintaining accessibility through Radix primitives.

### Key Libraries & Dependencies

**Core Editor:**

```json
{
  "@tiptap/react": "^2.1.0",
  "@tiptap/starter-kit": "^2.1.0",
  "@tiptap/extension-table": "^2.1.0",
  "@tiptap/extension-table-row": "^2.1.0",
  "@tiptap/extension-table-cell": "^2.1.0",
  "@tiptap/extension-table-header": "^2.1.0",
  "@tiptap/extension-task-list": "^2.1.0",
  "@tiptap/extension-task-item": "^2.1.0",
  "@tiptap/extension-link": "^2.1.0",
  "@tiptap/pm": "^2.1.0"
}
```

**UI Components (Radix Primitives):**

```json
{
  "@radix-ui/react-dialog": "^1.0.0",
  "@radix-ui/react-dropdown-menu": "^2.0.0",
  "@radix-ui/react-popover": "^1.0.0",
  "@radix-ui/react-tooltip": "^1.0.0",
  "@radix-ui/react-switch": "^1.0.0",
  "@radix-ui/react-separator": "^1.0.0",
  "@radix-ui/react-scroll-area": "^1.0.0",
  "@radix-ui/react-context-menu": "^2.0.0",
  "cmdk": "^0.2.0"
}
```

**Utilities:**

```json
{
  "date-fns": "^2.30.0",
  "nanoid": "^5.0.0",
  "react-hotkeys-hook": "^4.4.0"
}
```

**Styling:**

- CSS Modules (built into NextJS, no additional packages needed)
- CSS Variables for theming
- No Tailwind CSS, no Shadcn UI, no external CSS frameworks

**Database:** Existing Supabase setup
**Auth:** Existing Supabase Auth  
**Deployment:** Existing Vercel setup

## Core Features - Detailed Specifications

### 1. Tiptap Editor Configuration

**Extensions Required:**

**Standard Extensions:**

- `StarterKit` - Basic formatting (bold, italic, code, headings, lists, etc.)
- `Table` - Table support with `TableRow`, `TableCell`, `TableHeader`
- `TaskList` + `TaskItem` - Checkbox tasks
- `Link` - URL links
- `CodeBlock` - Code blocks with syntax highlighting
- `Blockquote` - Block quotes
- `HorizontalRule` - Horizontal dividers
- `HardBreak` - Line breaks

**Custom Extensions to Build:**

#### WikiLink Extension

```typescript
// Syntax: [[page-name]] or [[page-name|Display Text]]
// Features:
// - Autocomplete from existing document titles
// - Different styling for existing vs non-existent links
// - Click to navigate to linked document
// - Parse and store in document_links table on save
```

#### Callout Extension

```typescript
// Syntax: Obsidian-style callouts
// > [!note] Optional Title
// > Content here
//
// Types: note, tip, info, warning, danger, question, success
// Features:
// - Colored left border
// - Icon based on type
// - Collapsible (optional)
// - Custom title or default based on type
```

#### Footnote Extension

```typescript
// Syntax: Text with footnote[^1]
// [^1]: Footnote content
//
// Features:
// - Automatic numbering
// - Hover preview
// - Jump to footnote on click
// - Footnotes section at end of document
```

**Editor Behavior:**

- Auto-save every 2 seconds when idle
- Preserve cursor position during saves
- Undo/redo support
- Markdown shortcuts (e.g., `**text**` → **text**, `#` → heading)
- Slash commands for quick insertion (e.g., `/table`, `/callout`)

**Bear-Style Hybrid Editing Mode (Core Requirement):**

This is a critical feature that defines the writing experience - formatted text appears rendered by default but reveals raw markdown syntax when the cursor touches it.

**Default Behavior (Hybrid Mode):**

- **Cursor outside formatted content:** Show rendered output
  - `**bold**` appears as **bold**
  - `[link](url)` appears as blue underlined link
  - `# heading` appears as large heading text
  - `[[wiki-link]]` appears as styled link
- **Cursor inside or adjacent to formatted content:** Show raw markdown markers
  - Click inside bold text → reveals `**` on both sides
  - Click on link → shows full `[text](url)` syntax
  - Click in heading → shows `#` prefix
  - Click on wiki-link → shows `[[` and `]]` brackets
- **Smooth transitions:** Fade between rendered and raw states (200ms)

**Toggle View Option:**

- User preference: “Always show raw markdown”
- When enabled: All markdown syntax visible at all times
- Keyboard shortcut: `Cmd/Ctrl + Shift + M` to toggle
- Setting persisted in localStorage and Supabase user preferences

**Implementation Requirements for Custom Extensions:**

Each custom extension must implement cursor-aware rendering:

**WikiLink Extension:**

```typescript
// When cursor is NOT in the wiki-link node:
// Render as: [Display Text] (styled link)
// or [Page Name] if no display text

// When cursor IS in the wiki-link node:
// Render as: [[page-name|Display Text]]
// or [[page-name]]

// Implementation: Custom NodeView with cursor detection
// - Track cursor position in editor
- Update node decoration based on selection state
// - Handle click to navigate vs click to edit
```

**Callout Extension:**

```typescript
// When cursor is NOT in callout:
// Render as: Colored box with icon and content

// When cursor IS in callout:
// Render as: 
// > [!note] Optional Title
// > Content here

// Implementation: Custom NodeView
// - Detect cursor entry/exit
// - Toggle between rendered box and raw markdown
// - Preserve block quote syntax markers
```

**Footnote Extension:**

```typescript
// When cursor is NOT on footnote reference:
// Render as: Superscript number [1] (clickable)

// When cursor IS on footnote reference:
// Render as: [^1] (editable)

// When cursor is NOT in footnote definition:
// Render as: Small text in footnotes section

// When cursor IS in footnote definition:
// Render as: [^1]: Definition text

// Implementation: Custom NodeView for both reference and definition
```

**Standard Marks (Bold, Italic, Code, etc.):**

- Use Tiptap’s built-in `inputRules` for auto-conversion
- Configure `markInputRule` for each mark type
- Example: Typing `**text**<space>` auto-converts to bold
- Cursor inside bold text reveals markers via custom mark decoration

**Technical Implementation Notes:**

1. **Cursor Detection:**
- Listen to `selectionUpdate` event in Tiptap
- Check if selection is inside each mark/node type
- Update node decorations accordingly
1. **Node Views:**
- Each custom extension needs a `NodeView` component
- React component that renders based on `selected` prop
- Handle both rendered and raw states
1. **Performance:**
- Only re-render affected nodes on cursor move
- Debounce cursor position checks (16ms for 60fps)
- Minimize DOM mutations during transitions
1. **Edge Cases:**
- Selection spanning multiple marks (show all markers)
- Empty marks (show markers even with no content)
- Nested marks (handle hierarchy correctly)

**User Experience Goals:**

- Feel like editing rich text, not markdown
- Instant feedback when typing shortcuts
- No confusion about what will be rendered
- Easy to fix formatting by seeing raw syntax
- Smooth enough to be invisible

This hybrid editing mode is **Phase 1 Priority 0** - it defines the core writing experience and differentiates this from a plain markdown editor.

-----

### 2. Focus Mode

**Implementation:**

**Paragraph Focus:**

- Dim all paragraphs to 30% opacity
- Current paragraph (based on cursor position) at 100% opacity
- Smooth opacity transitions (300ms)
- Update on cursor move

**Typewriter Mode:**

- Keep current line vertically centered in viewport
- Smooth scrolling as user types
- Can be enabled independently or with focus mode
- Disable when user manually scrolls

**UI Controls:**

- Toggle buttons in editor toolbar
- Keyboard shortcuts:
  - `Cmd/Ctrl + Shift + F` - Toggle focus mode
  - `Cmd/Ctrl + Shift + T` - Toggle typewriter mode
- Persist user preferences in localStorage

-----

### 3. Daily Notes

**Functionality:**

**Quick Access:**

- Global hotkey: `Cmd/Ctrl + D`
- Creates or opens today’s note
- Note title: `YYYY-MM-DD` format (e.g., `2026-01-11`)
- Slug: `daily-YYYY-MM-DD`
- Collection type: `daily`

**Behavior:**

- If today’s note exists, open it
- If not, create with:
  - Title: Formatted date (e.g., “January 11, 2026”)
  - Empty content or optional template
  - Automatically tagged with `#daily`

**Navigation:**

- Shortcut to previous day: `Cmd/Ctrl + Shift + [`
- Shortcut to next day: `Cmd/Ctrl + Shift + ]`
- Calendar view (future feature)

-----

### 4. Document Organization

**Collections:**

Four collection types with distinct purposes:

1. **Journal** (`journal`)
- Personal reflections, private thoughts
- Default to private (`is_public: false`)
- Optional metadata: `mood`, `weather`, `location`
1. **Article** (`article`)
- Long-form public writing
- Can be published to AstroJS canon
- Metadata: `subtitle`, `excerpt`, `featured_image`, `publish_date`
1. **Note** (`note`)
- General notes, ideas, references
- Default collection type
- Flexible metadata
1. **Daily** (`daily`)
- Daily notes (see above)
- Auto-tagged with `#daily`

**Tags:**

- Free-form text tags
- Display as `#tag-name` in UI
- Click to filter by tag
- Tag autocomplete from existing tags
- Multi-select filtering

**Metadata Structure:**

```typescript
// Collection-specific metadata in JSONB
interface JournalMetadata {
  mood?: string;
  weather?: string;
  location?: string;
}

interface ArticleMetadata {
  subtitle?: string;
  excerpt?: string;
  featured_image?: string;
  publish_date?: string;
}

// Stored in documents.metadata column
```

-----

### 5. Search

**Full-Text Search:**

**Supabase Query:**

```sql
SELECT 
  id, 
  slug, 
  title, 
  content,
  collection_type,
  tags,
  ts_rank(search_vector, query) as rank
FROM documents, 
     to_tsquery('english', $1) query
WHERE search_vector @@ query
  AND user_id = $2
ORDER BY rank DESC
LIMIT 20;
```

**Features:**

- Search across title and content
- Weighted ranking (title matches ranked higher)
- Real-time search as user types (debounced 300ms)
- Keyboard shortcut: `Cmd/Ctrl + K`
- Modal overlay with results
- Arrow keys to navigate results
- Enter to open selected document

**Search UI:**

- Command palette style (Cmd+K)
- Show document title, collection badge, snippet
- Highlight search terms in results
- Recent documents if no search query

-----

### 6. Wiki-Links & Backlinks

**Wiki-Link Parsing:**

**On Document Save:**

1. Parse content for wiki-links: `[[slug]]` or `[[slug|Display]]`
2. Extract all target slugs
3. Delete existing links: `DELETE FROM document_links WHERE source_doc_id = $1`
4. Insert new links: `INSERT INTO document_links (source_doc_id, target_slug) VALUES ...`

**Link Validation:**

- Check if target document exists
- Style differently:
  - Existing: Blue, underlined, clickable
  - Non-existent: Red, dashed underline, creates on click

**Backlinks Panel:**

- Show in sidebar or collapsible section
- Query: `SELECT documents.* FROM documents JOIN document_links ON documents.id = document_links.source_doc_id WHERE document_links.target_slug = $1`
- Display as list of linking documents
- Click to navigate

**Autocomplete:**

- Trigger on `[[` input
- Query all document titles/slugs
- Filter as user types
- Arrow keys to select
- Enter to insert

-----

### 7. Navigation & UI Layout

**Layout Structure:**

**Desktop (Three-Column):**

```
┌─────────────┬──────────────────┬────────────────────────────────┐
│  Sidebar    │  Document List   │         Editor                 │
│             │                  │                                │
│ Collections │  Filtered docs   │  Tiptap editor                 │
│ Tags        │  Search          │  Focus/Typewriter modes        │
│ Quick Links │                  │  Toolbar (floating)            │
└─────────────┴──────────────────┴────────────────────────────────┘
```

**Sidebar (Left - 200px):**

- Collections filter (All, Journal, Article, Note, Daily)
- Tag cloud (top 20 tags)
- Quick links:
  - Today’s Note
  - New Document
  - Settings

**Document List (Middle - 280px):**

- Search bar at top
- Filtered/searched documents
- Show: Title, preview (first 100 chars), date
- Current document highlighted
- Infinite scroll / pagination

**Editor (Right - Flexible):**

- Full-height Tiptap editor
- Floating toolbar (appears on text selection)
- Minimal chrome
- Backlinks section (collapsible, bottom)

**Mobile (Single Column):**

- Swipe between: Sidebar ↔ Document List ↔ Editor
- Bottom nav bar with icons
- Gesture-based navigation

-----

### 8. Auto-Save & Data Persistence

**Auto-Save Logic:**

**Debounced Save:**

- Trigger save 2 seconds after last keystroke
- Show save status indicator:
  - “Saving…” (spinner)
  - “All changes saved” (checkmark, fades after 2s)
  - “Error saving” (red, persistent)

**Save Process:**

1. Serialize Tiptap content to markdown
2. Parse wiki-links and update `document_links` table
3. Update `documents` table with new content
4. Handle errors gracefully, retry on failure

**Manual Save:**

- Keyboard shortcut: `Cmd/Ctrl + S`
- Immediate save, overrides debounce

**Optimistic Updates:**

- Update local state immediately
- Revert on save failure
- Show error notification

-----

### 9. Keyboard Shortcuts

**Global Shortcuts:**

- `Cmd/Ctrl + D` - Open/create daily note
- `Cmd/Ctrl + K` - Open search
- `Cmd/Ctrl + N` - New document
- `Cmd/Ctrl + S` - Save document
- `Cmd/Ctrl + ,` - Open settings

**Editor Shortcuts:**

- `Cmd/Ctrl + Shift + F` - Toggle focus mode
- `Cmd/Ctrl + Shift + T` - Toggle typewriter mode
- `Cmd/Ctrl + Shift + M` - Toggle “Always show raw markdown”
- `Cmd/Ctrl + B` - Bold
- `Cmd/Ctrl + I` - Italic
- `Cmd/Ctrl + Shift + X` - Strikethrough
- `Cmd/Ctrl + Shift + C` - Inline code
- `Cmd/Ctrl + K` - Insert link
- `Cmd/Ctrl + [` - Outdent
- `Cmd/Ctrl + ]` - Indent

**Navigation Shortcuts:**

- `Cmd/Ctrl + Shift + [` - Previous day (if in daily note)
- `Cmd/Ctrl + Shift + ]` - Next day (if in daily note)
- `Cmd/Ctrl + \` - Toggle sidebar
- `Cmd/Ctrl + Shift + \` - Toggle document list

-----

### 10. PWA & Offline Support

**Progressive Web App Setup:**

**Manifest (`public/manifest.json`):**

```json
{
  "name": "Personal Writing App",
  "short_name": "Writer",
  "description": "Personal markdown writing application",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**Service Worker Strategy:**

- Cache-first for app shell (HTML, CSS, JS)
- Network-first for document data
- Background sync for failed saves

**Offline Editing:**

**IndexedDB Schema:**

```typescript
// Store for offline documents
{
  storeName: 'documents',
  keyPath: 'id',
  indexes: [
    { name: 'slug', keyPath: 'slug', unique: true },
    { name: 'updated_at', keyPath: 'updated_at' }
  ]
}

// Store for pending syncs
{
  storeName: 'pending_syncs',
  keyPath: 'id',
  indexes: [
    { name: 'created_at', keyPath: 'created_at' }
  ]
}
```

**Sync Logic:**

1. On document edit, save to IndexedDB immediately
2. Attempt sync with Supabase
3. If offline, queue in `pending_syncs`
4. On reconnect, sync all pending changes
5. Conflict resolution: last-write-wins (show warning if detected)

**Sync Status UI:**

- Indicator in header: “Online” (green) / “Offline” (yellow) / “Syncing” (blue)
- Show number of pending syncs when offline
- Manual sync button

-----

## Phase 1 Implementation (Weeks 1-2)

**Core Deliverables:**

1. **Tiptap Editor Setup**
- Install and configure all Tiptap extensions
- Build custom WikiLink extension with cursor-aware rendering
- Build custom Callout extension with cursor-aware rendering
- Build custom Footnote extension with cursor-aware rendering
- Implement markdown serialization
- **Implement Bear-style hybrid editing mode** (rendered by default, raw on cursor)
- Add “Always show raw markdown” toggle preference
1. **Document CRUD**
- Create document API routes
- Implement auto-save logic
- Document list component
- Navigation between documents
1. **Focus & Typewriter Modes**
- Focus mode with paragraph dimming
- Typewriter mode with centered scrolling
- Toggle controls and keyboard shortcuts
1. **Basic UI Layout**
- Three-column desktop layout
- Sidebar with collections
- Document list with search bar
- Editor with floating toolbar
1. **Authentication**
- Supabase Auth integration (if not already done)
- Protected routes
- User session management

-----

## Phase 2 Implementation (Weeks 2-3)

**Additional Features:**

1. **Collections & Tags**
- Collection type selector
- Tag input component with autocomplete
- Collection/tag filtering in document list
- Metadata editor for collection-specific fields
1. **Daily Notes**
- Daily note creation/navigation logic
- `Cmd/Ctrl + D` hotkey
- Previous/next day navigation
- Date formatting utilities
1. **Search**
- Full-text search implementation
- Command palette UI (Cmd+K)
- Search results with highlighting
- Keyboard navigation in results
1. **UI Polish**
- Loading states
- Error handling and user feedback
- Empty states (no documents, no search results)
- Animations and transitions

-----

## Phase 3 Implementation (Weeks 3-4)

**Advanced Features:**

1. **Wiki-Links & Backlinks**
- Wiki-link parsing on save
- Update `document_links` table
- Wiki-link autocomplete in editor
- Backlinks panel
- Link validation and styling
1. **Full-Text Search**
- Implement tsvector triggers in Supabase
- Search ranking algorithm
- Debounced search input
1. **Settings & Preferences**
- User preferences storage (localStorage + Supabase)
- Theme settings (light/dark)
- Editor preferences (font size, line height, etc.)
- Keyboard shortcut customization

-----

## Phase 4 Implementation (Future)

**PWA & Offline:**

1. **Service Worker**
- Install Next.js PWA plugin
- Configure caching strategies
- Background sync setup
1. **IndexedDB Integration**
- Implement offline storage
- Sync queue management
- Conflict resolution UI
1. **Mobile Optimization**
- Touch gestures for navigation
- Mobile-specific UI adaptations
- iOS keyboard handling

-----

## Future Features (Phase 5+)

**Templates:**

- YAML frontmatter templates
- Template library (journal entry, article, meeting notes)
- Quick insert from templates

**Graph View:**

- D3.js or Cytoscape.js visualization
- Interactive node graph of documents
- Filter by collection/tags
- Zoom and pan controls

**Calendar View:**

- Month/week view of daily notes
- Visual indicators for notes with content
- Quick navigation to specific dates

**Publishing Workflow:**

- One-click publish to AstroJS
- Publish status tracking
- Preview before publish
- Scheduled publishing

**Export:**

- Export individual documents (MD, PDF, HTML)
- Bulk export
- Backup entire database

-----

## Design System

### Colors

**Light Mode:**

- Background: `#FFFFFF`
- Surface: `#F7F7F7`
- Border: `#E0E0E0`
- Text Primary: `#1A1A1A`
- Text Secondary: `#6B6B6B`
- Accent: `#007AFF` (iOS blue)
- Success: `#34C759`
- Warning: `#FF9500`
- Error: `#FF3B30`

**Dark Mode:**

- Background: `#1C1C1E`
- Surface: `#2C2C2E`
- Border: `#3A3A3C`
- Text Primary: `#FFFFFF`
- Text Secondary: `#EBEBF5` (60% opacity)
- Accent: `#0A84FF`
- Success: `#30D158`
- Warning: `#FF9F0A`
- Error: `#FF453A`

### Typography

**Fonts:**

- **Sans-serif (UI):** SF Pro Display / Inter (fallback)
- **Monospace (Editor):** SF Mono / JetBrains Mono (fallback)

**Sizes:**

- Editor text: `16px` (1rem)
- Headings: `2rem`, `1.5rem`, `1.25rem`, `1.125rem`, `1rem`, `0.875rem`
- UI text: `14px` (0.875rem)
- Small text: `12px` (0.75rem)

**Line Height:**

- Editor: `1.6`
- UI: `1.5`

### Spacing

**Scale (Tailwind-style):**

- `xs`: `4px`
- `sm`: `8px`
- `md`: `16px`
- `lg`: `24px`
- `xl`: `32px`
- `2xl`: `48px`

-----

## Testing Considerations

**Unit Tests:**

- Wiki-link parsing logic
- Markdown serialization
- Slug generation
- Search query building

**Integration Tests:**

- Document CRUD operations
- Auto-save behavior
- Wiki-link creation and updates
- Search functionality

**E2E Tests:**

- Create and edit document
- Navigate between documents
- Search and open result
- Daily note creation

-----

## Performance Targets

- **Editor responsiveness:** < 16ms per keystroke (60fps)
- **Auto-save:** < 500ms from trigger to completion
- **Search results:** < 200ms for queries
- **Document list load:** < 1s for 1000+ documents
- **PWA install:** < 5s first paint after install

-----

## Security Considerations

- All documents protected by Supabase RLS
- No XSS vulnerabilities in markdown rendering
- Sanitize user input in wiki-links
- HTTPS only
- CSP headers configured
- Rate limiting on API routes

-----

## Accessibility

- Keyboard navigation throughout app
- ARIA labels on interactive elements
- Focus indicators visible
- Screen reader support for editor
- Sufficient color contrast (WCAG AA)
- Reduced motion support

-----

## Migration & Data Import

**Future:** Import from other apps

- Obsidian vault import (.md files + frontmatter)
- Bear export import (.textbundle)
- Plain markdown files
- Preserve creation/modification dates

-----

## Success Metrics

**Phase 1 Success:**

- Can create and edit documents
- Focus and typewriter modes work smoothly
- Auto-save without data loss
- Wiki-links render correctly
- **Hybrid editing mode feels natural** (rendered by default, raw on cursor touch)
- Markdown shortcuts work seamlessly

**Phase 2 Success:**

- Daily notes workflow feels natural
- Search finds relevant documents quickly
- Collections and tags organize effectively

**Phase 3 Success:**

- Wiki-links create meaningful connections
- Backlinks surface related content
- Full-text search is fast and accurate

**Long-term Success:**

- Daily usage for all writing tasks
- Zero friction switching from other apps
- Fast enough to be invisible
- Offline mode works reliably

-----

## Open Questions for Implementation

1. **Editor toolbar:** Always visible, or only on text selection?
2. **Document list:** Show full preview or just first line?
3. **Sidebar:** Collapsible or always visible on desktop?
4. **Theme:** Auto-detect system theme or manual toggle?
5. **Daily note template:** Empty or with date/time header?
6. **Conflict resolution:** Last-write-wins or manual merge?
7. **Mobile navigation:** Bottom tabs or hamburger menu?

-----

## Notes for Claude Code

**Development Priorities:**

1. Get basic editor working first
2. Ensure auto-save is bulletproof
3. Custom extensions can be basic initially, refine later
4. Focus/typewriter modes are P0, implement early
5. PWA/offline can be Phase 4, not critical for initial use

**Code Quality:**

- TypeScript strict mode
- Component composition over large components
- Custom hooks for reusable logic
- Clear separation: UI components, business logic, data access

**Testing Strategy:**

- Critical path testing (CRUD, auto-save, search)
- Unit tests for utilities
- Manual E2E testing acceptable initially

**Documentation:**

- Inline comments for complex logic (wiki-link parsing, etc.)
- README with setup instructions
- API route documentation

-----

This specification provides Claude Code with everything needed to build the application systematically. Adjust priorities and implementation details as needed during development.