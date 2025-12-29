# Phase 2 Implementation Brief: Digital Garden

> **Timeline:** Weeks 5-6
> **Goal:** Public website live with digital garden features — wiki-links, backlinks, and callouts.

---

## 1. WHAT WE'RE BUILDING

A static digital garden at dwaynemcyrus.com with:
- Markdown rendering from Supabase
- Wiki-link resolution (`[[Internal Link]]` → proper URLs)
- Backlinks ("pages that link here")
- Callout blocks (`> [!note]`, `> [!warning]`)
- Core collection pages
- Simple navigation

**What we're NOT building yet:**
- Full sitemap (all 50+ routes)
- Search
- Tags system
- Comments
- Newsletter signup integration
- Store pages

---

## 2. TECH STACK

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | Astro 5+ | Static-first, content-focused |
| Styling | Plain CSS | Simple, no build dependencies |
| Content Source | Supabase | Fetch at build time |
| Markdown | Markdown + remark/rehype plugins | MDX optional for future use |
| Hosting | Vercel | Auto-deploy on build trigger |

### Why Astro?

- **Static by default** — No JS shipped unless needed
- **Content collections** — Built-in content management
- **Island architecture** — Add interactivity only where needed
- **Fast builds** — Incremental builds for large sites
- **Plain Markdown first** — MDX available when needed

---

## 3. CONTENT MODEL

### 3.1 Document Structure in Supabase

Phase 2 reads from the `documents` table created in Anchored:

```sql
documents
  - id: text (ULID)
  - title: text
  - slug: text
  - collection: text (e.g., 'library/principles', 'engineer/projects')
  - visibility: text ('public' | 'supporter' | '1v1' | 'private')
  - status: text ('draft' | 'published' | 'archived')
  - canonical: text (e.g., '/library/principles/emotional-sovereignty')
  - body_md: text
  - summary: text
  - metadata: jsonb
  - created_at: timestamptz
  - updated_at: timestamptz
  - published_at: timestamptz
```

### 3.2 Build-Time Query

```typescript
// Fetch all public, published documents
const { data: documents } = await supabase
  .from('documents')
  .select('*')
  .eq('visibility', 'public')
  .eq('status', 'published')
  .order('published_at', { ascending: false });
```

### 3.3 Collection Mapping

| Collection Path | URL Pattern | Example |
|-----------------|-------------|---------|
| `library/principles` | `/library/principles/[slug]` | `/library/principles/emotional-sovereignty` |
| `library/fragments` | `/library/fragments/[slug]` | `/library/fragments/on-stillness` |
| `engineer/projects` | `/engineer/projects/[slug]` | `/engineer/projects/anchored` |
| `mentor` | `/mentor/[slug]` | `/mentor/path` |
| `artist/work/visual` | `/artist/work/visual/[slug]` | `/artist/work/visual/series-one` |

---

## 4. WIKI-LINK IMPLEMENTATION

### 4.1 Syntax

```markdown
Check out [[Emotional Sovereignty]] for more on this topic.

You might also like [[emotional-sovereignty|my essay on sovereignty]].
```

**Formats:**
- `[[Page Title]]` — Links using title, displays title
- `[[slug|Display Text]]` — Links using slug, displays custom text

### 4.2 Resolution Logic

```typescript
// lib/wiki-links.ts

interface WikiLink {
  raw: string;        // "[[Emotional Sovereignty]]"
  target: string;     // "Emotional Sovereignty" or "emotional-sovereignty"
  display: string;    // "Emotional Sovereignty" or "my essay on sovereignty"
  resolved?: string;  // "/library/principles/emotional-sovereignty"
}

// Build a lookup index at build time
function buildLinkIndex(documents: Document[]): Map<string, string> {
  const index = new Map<string, string>();
  
  for (const doc of documents) {
    // Index by title (case-insensitive)
    index.set(doc.title.toLowerCase(), doc.canonical);
    
    // Index by slug
    index.set(doc.slug.toLowerCase(), doc.canonical);
    
    // Index by id
    index.set(doc.id.toLowerCase(), doc.canonical);
  }
  
  return index;
}

// Resolve a wiki-link to a URL
function resolveWikiLink(target: string, index: Map<string, string>): string | null {
  const normalized = target.toLowerCase().trim();
  return index.get(normalized) || null;
}
```

