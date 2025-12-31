# Phase 4 Implementation Brief: Anchored Writing Core

> **Timeline:** Weeks 9-10  
> **Goal:** Full markdown authoring in Anchored with wiki-links, journals, and task integration.

---

## 1. WHAT WE'RE BUILDING

Expanding Anchored with:
- Markdown editor with live preview
- Wiki-link support with autocomplete
- Document management (create, edit, publish)
- Frontmatter/metadata editing
- Visibility and status controls
- Daily journal with prompts
- Journal ↔ Task two-way sync
- "Publish Site" trigger for digital garden rebuild

**What we're NOT building yet:**
- Weekly/monthly journals
- OKRs
- Time reports
- Full review system (beyond end-of-day)
- Reading app

**Dependencies:**
- Phase 1 complete (tasks, habits, timer)
- Phase 2 complete (digital garden deployed)
- Supabase `documents` table exists

---

## 2. TECH STACK ADDITIONS

| Layer | Choice | Notes |
|-------|--------|-------|
| Editor | CodeMirror 6 or Milkdown | Rich markdown editing |
| Preview | react-markdown + remark/rehype | Live preview rendering |
| Wiki-links | Custom remark plugin | Reuse from Phase 2 |
| Shortcuts | Hotkeys (⌘S, ⌘K, etc.) | Native-feeling UX |

### Editor Options

**Option A: CodeMirror 6**
- Pros: Battle-tested, highly customizable, vim mode available
- Cons: More complex setup, steeper learning curve
- Best for: Power users, complex editing needs

**Option B: Milkdown**
- Pros: Built for markdown, plugin system, WYSIWYG-ish
- Cons: Younger project, fewer resources
- Best for: Clean writing experience

**Recommendation:** Start with CodeMirror 6 for flexibility. You can always wrap it in a simpler interface later.

---

## 3. DATABASE SCHEMA ADDITIONS

### 3.1 Documents Table (from Phase 2)

```sql
documents
  - id: text (PRIMARY KEY, ULID)
  - title: text (NOT NULL)
  - slug: text (nullable)
  - collection: text (nullable)
  - visibility: text (default 'private')
  - status: text (default 'draft')
  - canonical: text (nullable)
  - body_md: text (nullable)
  - summary: text (nullable)
  - metadata: jsonb (default '{}')
  - created_at: timestamptz
  - updated_at: timestamptz
  - published_at: timestamptz (nullable)
```

### 3.2 Journals Table

```sql
journals
  - id: uuid (PRIMARY KEY, default gen_random_uuid())
  - owner_id: uuid (NOT NULL, references auth.users)
  - entry_date: date (NOT NULL)
  - journal_type: text (default 'daily')
    -- Values: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual'
  - body_md: text (NOT NULL, default '')
  - mood: integer (nullable, 1-5 scale)
  - energy: integer (nullable, 1-5 scale)
  - prompts_used: text[] (default '{}')
  - word_count: integer (default 0)
  - created_at: timestamptz (default now())
  - updated_at: timestamptz (default now())

-- One journal per type per date
CREATE UNIQUE INDEX idx_journals_unique 
ON journals(owner_id, journal_type, entry_date);

CREATE INDEX idx_journals_date ON journals(owner_id, entry_date);
```

### 3.3 Journal Task Links

```sql
journal_task_links
  - id: uuid (PRIMARY KEY, default gen_random_uuid())
  - journal_id: uuid (NOT NULL, references journals.id ON DELETE CASCADE)
  - task_id: uuid (NOT NULL, references tasks.id ON DELETE CASCADE)
  - line_number: integer (NOT NULL)
  - original_text: text (NOT NULL)
  - created_at: timestamptz (default now())

CREATE UNIQUE INDEX idx_journal_task_unique 
ON journal_task_links(journal_id, task_id);
```

### 3.4 Journal Prompts

```sql
journal_prompts
  - id: uuid (PRIMARY KEY, default gen_random_uuid())
  - owner_id: uuid (NOT NULL, references auth.users)
  - prompt_text: text (NOT NULL)
  - category: text (default 'reflection')
    -- Values: 'reflection' | 'gratitude' | 'intention' | 'review' | 'custom'
  - active: boolean (default true)
  - is_default: boolean (default false)
  - sort_order: integer (default 0)
  - created_at: timestamptz (default now())

-- Seed default prompts
INSERT INTO journal_prompts (owner_id, prompt_text, category, is_default) VALUES
  (owner_id, 'What am I grateful for today?', 'gratitude', true),
  (owner_id, 'What is my intention for today?', 'intention', true),
  (owner_id, 'What did I learn today?', 'reflection', true),
  (owner_id, 'What challenged me today?', 'reflection', true),
  (owner_id, 'What would make today great?', 'intention', true),
  (owner_id, 'What am I avoiding?', 'reflection', true);
```