### 4.3 Remark Plugin

```typescript
// plugins/remark-wiki-links.ts

import { visit } from 'unist-util-visit';

export function remarkWikiLinks(options: { index: Map<string, string> }) {
  return (tree: any) => {
    visit(tree, 'text', (node, index, parent) => {
      const wikiLinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
      let match;
      const newChildren = [];
      let lastIndex = 0;
      
      while ((match = wikiLinkRegex.exec(node.value)) !== null) {
        const [full, target, display] = match;
        const resolved = options.index.get(target.toLowerCase().trim());
        
        // Text before the link
        if (match.index > lastIndex) {
          newChildren.push({
            type: 'text',
            value: node.value.slice(lastIndex, match.index)
          });
        }
        
        if (resolved) {
          // Resolved link
          newChildren.push({
            type: 'link',
            url: resolved,
            children: [{ type: 'text', value: display || target }],
            data: { wikiLink: true }
          });
        } else {
          // Unresolved — render as broken link
          newChildren.push({
            type: 'html',
            value: `<span class="wiki-link-broken" title="Page not found">${display || target}</span>`
          });
        }
        
        lastIndex = match.index + full.length;
      }
      
      // Remaining text
      if (lastIndex < node.value.length) {
        newChildren.push({
          type: 'text',
          value: node.value.slice(lastIndex)
        });
      }
      
      if (newChildren.length > 0) {
        parent.children.splice(index, 1, ...newChildren);
      }
    });
  };
}
```

---

## 5. BACKLINKS IMPLEMENTATION

### 5.1 Concept

Each page shows a "Linked from" section listing pages that link to it.

```
─────────────────────────────────────────
Linked from

• The Practice of Becoming
• On Stillness and Motion
• Weekly Review: Jan 15
─────────────────────────────────────────
```

### 5.2 Build-Time Extraction

```typescript
// lib/backlinks.ts

interface BacklinkMap {
  [targetCanonical: string]: Array<{
    title: string;
    canonical: string;
    excerpt?: string;
  }>;
}

function buildBacklinks(documents: Document[], linkIndex: Map<string, string>): BacklinkMap {
  const backlinks: BacklinkMap = {};
  
  // Initialize empty arrays for all documents
  for (const doc of documents) {
    backlinks[doc.canonical] = [];
  }
  
  // Extract wiki-links from each document
  for (const doc of documents) {
    const wikiLinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
    let match;
    
    while ((match = wikiLinkRegex.exec(doc.body_md)) !== null) {
      const target = match[1].toLowerCase().trim();
      const resolvedCanonical = linkIndex.get(target);
      
      if (resolvedCanonical && resolvedCanonical !== doc.canonical) {
        // Add this document as a backlink to the target
        backlinks[resolvedCanonical].push({
          title: doc.title,
          canonical: doc.canonical,
          excerpt: extractExcerptAroundLink(doc.body_md, match.index)
        });
      }
    }
  }
  
  return backlinks;
}

function extractExcerptAroundLink(body: string, linkIndex: number): string {
  // Get ~50 chars before and after the link
  const start = Math.max(0, linkIndex - 50);
  const end = Math.min(body.length, linkIndex + 50);
  let excerpt = body.slice(start, end);
  
  // Clean up
  if (start > 0) excerpt = '...' + excerpt;
  if (end < body.length) excerpt = excerpt + '...';
  
  return excerpt.replace(/\[\[|\]\]/g, '').trim();
}
```

### 5.3 Backlinks Component

```astro
---
// components/Backlinks.astro
interface Props {
  backlinks: Array<{ title: string; canonical: string; excerpt?: string }>;
}

const { backlinks } = Astro.props;
---

{backlinks.length > 0 && (
  <aside class="backlinks">
    <h2 class="backlinks-title">Linked from</h2>
    <ul class="backlinks-list">
      {backlinks.map((link) => (
        <li class="backlinks-item">
          <a href={link.canonical} class="backlinks-link">
            {link.title}
          </a>
          {link.excerpt && (
            <p class="backlinks-excerpt">{link.excerpt}</p>
          )}
        </li>
      ))}
    </ul>
  </aside>
)}

<style>
  .backlinks {
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 1px solid #e5e7eb;
  }
  .backlinks-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 1rem;
  }
  .backlinks-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .backlinks-item {
    margin-bottom: 0.75rem;
  }
  .backlinks-link {
    color: #111827;
    font-weight: 500;
    text-decoration: none;
  }
  .backlinks-link:hover {
    color: #2563eb;
  }
  .backlinks-excerpt {
    font-size: 0.875rem;
    color: #6b7280;
    margin-top: 0.25rem;
  }
</style>
```

---

## 6. CALLOUT BLOCKS

### 6.1 Syntax (Obsidian-compatible)

```markdown
> [!note]
> This is a note callout with important information.

> [!warning]
> Be careful with this approach.

> [!tip] Pro Tip
> You can add a custom title after the type.

> [!quote]
> "The only way out is through." — Robert Frost
```

### 6.2 Callout Types

| Type | Icon | Color |
|------|------|-------|
| `note` | 📝 | Blue |
| `tip` | 💡 | Green |
| `warning` | ⚠️ | Yellow |
| `danger` | 🚨 | Red |
| `quote` | 💬 | Gray |
| `example` | 📋 | Purple |

### 6.3 Remark Plugin

```typescript
// plugins/remark-callouts.ts

import { visit } from 'unist-util-visit';

const CALLOUT_TYPES = ['note', 'tip', 'warning', 'danger', 'quote', 'example'];

export function remarkCallouts() {
  return (tree: any) => {
    visit(tree, 'blockquote', (node, index, parent) => {
      const firstChild = node.children[0];
      if (!firstChild || firstChild.type !== 'paragraph') return;
      
      const firstText = firstChild.children[0];
      if (!firstText || firstText.type !== 'text') return;
      
      // Match [!type] or [!type] Title
      const match = firstText.value.match(/^\[!(\w+)\](?:\s+(.+))?$/);
      if (!match) return;
      
      const [, type, customTitle] = match;
      if (!CALLOUT_TYPES.includes(type.toLowerCase())) return;
      
      // Remove the callout marker from content
      firstText.value = firstText.value.replace(/^\[!\w+\](?:\s+.+)?[\n\r]*/, '');
      if (!firstText.value) {
        firstChild.children.shift();
      }
      
      // Transform to custom callout node
      node.data = {
        hName: 'div',
        hProperties: {
          className: [`callout`, `callout-${type.toLowerCase()}`],
          'data-callout-type': type.toLowerCase(),
          'data-callout-title': customTitle || type
        }
      };
    });
  };
}
```

### 6.4 Callout Styles

```css
/* styles/callouts.css */

.callout {
  margin: 1.5rem 0;
  padding: 1rem;
  border-radius: 0.5rem;
  border-left: 4px solid;
}

.callout-note {
  background-color: #eff6ff;
  border-color: #3b82f6;
}

.callout-tip {
  background-color: #f0fdf4;
  border-color: #22c55e;
}

.callout-warning {
  background-color: #fefce8;
  border-color: #eab308;
}

.callout-danger {
  background-color: #fef2f2;
  border-color: #ef4444;
}

.callout-quote {
  background-color: #f9fafb;
  border-color: #9ca3af;
  font-style: italic;
}

.callout-example {
  background-color: #faf5ff;
  border-color: #a855f7;
}

.callout::before {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
  content: attr(data-callout-title);
}
```

---

## 7. APPLICATION STRUCTURE

```
dwaynemcyrus-site/
├── src/
│   ├── components/
│   │   ├── Head.astro
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── Nav.astro
│   │   ├── Backlinks.astro
│   │   ├── Callout.astro
│   │   ├── ArticleLayout.astro
│   │   └── CollectionLayout.astro
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   ├── ArticleLayout.astro
│   │   └── CollectionLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── library/
│   │   │   ├── index.astro
│   │   │   ├── principles/
│   │   │   │   ├── index.astro
│   │   │   │   └── [...slug].astro
│   │   │   └── fragments/
│   │   │       ├── index.astro
│   │   │       └── [...slug].astro
│   │   ├── mentor/
│   │   │   ├── index.astro
│   │   │   └── [...slug].astro
│   │   ├── engineer/
│   │   │   ├── index.astro
│   │   │   └── projects/
│   │   │       ├── index.astro
│   │   │       └── [...slug].astro
│   │   ├── artist/
│   │   │   ├── index.astro
│   │   │   └── work/
│   │   │       └── [...slug].astro
│   │   └── now.astro
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── content.ts
│   │   ├── wiki-links.ts
│   │   └── backlinks.ts
│   ├── plugins/
│   │   ├── remark-wiki-links.ts
│   │   └── remark-callouts.ts
│   └── styles/
│       ├── global.css
│       ├── typography.css
│       └── callouts.css
├── public/
│   ├── images/
│   └── fonts/
├── astro.config.mjs
└── package.json
```