### 3.5 RLS Policies

```sql
-- Documents: owner only (for now)
CREATE POLICY "Owner access only" ON documents
  FOR ALL USING (
    -- Check owner via metadata or add owner_id column
    (metadata->>'owner_id')::uuid = auth.uid()
  );

-- Journals: owner only
CREATE POLICY "Owner access only" ON journals
  FOR ALL USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Journal task links: owner only (via journal)
CREATE POLICY "Owner access only" ON journal_task_links
  FOR ALL USING (
    journal_id IN (SELECT id FROM journals WHERE owner_id = auth.uid())
  );

-- Journal prompts: owner only
CREATE POLICY "Owner access only" ON journal_prompts
  FOR ALL USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
```

---

## 4. MARKDOWN EDITOR

### 4.1 Editor Component

```typescript
// components/editor/markdown-editor.tsx

'use client';

import { useCallback, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView } from '@codemirror/view';
import { WikiLinkCompletion } from './wiki-link-completion';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  placeholder?: string;
  className?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  onSave,
  placeholder,
  className
}: MarkdownEditorProps) {
  const [isFocused, setIsFocused] = useState(false);
  
  // Keyboard shortcuts
  const keymap = EditorView.domEventHandlers({
    keydown: (event, view) => {
      // ⌘S or Ctrl+S to save
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault();
        onSave?.();
        return true;
      }
      return false;
    }
  });
  
  return (
    <div className={cn('relative', className)}>
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={[
          markdown(),
          keymap,
          WikiLinkCompletion(),
          EditorView.lineWrapping,
          EditorView.theme({
            '&': { height: '100%' },
            '.cm-content': { 
              fontFamily: 'var(--font-mono)',
              fontSize: '14px',
              lineHeight: '1.6'
            },
            '.cm-focused': { outline: 'none' }
          })
        ]}
        placeholder={placeholder}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
          highlightActiveLine: false
        }}
      />
    </div>
  );
}
```

### 4.2 Wiki-Link Autocomplete

```typescript
// components/editor/wiki-link-completion.ts

import { autocompletion, CompletionContext } from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';

export function WikiLinkCompletion() {
  return autocompletion({
    override: [wikiLinkCompletions]
  });
}

async function wikiLinkCompletions(context: CompletionContext) {
  // Check if we're inside [[ ]]
  const before = context.matchBefore(/\[\[[^\]]*$/);
  if (!before) return null;
  
  // Extract the search query (text after [[)
  const query = before.text.slice(2).toLowerCase();
  
  // Fetch matching documents
  const documents = await searchDocuments(query);
  
  return {
    from: before.from + 2,  // After [[
    options: documents.map(doc => ({
      label: doc.title,
      detail: doc.collection,
      apply: (view, completion, from, to) => {
        // Insert title and close brackets
        const insert = `${doc.title}]]`;
        view.dispatch({
          changes: { from, to: context.pos, insert }
        });
      }
    }))
  };
}

async function searchDocuments(query: string) {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('documents')
    .select('id, title, slug, collection')
    .or(`title.ilike.%${query}%,slug.ilike.%${query}%`)
    .limit(10);
  
  return data ?? [];
}
```

### 4.3 Live Preview

```typescript
// components/editor/markdown-preview.tsx

'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { remarkWikiLinks } from '@/lib/remark-wiki-links';
import { remarkCallouts } from '@/lib/remark-callouts';

interface MarkdownPreviewProps {
  content: string;
  linkIndex: Map<string, string>;
  className?: string;
}

export function MarkdownPreview({ 
  content, 
  linkIndex,
  className 
}: MarkdownPreviewProps) {
  return (
    <div className={cn('prose prose-neutral max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[
          remarkGfm,
          [remarkWikiLinks, { index: linkIndex }],
          remarkCallouts
        ]}
        components={{
          // Custom rendering for wiki-links
          a: ({ href, children, ...props }) => {
            const isInternal = href?.startsWith('/');
            return (
              <a 
                href={href} 
                className={isInternal ? 'wiki-link' : 'external-link'}
                {...props}
              >
                {children}
              </a>
            );
          },
          // Custom rendering for broken wiki-links
          span: ({ className, children, ...props }) => {
            if (className === 'wiki-link-broken') {
              return (
                <span 
                  className="text-red-500 underline decoration-dotted cursor-help"
                  title="Page not found"
                  {...props}
                >
                  {children}
                </span>
              );
            }
            return <span className={className} {...props}>{children}</span>;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
```

### 4.4 Split Editor/Preview Layout

```typescript
// components/editor/document-editor.tsx

'use client';

import { useState, useCallback } from 'react';
import { MarkdownEditor } from './markdown-editor';
import { MarkdownPreview } from './markdown-preview';
import { useLinkIndex } from '@/lib/hooks/use-link-index';
import { useDebounce } from '@/lib/hooks/use-debounce';

type ViewMode = 'edit' | 'preview' | 'split';

interface DocumentEditorProps {
  initialContent: string;
  onSave: (content: string) => Promise<void>;
}

export function DocumentEditor({ initialContent, onSave }: DocumentEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const { data: linkIndex } = useLinkIndex();
  const debouncedContent = useDebounce(content, 500);
  
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await onSave(content);
      setLastSaved(new Date());
    } finally {
      setIsSaving(false);
    }
  }, [content, onSave]);
  
  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center gap-2">
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
        </div>
        <div className="flex items-center gap-4">
          {lastSaved && (
            <span className="text-sm text-gray-500">
              Saved {formatRelativeTime(lastSaved)}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-3 py-1 bg-blue-600 text-white rounded"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
      
      {/* Editor/Preview Area */}
      <div className="flex-1 flex overflow-hidden">
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className={cn(
            'flex-1 overflow-auto',
            viewMode === 'split' && 'border-r'
          )}>
            <MarkdownEditor
              value={content}
              onChange={setContent}
              onSave={handleSave}
              className="h-full p-4"
            />
          </div>
        )}
        
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className="flex-1 overflow-auto p-4">
            <MarkdownPreview
              content={debouncedContent}
              linkIndex={linkIndex ?? new Map()}
            />
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 5. DOCUMENT MANAGEMENT

### 5.1 Document List Page

```typescript
// app/(app)/vault/page.tsx

import { createClient } from '@/lib/supabase/server';
import { DocumentList } from '@/components/vault/document-list';

export default async function VaultPage() {
  const supabase = createClient();
  
  const { data: documents } = await supabase
    .from('documents')
    .select('id, title, slug, collection, status, visibility, updated_at')
    .order('updated_at', { ascending: false });
  
  // Group by collection
  const grouped = groupByCollection(documents ?? []);
  
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Vault</h1>
        <NewDocumentButton />
      </div>
      
      <DocumentList documents={grouped} />
    </div>
  );
}
```

### 5.2 Document Detail Page

```typescript
// app/(app)/vault/[id]/page.tsx

import { createClient } from '@/lib/supabase/server';
import { DocumentEditor } from '@/components/editor/document-editor';
import { DocumentSidebar } from '@/components/vault/document-sidebar';
import { notFound } from 'next/navigation';

interface Props {
  params: { id: string };
}

export default async function DocumentPage({ params }: Props) {
  const supabase = createClient();
  
  const { data: document } = await supabase
    .from('documents')
    .select('*')
    .eq('id', params.id)
    .single();
  
  if (!document) {
    notFound();
  }
  
  return (
    <div className="flex h-full">
      {/* Main editor area */}
      <div className="flex-1">
        <DocumentEditor
          initialContent={document.body_md ?? ''}
          onSave={async (content) => {
            'use server';
            await updateDocument(params.id, { body_md: content });
          }}
        />
      </div>
      
      {/* Metadata sidebar */}
      <DocumentSidebar document={document} />
    </div>
  );
}
```

### 5.3 Document Metadata Sidebar

```typescript
// components/vault/document-sidebar.tsx

'use client';

import { useState } from 'react';
import { Document } from '@/types/database';
import { updateDocument } from '@/lib/actions/documents';

interface DocumentSidebarProps {
  document: Document;
}