---

## 8. KEY PAGES

### 8.1 Home Page

```
┌─────────────────────────────────────────────────────────────────────────┐
│  DWAYNE M. CYRUS                                                        │
│  Engineer · Mentor · Artist                                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Welcome. I build software, guide men through emotional mastery,        │
│  and make art. This is my digital garden — a living collection of       │
│  ideas, projects, and explorations.                                     │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  RECENTLY UPDATED                                                       │
│                                                                         │
│  • Emotional Sovereignty                           Jan 15               │
│  • The Practice of Becoming                        Jan 12               │
│  • Anchored: Building a Personal OS               Jan 10               │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  EXPLORE                                                                │
│                                                                         │
│  [Library]     Essays, principles, and fragments                        │
│  [Engineer]    Software projects and technical writing                  │
│  [Mentor]      The Voyagers program and philosophy                      │
│  [Artist]      Visual work and poetry                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Article Page

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Library / Principles                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  EMOTIONAL SOVEREIGNTY                                                  │
│  Published Jan 15, 2024 · 8 min read                                   │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  [Article content with rendered markdown, wiki-links, callouts...]      │
│                                                                         │
│  > [!note]                                                              │
│  > This principle builds on [[The Practice of Becoming]].              │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  LINKED FROM                                                            │
│                                                                         │
│  • The Practice of Becoming                                             │
│    "...as I discussed in [[Emotional Sovereignty]], the key is..."     │
│                                                                         │
│  • Weekly Review: Jan 15                                                │
│    "...revisiting [[Emotional Sovereignty]] helped me..."              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 8.3 Collection Index

```
┌─────────────────────────────────────────────────────────────────────────┐
│  LIBRARY                                                                │
│  Essays, principles, and collected fragments                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  PRINCIPLES (5)                                                         │
│  Core ideas that guide my work and life                                 │
│                                                                         │
│  • Emotional Sovereignty                                    Jan 15      │
│  • The Practice of Becoming                                 Jan 12      │
│  • Radical Acceptance                                       Dec 28      │
│  • Stillness as Strategy                                    Dec 15      │
│  • The Examined Life                                        Nov 30      │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  FRAGMENTS (12)                                                         │
│  Shorter thoughts and observations                                      │
│                                                                         │
│  • On Stillness and Motion                                  Jan 14      │
│  • Morning Light                                            Jan 10      │
│  • The Weight of Words                                      Jan 8       │
│  [View all →]                                                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 9. BUILD PROCESS

### 9.1 Astro Configuration

```javascript
// astro.config.mjs

import { defineConfig } from 'astro/config';
import { remarkWikiLinks } from './src/plugins/remark-wiki-links';
import { remarkCallouts } from './src/plugins/remark-callouts';

export default defineConfig({
  site: 'https://dwaynemcyrus.com',
  // MDX integration can be added later if needed:
  // import mdx from '@astrojs/mdx';
  // integrations: [mdx()],
  markdown: {
    remarkPlugins: [
      // Wiki-links and callouts added dynamically with index
    ],
    shikiConfig: {
      theme: 'github-light'
    }
  }
});
```

### 9.2 Build Script