export function DocumentSidebar({ document }: DocumentSidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  
  return (
    <aside className={cn(
      'border-l bg-gray-50 transition-all',
      isOpen ? 'w-80' : 'w-0'
    )}>
      <div className="p-4 space-y-6">
        {/* Title */}
        <Field label="Title">
          <input
            type="text"
            defaultValue={document.title}
            onBlur={(e) => updateDocument(document.id, { title: e.target.value })}
            className="w-full px-2 py-1 border rounded"
          />
        </Field>
        
        {/* Slug */}
        <Field label="Slug">
          <input
            type="text"
            defaultValue={document.slug ?? ''}
            onBlur={(e) => updateDocument(document.id, { slug: e.target.value })}
            className="w-full px-2 py-1 border rounded font-mono text-sm"
          />
        </Field>
        
        {/* Collection */}
        <Field label="Collection">
          <CollectionSelect
            value={document.collection}
            onChange={(collection) => updateDocument(document.id, { collection })}
          />
        </Field>
        
        {/* Status */}
        <Field label="Status">
          <StatusSelect
            value={document.status}
            onChange={(status) => updateDocument(document.id, { status })}
          />
        </Field>
        
        {/* Visibility */}
        <Field label="Visibility">
          <VisibilitySelect
            value={document.visibility}
            onChange={(visibility) => updateDocument(document.id, { visibility })}
          />
        </Field>
        
        {/* Canonical URL */}
        <Field label="Canonical URL">
          <input
            type="text"
            defaultValue={document.canonical ?? ''}
            onBlur={(e) => updateDocument(document.id, { canonical: e.target.value })}
            className="w-full px-2 py-1 border rounded font-mono text-sm"
            placeholder="/library/principles/my-doc"
          />
        </Field>
        
        {/* Summary */}
        <Field label="Summary">
          <textarea
            defaultValue={document.summary ?? ''}
            onBlur={(e) => updateDocument(document.id, { summary: e.target.value })}
            className="w-full px-2 py-1 border rounded text-sm"
            rows={3}
            placeholder="Brief description for previews..."
          />
        </Field>
        
        {/* Dates */}
        <div className="text-sm text-gray-500 space-y-1">
          <p>Created: {formatDate(document.created_at)}</p>
          <p>Updated: {formatDate(document.updated_at)}</p>
          {document.published_at && (
            <p>Published: {formatDate(document.published_at)}</p>
          )}
        </div>
        
        {/* Actions */}
        <div className="pt-4 border-t space-y-2">
          {document.status === 'draft' && (
            <button
              onClick={() => publishDocument(document.id)}
              className="w-full px-3 py-2 bg-green-600 text-white rounded"
            >
              Publish
            </button>
          )}
          
          <button
            onClick={() => deleteDocument(document.id)}
            className="w-full px-3 py-2 text-red-600 border border-red-200 rounded"
          >
            Delete
          </button>
        </div>
      </div>
    </aside>
  );
}
```

### 5.4 Status and Visibility Options

```typescript
// lib/constants.ts

export const DOCUMENT_STATUSES = [
  { value: 'draft', label: 'Draft', description: 'Work in progress' },
  { value: 'published', label: 'Published', description: 'Live on site' },
  { value: 'archived', label: 'Archived', description: 'Hidden but preserved' }
];

export const DOCUMENT_VISIBILITIES = [
  { value: 'private', label: 'Private', description: 'Only you' },
  { value: 'public', label: 'Public', description: 'Anyone on the web' },
  { value: 'supporter', label: 'Supporter', description: 'Supporter tier and above' },
  { value: '1v1', label: '1:1 Only', description: '1:1 clients only' }
];

export const COLLECTIONS = [
  { value: 'library/principles', label: 'Library → Principles' },
  { value: 'library/fragments', label: 'Library → Fragments' },
  { value: 'library/field-notes', label: 'Library → Field Notes' },
  { value: 'engineer/projects', label: 'Engineer → Projects' },
  { value: 'mentor', label: 'Mentor' },
  { value: 'artist/work/visual', label: 'Artist → Visual' },
  { value: 'artist/work/poetry', label: 'Artist → Poetry' },
  { value: 'newsletter', label: 'Newsletter' }
];
```

---

## 6. DAILY JOURNAL

### 6.1 Journal Page

```typescript
// app/(app)/journal/page.tsx

import { createClient } from '@/lib/supabase/server';
import { JournalEditor } from '@/components/journal/journal-editor';
import { JournalCalendar } from '@/components/journal/journal-calendar';
import { getTodayDate } from '@/lib/utils/dates';

export default async function JournalPage() {
  const supabase = createClient();
  const today = getTodayDate();
  
  // Get or create today's journal
  let { data: journal } = await supabase
    .from('journals')
    .select('*')
    .eq('entry_date', today)
    .eq('journal_type', 'daily')
    .single();
  
  if (!journal) {
    const { data: newJournal } = await supabase
      .from('journals')
      .insert({
        entry_date: today,
        journal_type: 'daily',
        body_md: ''
      })
      .select()
      .single();
    
    journal = newJournal;
  }
  
  // Get prompts
  const { data: prompts } = await supabase
    .from('journal_prompts')
    .select('*')
    .eq('active', true)
    .order('sort_order');
  
  return (
    <div className="flex h-full">
      {/* Calendar sidebar */}
      <JournalCalendar selectedDate={today} />
      
      {/* Editor */}
      <div className="flex-1">
        <JournalEditor 
          journal={journal!} 
          prompts={prompts ?? []}
        />
      </div>
    </div>
  );
}
```

### 6.2 Journal Editor Component

```typescript
// components/journal/journal-editor.tsx

'use client';

import { useState, useCallback, useEffect } from 'react';
import { MarkdownEditor } from '@/components/editor/markdown-editor';
import { JournalPrompts } from './journal-prompts';
import { JournalMetabar } from './journal-metabar';
import { extractTasksFromMarkdown, syncJournalTasks } from '@/lib/journal-tasks';
import { useDebounce } from '@/lib/hooks/use-debounce';

interface JournalEditorProps {
  journal: Journal;
  prompts: JournalPrompt[];
}