```typescript
// scripts/build-content.ts

import { createClient } from '@supabase/supabase-js';
import { buildLinkIndex } from '../src/lib/wiki-links';
import { buildBacklinks } from '../src/lib/backlinks';
import fs from 'fs/promises';

async function buildContent() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );
  
  // Fetch all public, published documents
  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('visibility', 'public')
    .eq('status', 'published');
  
  if (!documents) {
    console.error('No documents found');
    return;
  }
  
  // Build indexes
  const linkIndex = buildLinkIndex(documents);
  const backlinks = buildBacklinks(documents, linkIndex);
  
  // Write to JSON for Astro to consume
  await fs.writeFile(
    './src/data/documents.json',
    JSON.stringify(documents, null, 2)
  );
  
  await fs.writeFile(
    './src/data/link-index.json',
    JSON.stringify(Object.fromEntries(linkIndex), null, 2)
  );
  
  await fs.writeFile(
    './src/data/backlinks.json',
    JSON.stringify(backlinks, null, 2)
  );
  
  console.log(`Built content: ${documents.length} documents`);
}

buildContent();
```

### 9.3 Deploy Trigger

**Option A: Manual from Anchored**
- "Publish Site" button in Anchored
- Calls Vercel Deploy Hook

**Option B: Scheduled**
- Vercel Cron job runs daily
- Rebuilds site with latest content

```typescript
// In Anchored: trigger rebuild
async function publishSite() {
  await fetch(process.env.VERCEL_DEPLOY_HOOK!, {
    method: 'POST'
  });
}
```

---

## 10. ACCEPTANCE CRITERIA

Phase 2 is complete when:

### Content Fetching
- [ ] Astro fetches documents from Supabase at build time
- [ ] Only public + published documents are included
- [ ] Build fails gracefully if Supabase is unavailable

### Wiki-Links
- [ ] `[[Page Title]]` resolves to correct URL
- [ ] `[[slug|Display Text]]` shows custom text
- [ ] Unresolved links show as broken (styled differently)
- [ ] Links work across collections

### Backlinks
- [ ] Each article shows "Linked from" section
- [ ] Backlinks include title and excerpt
- [ ] Clicking backlink navigates to source page

### Callouts
- [ ] `> [!note]` renders as styled block
- [ ] All 6 callout types work
- [ ] Custom titles work (`> [!tip] Pro Tip`)

### Pages
- [ ] Home page shows recent updates
- [ ] Collection indexes list articles
- [ ] Article pages render markdown correctly
- [ ] /now page works

### Navigation
- [ ] Header with main sections
- [ ] Breadcrumbs on article pages
- [ ] Footer with links

### Responsive
- [ ] Desktop: comfortable reading width
- [ ] Mobile: full-width, readable typography

### Deploy
- [ ] Site deploys to Vercel
- [ ] Manual deploy trigger works from Anchored (or API)

---

## 11. DEVELOPMENT ORDER

### Week 5: Foundation + Content Pipeline
1. Set up Astro 5 project with plain CSS
2. Configure Supabase client
3. Build content fetching script
4. Create link index and backlinks builders
5. Implement remark plugins (wiki-links, callouts)
6. Test with sample content

### Week 6: Pages + Polish
1. Build layouts (Base, Article, Collection)
2. Create home page
3. Build collection index pages
4. Build article pages with backlinks
5. Add navigation (header, footer, breadcrumbs)
6. Responsive pass
7. Set up Vercel deploy
8. Test deploy trigger

---

## 12. SAMPLE CONTENT FOR TESTING

Create 5-10 test documents in Supabase to verify:

```json
{
  "id": "01HQXYZ...",
  "title": "Emotional Sovereignty",
  "slug": "emotional-sovereignty",
  "collection": "library/principles",
  "visibility": "public",
  "status": "published",
  "canonical": "/library/principles/emotional-sovereignty",
  "body_md": "# Emotional Sovereignty\n\nThis builds on [[The Practice of Becoming]].\n\n> [!note]\n> This is a core principle.\n\nMore content here...",
  "published_at": "2024-01-15T00:00:00Z"
}
```

Create documents that:
- Link to each other (test wiki-links)
- Use callouts (test rendering)
- Span multiple collections (test routing)
- Have varying lengths (test layout)

---

## 13. SUCCESS METRICS

After Week 6, you should have:

1. A live site at dwaynemcyrus.com
2. At least 5 articles rendering correctly
3. Wiki-links connecting related content
4. Backlinks showing on each page
5. Callouts rendering with proper styling
6. Ability to trigger rebuild from Anchored

The site should feel like a living digital garden — interconnected, explorable, and distinctly yours.