export function JournalEditor({ journal, prompts }: JournalEditorProps) {
  const [content, setContent] = useState(journal.body_md);
  const [mood, setMood] = useState(journal.mood);
  const [energy, setEnergy] = useState(journal.energy);
  const [isSaving, setIsSaving] = useState(false);
  const [foundTasks, setFoundTasks] = useState<ExtractedTask[]>([]);
  
  const debouncedContent = useDebounce(content, 1000);
  
  // Auto-save on debounced content change
  useEffect(() => {
    if (debouncedContent !== journal.body_md) {
      saveJournal();
    }
  }, [debouncedContent]);
  
  // Extract tasks when content changes
  useEffect(() => {
    const tasks = extractTasksFromMarkdown(content);
    setFoundTasks(tasks);
  }, [content]);
  
  const saveJournal = useCallback(async () => {
    setIsSaving(true);
    try {
      await updateJournal(journal.id, {
        body_md: content,
        mood,
        energy,
        word_count: countWords(content)
      });
      
      // Sync tasks
      await syncJournalTasks(journal.id, content);
    } finally {
      setIsSaving(false);
    }
  }, [journal.id, content, mood, energy]);
  
  const insertPrompt = useCallback((promptText: string) => {
    const formatted = `\n\n## ${promptText}\n\n`;
    setContent(prev => prev + formatted);
  }, []);
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div>
          <h1 className="text-lg font-semibold">
            {formatDate(journal.entry_date, 'EEEE, MMMM d, yyyy')}
          </h1>
          <p className="text-sm text-gray-500">
            {countWords(content)} words
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Mood/Energy selectors */}
          <MoodSelector value={mood} onChange={setMood} />
          <EnergySelector value={energy} onChange={setEnergy} />
          
          {/* Save indicator */}
          <span className="text-sm text-gray-500">
            {isSaving ? 'Saving...' : 'Saved'}
          </span>
        </div>
      </div>
      
      {/* Prompts bar */}
      <JournalPrompts prompts={prompts} onInsert={insertPrompt} />
      
      {/* Editor */}
      <div className="flex-1 overflow-auto">
        <MarkdownEditor
          value={content}
          onChange={setContent}
          onSave={saveJournal}
          placeholder="Start writing..."
          className="h-full p-4"
        />
      </div>
      
      {/* Task extraction notice */}
      {foundTasks.length > 0 && (
        <TaskExtractionBar 
          tasks={foundTasks} 
          journalId={journal.id}
        />
      )}
    </div>
  );
}
```

### 6.3 Journal Prompts Component

```typescript
// components/journal/journal-prompts.tsx

'use client';

interface JournalPromptsProps {
  prompts: JournalPrompt[];
  onInsert: (prompt: string) => void;
}

export function JournalPrompts({ prompts, onInsert }: JournalPromptsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Group by category
  const grouped = groupBy(prompts, 'category');
  
  return (
    <div className="border-b">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 w-full"
      >
        <SparklesIcon className="w-4 h-4" />
        Prompts
        <ChevronIcon className={cn('w-4 h-4 ml-auto', isExpanded && 'rotate-180')} />
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-3 grid grid-cols-2 gap-2">
          {Object.entries(grouped).map(([category, categoryPrompts]) => (
            <div key={category}>
              <p className="text-xs font-medium text-gray-400 uppercase mb-1">
                {category}
              </p>
              {categoryPrompts.map((prompt) => (
                <button
                  key={prompt.id}
                  onClick={() => onInsert(prompt.prompt_text)}
                  className="block w-full text-left text-sm py-1 px-2 rounded hover:bg-gray-100"
                >
                  {prompt.prompt_text}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 7. JOURNAL ↔ TASK SYNC

### 7.1 Task Extraction

```typescript
// lib/journal-tasks.ts

export interface ExtractedTask {
  lineNumber: number;
  text: string;
  completed: boolean;
  originalLine: string;
}

export function extractTasksFromMarkdown(content: string): ExtractedTask[] {
  const lines = content.split('\n');
  const tasks: ExtractedTask[] = [];
  
  const taskRegex = /^[\s]*-\s*\[([ xX])\]\s*(.+)$/;
  
  lines.forEach((line, index) => {
    const match = line.match(taskRegex);
    if (match) {
      tasks.push({
        lineNumber: index + 1,
        text: match[2].trim(),
        completed: match[1].toLowerCase() === 'x',
        originalLine: line
      });
    }
  });
  
  return tasks;
}
```

### 7.2 Sync Logic

```typescript
// lib/journal-tasks.ts (continued)

export async function syncJournalTasks(
  journalId: string,
  content: string
): Promise<void> {
  const supabase = createClient();
  
  // Get existing links for this journal
  const { data: existingLinks } = await supabase
    .from('journal_task_links')
    .select('*, task:tasks(*)')
    .eq('journal_id', journalId);
  
  const extractedTasks = extractTasksFromMarkdown(content);
  
  for (const extracted of extractedTasks) {
    // Find existing link by line number
    const existingLink = existingLinks?.find(
      link => link.line_number === extracted.lineNumber
    );
    
    if (existingLink) {
      // Update task status if changed
      if (existingLink.task.status === 'done' !== extracted.completed) {
        await supabase
          .from('tasks')
          .update({
            status: extracted.completed ? 'done' : 'today',
            completed_at: extracted.completed ? new Date().toISOString() : null
          })
          .eq('id', existingLink.task_id);
      }
    }
    // Note: New tasks are NOT auto-created. User must confirm via UI.
  }
}
```

### 7.3 Task Extraction Bar

```typescript
// components/journal/task-extraction-bar.tsx

'use client';

interface TaskExtractionBarProps {
  tasks: ExtractedTask[];
  journalId: string;
}

export function TaskExtractionBar({ tasks, journalId }: TaskExtractionBarProps) {
  const [isCreating, setIsCreating] = useState(false);
  
  // Filter to only new (not yet linked) tasks
  const { data: existingLinks } = useJournalTaskLinks(journalId);
  
  const newTasks = tasks.filter(task => 
    !existingLinks?.some(link => link.line_number === task.lineNumber)
  );
  
  if (newTasks.length === 0) return null;
  
  const handleCreateTasks = async () => {
    setIsCreating(true);
    try {
      for (const task of newTasks) {
        // Create task
        const { data: newTask } = await createTask({
          title: task.text,
          status: task.completed ? 'done' : 'today',
          source_type: 'journal',
          source_id: journalId,
          source_excerpt: task.originalLine
        });
        
        // Create link
        await createJournalTaskLink({
          journal_id: journalId,
          task_id: newTask.id,
          line_number: task.lineNumber,
          original_text: task.originalLine
        });
      }
    } finally {
      setIsCreating(false);
    }
  };
  
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-blue-50 border-t">
      <span className="text-sm text-blue-700">
        Found {newTasks.length} new task{newTasks.length > 1 ? 's' : ''}
      </span>
      <button
        onClick={handleCreateTasks}
        disabled={isCreating}
        className="px-3 py-1 text-sm bg-blue-600 text-white rounded"
      >
        {isCreating ? 'Adding...' : 'Add to Today'}
      </button>
    </div>
  );
}
```

### 7.4 Reverse Sync (Task → Journal)

```typescript
// lib/actions/tasks.ts

export async function completeTask(taskId: string) {
  const supabase = createClient();
  
  // Update task
  await supabase
    .from('tasks')
    .update({ 
      status: 'done',
      completed_at: new Date().toISOString()
    })
    .eq('id', taskId);
  
  // Check if task is linked to a journal
  const { data: link } = await supabase
    .from('journal_task_links')
    .select('journal_id, line_number')
    .eq('task_id', taskId)
    .single();
  
  if (link) {
    // Update journal markdown
    const { data: journal } = await supabase
      .from('journals')
      .select('body_md')
      .eq('id', link.journal_id)
      .single();
    
    if (journal) {
      const lines = journal.body_md.split('\n');
      const lineIndex = link.line_number - 1;
      
      // Replace [ ] with [x]
      lines[lineIndex] = lines[lineIndex].replace(/\[\s\]/, '[x]');
      
      await supabase
        .from('journals')
        .update({ body_md: lines.join('\n') })
        .eq('id', link.journal_id);
    }
  }
}
```

---

## 8. PUBLISH SITE TRIGGER

### 8.1 Publish Button Component

```typescript
// components/vault/publish-site-button.tsx

'use client';

import { useState } from 'react';

export function PublishSiteButton() {
  const [isPublishing, setIsPublishing] = useState(false);
  const [lastPublished, setLastPublished] = useState<Date | null>(null);
  
  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const response = await fetch('/api/publish', { method: 'POST' });
      
      if (response.ok) {
        setLastPublished(new Date());
      } else {
        throw new Error('Publish failed');
      }
    } catch (error) {
      console.error('Publish error:', error);
      // Show toast error
    } finally {
      setIsPublishing(false);
    }
  };
  
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handlePublish}
        disabled={isPublishing}
        className="px-4 py-2 bg-green-600 text-white rounded flex items-center gap-2"
      >
        <GlobeIcon className="w-4 h-4" />
        {isPublishing ? 'Publishing...' : 'Publish Site'}
      </button>
      
      {lastPublished && (
        <span className="text-sm text-gray-500">
          Last published {formatRelativeTime(lastPublished)}
        </span>
      )}
    </div>
  );
}
```

### 8.2 Publish API Route

```typescript
// app/api/publish/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = createClient();
  
  // Verify owner
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== process.env.OWNER_USER_ID) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Trigger Vercel deploy hook
  const deployHookUrl = process.env.VERCEL_DEPLOY_HOOK;
  
  if (!deployHookUrl) {
    return NextResponse.json(
      { error: 'Deploy hook not configured' }, 
      { status: 500 }
    );
  }
  
  const response = await fetch(deployHookUrl, { method: 'POST' });
  
  if (!response.ok) {
    return NextResponse.json(
      { error: 'Deploy trigger failed' }, 
      { status: 500 }
    );
  }
  
  // Log publish event
  await supabase.from('publish_logs').insert({
    triggered_by: user.id,
    status: 'triggered'
  });
  
  return NextResponse.json({ success: true });
}
```

---

## 9. APPLICATION STRUCTURE ADDITIONS

```
app/(app)/
├── vault/
│   ├── page.tsx                    ← Document list
│   ├── new/page.tsx               ← Create document
│   └── [id]/page.tsx              ← Edit document
├── journal/
│   ├── page.tsx                    ← Today's journal
│   └── [date]/page.tsx            ← Specific date
└── ...existing pages

components/
├── editor/
│   ├── markdown-editor.tsx
│   ├── markdown-preview.tsx
│   ├── document-editor.tsx
│   ├── wiki-link-completion.ts
│   └── view-mode-toggle.tsx
├── vault/
│   ├── document-list.tsx
│   ├── document-card.tsx
│   ├── document-sidebar.tsx
│   ├── collection-select.tsx
│   ├── status-select.tsx
│   ├── visibility-select.tsx
│   ├── new-document-button.tsx
│   └── publish-site-button.tsx
├── journal/
│   ├── journal-editor.tsx
│   ├── journal-calendar.tsx
│   ├── journal-prompts.tsx
│   ├── journal-metabar.tsx
│   ├── mood-selector.tsx
│   ├── energy-selector.tsx
│   └── task-extraction-bar.tsx
└── ...existing components

lib/
├── remark-wiki-links.ts           ← Reuse from Phase 2
├── remark-callouts.ts             ← Reuse from Phase 2
├── journal-tasks.ts
├── hooks/
│   ├── use-link-index.ts
│   ├── use-journal.ts
│   └── use-journal-task-links.ts
└── actions/
    ├── documents.ts
    └── journals.ts
```

---

## 10. KEY SCREENS

### 10.1 Vault (Document List)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ☰  Anchored                                         [Publish Site 🌐]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  VAULT                                              [+ New Document]   │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Library → Principles (3)                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Emotional Sovereignty                     Published · Jan 15   │   │
│  │  The Practice of Becoming                  Published · Jan 12   │   │
│  │  Radical Acceptance                        Draft · Jan 10       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Library → Fragments (5)                                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  On Stillness                              Published · Jan 14   │   │
│  │  Morning Light                             Draft · Jan 13       │   │
│  │  ...                                                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Engineer → Projects (2)                                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Anchored                                  Published · Jan 8    │   │
│  │  Voyagers Platform                         Draft · Jan 5        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Document Editor

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Vault    Emotional Sovereignty                    [Edit] [Preview]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────┬───────────────────────────────┐   │
│  │                                 │                               │   │
│  │  # Emotional Sovereignty        │   EMOTIONAL SOVEREIGNTY       │   │
│  │                                 │                               │   │
│  │  This builds on [[The Practice │   This builds on The Practice │   │
│  │  of Becoming]].                 │   of Becoming.                │   │
│  │                                 │                               │   │
│  │  > [!note]                      │   ┌─────────────────────────┐ │   │
│  │  > This is a core principle.    │   │ 📝 Note                 │ │   │
│  │                                 │   │ This is a core principle│ │   │
│  │  ## The Foundation              │   └─────────────────────────┘ │   │
│  │                                 │                               │   │
│  │  Sovereignty begins with...     │   THE FOUNDATION              │   │
│  │                                 │                               │   │
│  │  EDITOR                         │   Sovereignty begins with...  │   │
│  │                                 │                               │   │
│  │                                 │   PREVIEW                     │   │
│  └─────────────────────────────────┴───────────────────────────────┘   │
│                                                                         │
│  Saved · 1,234 words                                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                                    │
┌───────────────────────────────────────────────────┴─────────────────────┐
│  METADATA                                                       [×]    │
├─────────────────────────────────────────────────────────────────────────┤
│  Title: Emotional Sovereignty                                          │
│  Slug: emotional-sovereignty                                           │
│  Collection: Library → Principles                                      │
│  Status: Published ✓                                                   │
│  Visibility: Public 🌐                                                 │
│  URL: /library/principles/emotional-sovereignty                        │
│  Summary: [                                          ]                 │
│  ──────────────────────────────────────────────────────────────────── │
│  Created: Jan 10, 2024                                                 │
│  Updated: Jan 15, 2024                                                 │
│  Published: Jan 15, 2024                                               │
└─────────────────────────────────────────────────────────────────────────┘
```

### 10.3 Daily Journal

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ☰  Anchored                                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┬──────────────────────────────────────────────────┐   │
│  │              │                                                  │   │
│  │  JANUARY     │  FRIDAY, JANUARY 17, 2024                       │   │
│  │              │  487 words · Mood: 😊 · Energy: ⚡⚡⚡            │   │
│  │  Su Mo Tu We │                                                  │   │
│  │        1  2  │  ─────────────────────────────────────────────── │   │
│  │   3  4  5  6 │  ✨ Prompts                                  [▼] │   │
│  │   7  8  9 10 │  ─────────────────────────────────────────────── │   │
│  │  11 12 13 14 │                                                  │   │
│  │  15 16 ●● 18 │  ## What am I grateful for today?               │   │
│  │  19 20 21 22 │                                                  │   │
│  │  23 24 25 26 │  Grateful for the clarity that came during      │   │
│  │  27 28 29 30 │  this morning's meditation. The insight about   │   │
│  │  31          │  [[Emotional Sovereignty]] finally clicked.     │   │
│  │              │                                                  │   │
│  │  ● Has entry │  ## Tasks                                       │   │
│  │  ○ No entry  │                                                  │   │
│  │              │  - [x] Morning meditation                       │   │
│  │              │  - [x] Review project scope                     │   │
│  │              │  - [ ] Write Phase 4 documentation              │   │
│  │              │  - [ ] Call Marcus about session                │   │
│  │              │                                                  │   │
│  │              │  ## Reflections                                 │   │
│  │              │                                                  │   │
│  │              │  Today felt different. There's a sense of       │   │
│  │              │  momentum building...                           │   │
│  │              │                                                  │   │
│  └──────────────┴──────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Found 2 new tasks                            [Add to Today]    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 11. ACCEPTANCE CRITERIA

Phase 4 is complete when:

### Markdown Editor
- [ ] CodeMirror editor loads and accepts input
- [ ] ⌘S / Ctrl+S saves document
- [ ] Wiki-link autocomplete shows matching documents
- [ ] Completing `[[` triggers autocomplete
- [ ] Selected autocomplete inserts title and closing `]]`

### Live Preview
- [ ] Preview renders markdown in real-time
- [ ] Wiki-links render as clickable links
- [ ] Broken wiki-links show distinct styling
- [ ] Callouts render with proper styling
- [ ] Preview updates on debounced input (500ms)

### Document Management
- [ ] Can create new document
- [ ] Can edit existing document
- [ ] Can update title, slug, collection, status, visibility
- [ ] Can set canonical URL
- [ ] Can add summary
- [ ] Can publish document (draft → published)
- [ ] Can archive document
- [ ] Can delete document
- [ ] Documents grouped by collection in list view

### Daily Journal
- [ ] Today's journal auto-creates if not exists
- [ ] Can write in journal with markdown
- [ ] Can navigate to past journal entries via calendar
- [ ] Prompts available and insertable
- [ ] Mood and energy selectable (1-5)
- [ ] Word count displays
- [ ] Auto-saves on pause (debounced)

### Journal ↔ Task Sync
- [ ] `- [ ] task` syntax detected in journal
- [ ] New tasks shown in extraction bar
- [ ] Clicking "Add to Today" creates linked tasks
- [ ] Checking task in journal updates task status
- [ ] Completing task in task list updates journal checkbox

### Publish Site
- [ ] "Publish Site" button visible in vault
- [ ] Clicking triggers Vercel deploy hook
- [ ] Success/error feedback shown
- [ ] Only owner can trigger publish

---

## 12. DEVELOPMENT ORDER

### Week 9: Editor + Documents
1. Install and configure CodeMirror 6
2. Build MarkdownEditor component
3. Build MarkdownPreview component
4. Implement wiki-link autocomplete
5. Port remark plugins from Phase 2
6. Build DocumentEditor with split view
7. Build DocumentSidebar with metadata fields
8. Build document list page
9. Build create/edit flows

### Week 10: Journal + Sync + Publish
1. Create journals table and prompts
2. Build JournalEditor component
3. Build JournalCalendar component
4. Build JournalPrompts component
5. Implement task extraction from markdown
6. Build TaskExtractionBar component
7. Implement two-way task sync
8. Build PublishSiteButton
9. Create publish API route
10. Test full writing → publish flow

---

## 13. SUCCESS METRICS

After Week 10, you should be able to:

1. Open Anchored and navigate to Vault
2. Create a new document with wiki-links and callouts
3. See live preview as you type
4. Use autocomplete to link to existing documents
5. Set metadata (collection, status, visibility)
6. Publish document and trigger site rebuild
7. Write in daily journal with prompts
8. Have tasks extracted from journal and added to Today
9. Complete tasks and see journal checkboxes update

The writing experience should feel fluid and connected — your personal publishing system.
#documentation