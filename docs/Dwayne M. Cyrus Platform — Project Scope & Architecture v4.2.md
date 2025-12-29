# Dwayne M. Cyrus Platform — Project Scope & Architecture v4.2

## 0. OVERVIEW

This document defines the complete architecture for Dwayne M. Cyrus’s personal platform — a system for publishing, mentorship, and personal operations that must remain maintainable for 10+ years.

### 0.1 The Four Surfaces

|Domain                     |Framework               |Purpose                                                                |
|---------------------------|------------------------|-----------------------------------------------------------------------|
|`dwaynemcyrus.com`         |Astro                   |Public digital garden — reading, backlinks, SEO, brand positioning     |
|`voyagers.dwaynemcyrus.com`|Next.js                 |Client portal — 1:1 mentorship, supporter tier, session management     |
|`prints.dwaynemcyrus.com`  |POD Platform            |Art prints — physical products via print-on-demand                     |
|`getanchored.app`          |Next.js (responsive web)|Personal OS — tasks, time tracking, habits, journals, content authoring|

### 0.2 Core Principles

1. **getanchored.app is canonical** for all authored content
2. **Supabase is the source of truth** — all data lives here, real-time updates, operational data
3. **Git is a nightly backup** — versioned export for portability and disaster recovery, not in the write path
4. **Public site stays static-first** — Astro, no auth, minimal JS, builds from Supabase export
5. **Voyagers portal owns client interactions** — auth, sessions, feedback, billing
6. **One writing environment** — all content authored in Anchored, never in Voyagers portal
7. **Two tiers at launch** — 1:1 (highest) and Supporter (lowest), add middle tiers later

### 0.3 Brand Context

Dwayne M. Cyrus positions himself in the category of men’s emotional mastery. The public site establishes authority and trust. The portal serves mentorship clients (Voyagers program). Anchored is the personal operating system that powers everything and will eventually become a client-facing product.

-----

## 1. SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        getanchored.app                                  │
│                    (Personal OS / Canonical Source)                     │
├─────────────────────────────────────────────────────────────────────────┤
│  ALL writing happens here:                                              │
│                                                                         │
│  Personal:          Content:             Mentorship:                    │
│  • Tasks/Projects   • Articles           • Session prep                 │
│  • Time tracking    • Resources          • Internal notes (private)     │
│  • Habits           • Announcements      • Feedback notes (shared)      │
│  • Journals         • Essays             • Client summaries             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              │  Save
                              ▼
                       ┌──────────────┐
                       │   Supabase   │ ← Source of Truth
                       │  (immediate) │
                       └──────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
            ▼                 ▼                 ▼
     Voyagers Portal    Public Site       Nightly Export
     (real-time read)   (build on publish)    (Git backup)
            │                 │                 │
            ▼                 ▼                 ▼
┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
│    voyagers.      │  │  dwaynemcyrus     │  │    Git Repo       │
│ dwaynemcyrus.com  │  │      .com         │  │    (backup)       │
├───────────────────┤  ├───────────────────┤  ├───────────────────┤
│ Client portal     │  │ Astro static site │  │ Versioned export  │
│ Sessions, Q&A     │  │ Digital garden    │  │ Disaster recovery │
│ Billing, tiers    │  │ Backlinks         │  │ Portability       │
└───────────────────┘  └───────────────────┘  └───────────────────┘
                              │
                              │ "Buy print" links
                              ▼
                       ┌─────────────────────────────────────────────────┐
                       │         prints.dwaynemcyrus.com                 │
                       │            (Print Store)                        │
                       ├─────────────────────────────────────────────────┤
                       │ POD platform storefront (Printful/Gelato)       │
                       └─────────────────────────────────────────────────┘
```

### 1.1 Data Flow Model

Supabase is the single source of truth. All writes go directly to Supabase.

```
User saves in Anchored
         │
         ▼
    Supabase upsert
    (immediate)
         │
         ├──────────────────────────────────────┐
         │                                      │
         ▼                                      ▼
    Voyagers Portal                      Public Site Build
    sees update instantly                (triggered manually
    via Realtime subscription            or on publish action)
         
                    ┌──────────────────┐
                    │   Nightly Job    │
                    │   (scheduled)    │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   Git Export     │
                    │   (backup only)  │
                    └──────────────────┘
```

**Key properties:**

- **Speed:** Supabase write is immediate; no Git in the critical path
- **Simplicity:** No parallel write complexity, no Git credentials in app
- **Portability:** Nightly Git export means you can leave anytime with full history
- **Recovery:** If Supabase fails catastrophically, restore from Git export

-----

## 2. DOMAIN RESPONSIBILITIES

### 2.1 getanchored.app (Personal OS)

**Purpose:** Single environment for all of Dwayne’s writing, thinking, and personal operations.

**Owns:**

- All markdown content (articles, resources, session materials)
- Personal data (journals, OKRs, habits, reviews) — private DB only
- Session preparation and summaries
- Internal notes (private, never synced to Git)
- Feedback notes (shared with clients, synced to Supabase)

**Outputs:**

- Git vault repository (all markdown except internal notes)
- Parallel writes to Supabase (session summaries, announcements, feedback notes)
- Exports public-mirror for Astro builds

**Complete Sitemap:**

```
/                               ← Dashboard / home
│
├─ /login
├─ /logout
├─ /auth/callback
│
├─ /write                       ← Content authoring
│  ├─ /new                      ← New document
│  ├─ /[id]                     ← Edit document
│  └─ /drafts                   ← Work in progress
│
├─ /vault                       ← Browse all content
│  ├─ /engineer/*
│  ├─ /mentor/*
│  ├─ /artist/*
│  ├─ /labs/*
│  ├─ /library/*
│  ├─ /members/*
│  ├─ /mentorship/*
│  └─ /search                   ← Full-text search
│
├─ /sessions                    ← Session management
│  ├─ /upcoming                 ← Scheduled sessions
│  ├─ /past                     ← Session archive
│  ├─ /new                      ← Create session
│  └─ /[id]                     ← Session workspace
│     ├─ /prep                  ← Preparation notes
│     ├─ /notes                 ← Internal notes (private DB, never Git)
│     └─ /summary               ← Client-facing summary
│
├─ /clients                     ← Client management
│  ├─ /[client-id]
│  │  ├─ /sessions              ← Sessions with this client
│  │  ├─ /feedback              ← Feedback notes for this client
│  │  ├─ /notes                 ← Internal notes about this client
│  │  └─ /questions             ← Q&A history
│  └─ /overview                 ← Coach dashboard
│
├─ /journal                     ← Private journaling
│  ├─ /daily                    ← Daily entries
│  │  └─ /[date]
│  ├─ /weekly                   ← Weekly reflections
│  │  └─ /[date]
│  └─ /prompts                  ← Journaling prompts
│
├─ /okrs                        ← Objectives & Key Results
│  ├─ /current                  ← Active quarter
│  ├─ /archive                  ← Past quarters
│  └─ /[quarter]                ← e.g., /2024-q1
│     └─ /[objective-id]
│
├─ /habits                      ← Habit tracking
│  ├─ /today                    ← Daily check-in
│  ├─ /streaks                  ← Streak overview
│  └─ /manage                   ← Add/edit habits
│
├─ /reviews                     ← Periodic reviews
│  ├─ /weekly
│  │  └─ /[date]
│  ├─ /monthly
│  │  └─ /[month]
│  ├─ /quarterly
│  │  └─ /[quarter]
│  └─ /annual
│     └─ /[year]
│
├─ /sync                        ← Vault sync controls
│  ├─ /status                   ← Sync status
│  ├─ /publish                  ← Trigger public-mirror export
│  └─ /history                  ← Sync log
│
└─ /settings                    ← App settings
   ├─ /profile
   ├─ /integrations             ← Git, Supabase connections
   └─ /preferences
```

**Notes:**

- All routes require authentication (owner-only initially)
- `/vault/*` mirrors Git vault structure for browsing/editing
- `/sessions/*` creates content in `vault/mentorship/sessions/`
- `/sessions/[id]/notes` writes to private DB, not Git
- `/clients/[id]/notes` writes to private DB, not Git
- `/journal`, `/okrs`, `/habits`, `/reviews` are private (never synced to Git)

**Key Features:**

- Markdown editor with wiki-link support
- Habit tracking and OKR management
- Session management (prep, internal notes, summaries, feedback)
- Content promotion workflow
- Parallel write: Git commit + Supabase upsert on save

**Future:** Becomes a SaaS product for clients after dogfooding.

-----

### 2.2 dwaynemcyrus.com (Digital Garden)

**Purpose:** Static public website for reading, discovery, and brand authority. Functions as a digital garden with interconnected notes.

**Characteristics:**

- Static-first (Astro)
- No authentication
- No user state or dashboards
- Minimal JavaScript
- Human-readable canonical URLs
- Wiki-link resolution with backlinks
- Obsidian-style callout blocks

**Digital Garden Features:**

- **Backlinks:** Each page shows “pages that link here”
- **Wiki-links:** `[[Internal Link]]` syntax resolved to proper URLs
- **Callouts:** `> [!note]`, `> [!warning]`, etc. rendered as styled blocks
- **Evergreen content:** Pages updated over time, not just blog posts

**Complete Sitemap:**

```
/                           ← Home
│
├─ /engineer                ← Engineering identity
│  ├─ /philosophy
│  ├─ /projects
│  │  └─ /[slug]
│  │     ├─ /releases
│  │     └─ /roadmap
│  ├─ /cv
│  └─ /engagement
│
├─ /mentor                  ← Mentorship identity
│  ├─ /voyagers             ← Program overview
│  ├─ /path                 ← The journey/methodology
│  ├─ /engagement           ← How to work together
│  └─ /application          ← Apply to join
│
├─ /artist                  ← Artist identity
│  ├─ /statement
│  ├─ /work
│  │  ├─ /visual
│  │  │  └─ /[slug]
│  │  └─ /poetry
│  │     └─ /[slug]
│  ├─ /practice
│  │  ├─ /everydays         ← Daily creative practice
│  │  │  └─ /[slug or date]
│  │  └─ /poetry
│  │     └─ /[slug or date]
│  └─ /exhibitions
│
├─ /labs                    ← Experiments & explorations
│  ├─ /software
│  │  └─ /[slug]
│  │     ├─ /changelog
│  │     └─ /roadmap
│  ├─ /visual
│  │  └─ /[slug]
│  └─ /systems
│     └─ /[slug]
│
├─ /library                 ← Collected writings (digital garden core)
│  ├─ /directives
│  │  └─ /[slug]
│  ├─ /principles
│  │  └─ /[slug]
│  ├─ /fragments
│  │  └─ /[slug]
│  ├─ /field-notes          ← Curated notes
│  │  └─ /[slug]
│  └─ /downloads            ← Public PDFs, resources
│     └─ /[slug]
│
├─ /newsletter
│  ├─ /subscribe
│  └─ /archive
│     └─ /[slug]
│
├─ /linked                  ← Curated links/bookmarks
│  └─ /[slug]
│
├─ /press
│  ├─ /appearances
│  │  └─ /[slug]
│  ├─ /writing              ← External publications
│  │  └─ /[slug]
│  └─ /assets               ← Press kit, logos, photos
│
├─ /store                   ← Product browsing (checkout via prints subdomain)
├─ /resources               ← Public resources
├─ /now                     ← Current focus
├─ /colophon                ← Site credits
├─ /contact                 ← Contact information
├─ /imprint                 ← Legal
├─ /privacy                 ← Privacy policy
│
├─ /login                   ← Redirect to voyagers.dwaynemcyrus.com/login
└─ /logout                  ← Redirect to voyagers.dwaynemcyrus.com/logout
```

**Notes:**

- All content on dwaynemcyrus.com is public
- Members-only content lives on voyagers.dwaynemcyrus.com
- `/login` and `/logout` are 301 redirects to the portal

**Build Process:**

1. Triggered manually from Anchored (“Publish Site” button) or on schedule
2. Fetches public + published documents from Supabase
3. Renders markdown with wiki-link resolution
4. Generates backlinks index
5. Deploys to Vercel

-----

### 2.3 voyagers.dwaynemcyrus.com (Client Portal)

**Purpose:** Authenticated client portal for Voyagers mentorship program.

**Launch Tiers:**

|Tier         |Access Level|Features                                                             |
|-------------|------------|---------------------------------------------------------------------|
|**1:1**      |Highest     |Sessions, prep/summary, feedback notes, Q&A, resources, announcements|
|**Supporter**|Lowest      |Resources, announcements, limited Q&A                                |

**Deferred Tiers:** Community, Armory, Group (add when needed)

**Owns:**

- User authentication (Supabase magic links)
- Entitlements and tier-based access control
- Stripe billing and subscriptions
- Session scheduling and management (1:1 tier)
- Feedback notes display (reads from Supabase)
- Q&A system
- Gated content rendering with paywall interstitials

**Does NOT Own:**

- Content authoring (that’s Anchored’s job)
- Session content creation (reads from Supabase, authored in Anchored)

**Portal Features by Tier:**

|Feature             |1:1      |Supporter            |
|--------------------|---------|---------------------|
|Announcements       |✓        |✓                    |
|Resources library   |✓        |✓                    |
|Session scheduling  |✓        |✗                    |
|Session prep/summary|✓        |✗                    |
|Feedback notes      |✓        |✗                    |
|Q&A (async)         |Unlimited|Limited (X per month)|
|Billing management  |✓        |✓                    |

**Complete Sitemap:**

```
/                           ← Dashboard / home (authenticated)
│
├─ /login                   ← Magic link auth
├─ /logout
├─ /auth/callback           ← OAuth callback
│
├─ /portal                  ← Voyagers mentorship portal
│  ├─ /announcements
│  ├─ /resources
│  ├─ /sessions             ← 1:1 tier only
│  │  └─ /[id]
│  ├─ /questions
│  │  └─ /[id]
│  └─ /feedback             ← 1:1 tier only
│     └─ /[id]
│
├─ /content                 ← Gated content viewer
│  └─ /[id]                 ← View any gated document by ID
│
├─ /membership              ← Membership information & upgrade
│  ├─ /tiers                ← Tier comparison
│  └─ /join                 ← Sign up / upgrade flow
│
├─ /subscribe               ← Subscription management
│  ├─ /success
│  └─ /cancel
│
├─ /account                 ← User account
│  ├─ /billing
│  └─ /settings
│
├─ /api                     ← API routes
│  ├─ /checkout
│  └─ /webhooks
│     └─ /stripe
│
└─ /unauthorized            ← Access denied page
```

**Notes:**

- All routes require authentication except `/login`, `/auth/callback`, `/unauthorized`, and `/membership/*`
- Feature access controlled by tier via entitlements table
- `/content/[id]` renders gated documents with paywall interstitial if unauthorized

**Key Principle:** This surface displays and manages client interactions. All substantive content originates in Anchored.

-----

## 3. CONTENT MODEL

### 3.1 Content Types and Locations

|Content Type    |Authored In    |Stored In           |Synced To                |Visible In        |
|----------------|---------------|--------------------|-------------------------|------------------|
|Articles, essays|Anchored       |Git vault + Supabase|Public-mirror (if public)|dwaynemcyrus.com  |
|Resources       |Anchored       |Git vault + Supabase|—                        |Portal            |
|Announcements   |Anchored       |Git vault + Supabase|—                        |Portal            |
|Session prep    |Anchored       |Git vault + Supabase|—                        |Portal (selective)|
|Session summary |Anchored       |Git vault + Supabase|—                        |Portal            |
|Internal notes  |Anchored       |Private DB only     |Never                    |Anchored only     |
|Feedback notes  |Anchored       |Supabase            |Vault (if promoted)      |Portal            |
|Q&A responses   |Portal/Anchored|Supabase            |Vault (if promoted)      |Portal            |
|Journals        |Anchored       |Private DB only     |Never                    |Anchored only     |
|OKRs, habits    |Anchored       |Private DB only     |Never                    |Anchored only     |

### 3.2 Document Schema (Git Vault)

All markdown documents in the vault include YAML frontmatter:

```yaml
---
id: 01HQ3K5V7X... (ULID, permanent identifier)
title: Document Title
slug: document-slug (optional, for URL generation)
aliases: [] (alternative titles for wiki-link resolution)
collection: engineer | mentor | artist | labs | library | members | newsletter | linked | press | mentorship | pages
visibility: public | members | patron | voyagers | group | community | armory | private
status: draft | published | archived
canonical: /library/document-slug (required for public + published)
redirect_from: [] (old URLs that should redirect here)
tiers: [] (for gated content: group, community, armory, patron, members)
tags: []
summary: Brief description
date: 2024-01-15 (publication or event date)
hero: /images/hero.jpg (optional hero image)
---

Document content in markdown...
```

**Collection Reference:**

|Collection  |Description                                      |Default Visibility|
|------------|-------------------------------------------------|------------------|
|`engineer`  |Engineering identity content                     |public            |
|`mentor`    |Mentorship philosophy & program info             |public            |
|`artist`    |Creative work and practice                       |public            |
|`labs`      |Experiments (software, visual, systems)          |public            |
|`library`   |Collected writings (directives, principles, etc.)|public            |
|`members`   |Subscriber-exclusive content                     |members           |
|`newsletter`|Newsletter archive                               |public            |
|`linked`    |Curated links/bookmarks                          |public            |
|`press`     |Appearances and external writing                 |public            |
|`mentorship`|Portal content (sessions, resources, Q&A)        |voyagers          |
|`pages`     |Static pages (now, contact, etc.)                |public            |

### 3.3 Visibility Levels

|Visibility |Who Can Access     |Where Displayed |
|-----------|-------------------|----------------|
|`public`   |Everyone           |dwaynemcyrus.com|
|`members`  |Any paid subscriber|Portal          |
|`patron`   |Patron tier        |Portal          |
|`voyagers` |Any Voyagers tier  |Portal          |
|`group`    |Group coaching tier|Portal          |
|`community`|Community tier     |Portal          |
|`armory`   |Armory tier        |Portal          |
|`private`  |Owner only         |Anchored        |

### 3.4 Version Control

**Git Vault:**

- All markdown commits create version history
- Portable and inspectable
- Supports branching for drafts if needed
- Recovery source if Supabase fails

**Supabase (document_versions table):**

- Append-only snapshots for operational documents
- Used for content synced to Supabase
- Tracks who made changes and when

-----

## 4. DATA ARCHITECTURE

### 4.1 Git Vault Structure

The vault mirrors the public site’s information architecture plus private/gated content:

```
vault/
│
├── engineer/                       ← Engineering identity
│   ├── philosophy.md
│   ├── cv.md
│   ├── engagement.md
│   └── projects/
│       └── [project-slug]/
│           ├── index.md
│           ├── releases.md
│           └── roadmap.md
│
├── mentor/                         ← Mentorship identity
│   ├── voyagers.md
│   ├── path.md
│   ├── engagement.md
│   └── application.md
│
├── artist/                         ← Artist identity
│   ├── statement.md
│   ├── work/
│   │   ├── visual/
│   │   │   └── [slug].md
│   │   └── poetry/
│   │       └── [slug].md
│   ├── practice/
│   │   ├── everydays/
│   │   │   └── [date-or-slug].md
│   │   └── poetry/
│   │       └── [date-or-slug].md
│   └── exhibitions.md
│
├── labs/                           ← Experiments
│   ├── software/
│   │   └── [slug]/
│   │       ├── index.md
│   │       ├── changelog.md
│   │       └── roadmap.md
│   ├── visual/
│   │   └── [slug].md
│   └── systems/
│       └── [slug].md
│
├── library/                        ← Collected writings (public)
│   ├── directives/
│   │   └── [slug].md
│   ├── principles/
│   │   └── [slug].md
│   ├── fragments/
│   │   └── [slug].md
│   ├── field-notes/
│   │   └── [slug].md
│   └── downloads/
│       └── [slug].md
│
├── members/                        ← Members-only content (gated)
│   ├── archive/
│   │   └── [slug].md
│   ├── dispatches/
│   │   └── [slug].md
│   ├── audio/
│   │   └── [slug].md
│   └── downloads/
│       └── [slug].md
│
├── newsletter/
│   └── archive/
│       └── [slug].md
│
├── linked/                         ← Curated links
│   └── [slug].md
│
├── press/
│   ├── appearances/
│   │   └── [slug].md
│   └── writing/
│       └── [slug].md
│
├── mentorship/                     ← Portal content (synced to Supabase)
│   ├── resources/
│   │   └── [slug].md
│   ├── announcements/
│   │   └── [date]-[title].md
│   ├── sessions/
│   │   └── [date]-[type]-[topic]/
│   │       ├── prep.md             ← Preparation notes
│   │       └── summary.md          ← Client-facing summary
│   ├── answers/                    ← Promoted from Q&A
│   │   └── [slug].md
│   └── feedback/                   ← Promoted from feedback notes
│       └── [slug].md
│
├── pages/                          ← Static pages
│   ├── now.md
│   ├── contact.md
│   ├── colophon.md
│   ├── resources.md
│   ├── imprint.md
│   └── privacy.md
│
└── _index/                         ← Generated indexes (optional)
    ├── links.json                  ← Wiki-link resolution index
    └── tags.json                   ← Tag aggregation
```

**Note:** Internal notes (`notes.md`) do NOT exist in the vault. They are stored only in Anchored’s private database.

**Collection → URL Mapping:**

|Vault Path                 |Public URL                     |Visibility|
|---------------------------|-------------------------------|----------|
|`engineer/projects/foo/`   |`/engineer/projects/foo`       |public    |
|`library/principles/bar.md`|`/library/principles/bar`      |public    |
|`members/dispatches/baz.md`|`app.../members/dispatches/baz`|members   |
|`mentorship/sessions/...`  |`app.../portal/sessions/[id]`  |voyagers  |

### 4.2 Supabase Schema

#### Users and Auth

```sql
-- Managed by Supabase Auth
-- Users authenticate via magic link

-- Extended user profiles
profiles
  - id: uuid (PRIMARY KEY, references auth.users)
  - full_name: text (NOT NULL)
  - display_name: text (nullable, defaults to first name)
  - avatar_url: text (nullable)
  - onboarded_at: timestamptz (nullable, set when user completes onboarding)
  - created_at: timestamptz (default now())
  - updated_at: timestamptz (default now())
```

#### Entitlements

```sql
-- Launch tiers: '1v1' (highest) and 'supporter' (lowest)
-- Future tiers can be added: 'community', 'armory', 'group'

entitlements
  - id: uuid (PRIMARY KEY, default gen_random_uuid())
  - user_id: uuid (NOT NULL, references auth.users)
  - tier: text (NOT NULL, CHECK tier IN ('1v1', 'supporter'))
  - active: boolean (NOT NULL, default true)
  - starts_at: timestamptz (default now())
  - expires_at: timestamptz (nullable, NULL = no expiry)
  - stripe_subscription_id: text (nullable)
  - created_at: timestamptz (default now())
  - updated_at: timestamptz (default now())

-- One active entitlement per user
CREATE UNIQUE INDEX idx_entitlements_active 
ON entitlements(user_id) WHERE active = true;
```

#### Tier Permissions

|Feature              |1:1      |Supporter|
|---------------------|---------|---------|
|Announcements        |✓        |✓        |
|Resources library    |✓        |✓        |
|Session scheduling   |✓        |✗        |
|Session prep/summary |✓        |✗        |
|Feedback notes       |✓        |✗        |
|Q&A (async questions)|Unlimited|3/month  |
|Billing management   |✓        |✓        |

#### Documents

```sql
documents
  - id: text (PRIMARY KEY, ULID)
  - title: text (NOT NULL)
  - slug: text (nullable, for URL generation)
  - collection: text (nullable)
  - visibility: text (NOT NULL, default 'private')
    -- Values: 'public' | 'supporter' | '1v1' | 'private'
  - status: text (NOT NULL, default 'draft')
    -- Values: 'draft' | 'published' | 'archived'
  - canonical: text (nullable, public URL path)
  - body_md: text (nullable)
  - summary: text (nullable, for previews)
  - metadata: jsonb (default '{}')
  - created_at: timestamptz (default now())
  - updated_at: timestamptz (default now())
  - published_at: timestamptz (nullable)
```

#### Portal Sessions

```sql
portal_sessions
  - id: uuid (PRIMARY KEY, default gen_random_uuid())
  - title: text (NOT NULL)
  - session_type: text (NOT NULL, default '1v1')
    -- Values: '1v1' | 'group' (future)
  - client_id: uuid (NOT NULL for 1v1, references auth.users)
  - scheduled_at: timestamptz (NOT NULL)
  - duration_minutes: integer (default 60)
  - recording_url: text (nullable)
  - prep_md: text (nullable, preparation notes)
  - prep_visible: boolean (default false)
  - summary_md: text (nullable, client-facing summary)
  - summary_visible: boolean (default false)
  - status: text (default 'scheduled')
    -- Values: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  - created_at: timestamptz (default now())
  - updated_at: timestamptz (default now())

CREATE INDEX idx_sessions_client ON portal_sessions(client_id);
CREATE INDEX idx_sessions_date ON portal_sessions(scheduled_at);
```

#### Internal Notes (Private — Anchored DB only, not Git)

```sql
internal_notes
  - id: uuid
  - owner_id: uuid (always Dwayne — references auth.users)
  - client_id: uuid (nullable — references auth.users)
  - session_id: uuid (nullable — references portal_sessions)
  - body_md: text (encrypted at rest)
  - created_at: timestamptz
  - updated_at: timestamptz

-- Constraint: at least one of client_id or session_id must be non-null
```

**Access patterns:**

- Session workspace → Internal Notes tab: filter by `session_id`
- Client profile → Private Notes section: filter by `client_id`
- Both populated: note is about a specific client in a specific session context

#### Feedback Notes (Shared with clients)

```sql
feedback_notes
  - id: uuid
  - client_id: uuid (references auth.users — required)
  - session_id: uuid (nullable — references portal_sessions)
  - title: text
  - body_md: text
  - promoted_to_vault: boolean (default false)
  - vault_path: text (nullable — set after promotion)
  - created_at: timestamptz
  - updated_at: timestamptz
```

**Behavior:**

- `session_id` present: feedback note appears under that session in portal
- `session_id` null: standalone feedback, appears in client’s Feedback section
- Promotion: commits to `vault/mentorship/feedback/[slug].md`, sets `promoted_to_vault: true`, `vault_path`
- Once promoted, content is immutable (edits require new document)

#### Portal Q&A

```sql
portal_questions
  - id: uuid
  - user_id: uuid (who asked — references auth.users)
  - title: text
  - body_md: text
  - status: text (open | answered | closed)
  - audience: text (tier of the asker)
  - created_at: timestamptz

portal_responses
  - id: uuid
  - question_id: uuid (references portal_questions)
  - body_md: text
  - promoted_to_vault: boolean
  - vault_path: text (nullable, set after promotion)
  - created_at: timestamptz
```

#### Portal Announcements (Parallel-written from Anchored)

```sql
portal_announcements
  - id: uuid
  - vault_path: text
  - title: text
  - body_md: text
  - audience: text (tier or 'all')
  - published_at: timestamptz (nullable)
  - created_at: timestamptz
```

#### Portal Resources (Parallel-written from Anchored)

```sql
portal_resources
  - id: uuid
  - vault_path: text
  - title: text
  - description: text (nullable)
  - resource_type: text (link | file | document)
  - url: text (nullable)
  - file_path: text (nullable)
  - audience: text
  - created_at: timestamptz
```

#### Store (Future)

```sql
products
  - id: uuid
  - title: text
  - description: text
  - price_cents: integer
  - product_type: text (digital | pod)
  - stripe_product_id: text
  - created_at: timestamptz

orders
  - id: uuid
  - user_id: uuid
  - product_id: uuid
  - stripe_payment_intent_id: text
  - status: text
  - created_at: timestamptz
```

#### Stripe Customers

```sql
stripe_customers
  - id: uuid (PRIMARY KEY, default gen_random_uuid())
  - user_id: uuid (NOT NULL, UNIQUE, references auth.users)
  - stripe_customer_id: text (NOT NULL, UNIQUE)
  - created_at: timestamptz (default now())
```

#### Portal Uploads (Client Submissions)

```sql
portal_uploads
  - id: uuid (PRIMARY KEY, default gen_random_uuid())
  - user_id: uuid (NOT NULL, references auth.users)
  - session_id: uuid (nullable, references portal_sessions)
  - filename: text (NOT NULL)
  - storage_path: text (NOT NULL)
  - file_size: integer (bytes)
  - mime_type: text
  - description: text (nullable)
  - reviewed: boolean (default false)
  - reviewed_at: timestamptz (nullable)
  - created_at: timestamptz (default now())

CREATE INDEX idx_uploads_user ON portal_uploads(user_id);
CREATE INDEX idx_uploads_session ON portal_uploads(session_id);
```

#### Newsletter Subscriptions

**Provider:** MailerLite

```sql
newsletter_subscriptions
  - id: uuid (PRIMARY KEY, default gen_random_uuid())
  - user_id: uuid (nullable, references auth.users)
  - email: text (NOT NULL, UNIQUE)
  - mailerlite_subscriber_id: text (nullable)
  - subscribed_at: timestamptz (default now())
  - unsubscribed_at: timestamptz (nullable)
  - created_at: timestamptz (default now())
```

-----

## 5. CONTENT FLOWS

### 5.1 Public Publishing Flow

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Anchored   │────────►│   Supabase   │────────►│  Astro Build │
│   (author)   │  save   │   (source)   │  build  │              │
└──────────────┘         └──────────────┘         └──────────────┘
                                                         │
                                                         ▼
                                                  ┌──────────────┐
                                                  │dwaynemcyrus  │
                                                  │    .com      │
                                                  └──────────────┘
```

**Process:**

1. Author/edit document in Anchored
2. Save writes directly to Supabase
3. Click “Publish Site” triggers Astro build
4. Build fetches public + published documents from Supabase
5. Astro renders static HTML with wiki-links resolved
6. Deploy to Vercel

**Nightly Git Export (backup):**

- Scheduled job exports all Supabase content to Git
- Versioned commits for history
- Recovery source if Supabase fails

### 5.2 Portal Content Flow

```
┌──────────────┐         ┌──────────────┐
│   Anchored   │────────►│   Supabase   │
│   (author)   │  save   │   Realtime   │
└──────────────┘         └──────────────┘
                               │
                               ▼ (immediate)
                        ┌──────────────┐
                        │   Voyagers   │
                        │    Portal    │
                        └──────────────┘
```

**Content Types Written from Anchored:**

- Announcements → `portal_announcements`
- Resources → `portal_resources`
- Session prep/summaries → `portal_sessions`
- Feedback notes → `feedback_notes`

**Latency:** Sub-second from save to portal visibility via Supabase Realtime.

### 5.3 Session Lifecycle Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            BEFORE SESSION                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Create session in Anchored:                                         │
│     - Session record created in Supabase (portal_sessions)             │
│     - Vault folder created: vault/mentorship/sessions/2024-01-15-.../  │
│                                                                         │
│  2. Write prep.md:                                                      │
│     - Agenda, topics, exercises, resources                              │
│     - Parallel write: Git + Supabase (prep_md field)                   │
│     - Set prep_visible: true/false                                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            DURING SESSION                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Session happens (live or recorded)                                     │
│  Recording URL added to Supabase record if applicable                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            AFTER SESSION                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  3. Write internal notes (PRIVATE — NEVER IN GIT):                     │
│     - Raw observations, progress notes, private assessments            │
│     - Stored in internal_notes table (encrypted at rest)               │
│     - Linked by session_id and/or client_id                            │
│     - Viewable only in Anchored                                         │
│                                                                         │
│  4. Write summary.md (CLIENT-FACING):                                  │
│     - Key takeaways, action items, resources, encouragement            │
│     - Parallel write: Git + Supabase (summary_md field)                │
│     - Set summary_visible: true                                         │
│     - Client sees summary in Portal immediately                         │
│                                                                         │
│  5. Write feedback notes (SHARED WITH CLIENT):                         │
│     - Reflections for client growth                                     │
│     - Stored in feedback_notes table                                    │
│     - Linked by session_id and client_id                               │
│     - Client sees in Portal under session or Feedback section          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.4 Q&A and Feedback Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLIENT ASKS QUESTION                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Client submits question via Portal                                  │
│     → Stored in portal_questions                                        │
│     → Status: open                                                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         DWAYNE RESPONDS                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  2. Dwayne writes response (Portal or Anchored)                        │
│     → Stored in portal_responses                                        │
│     → Question status: answered                                         │
│                                                                         │
│  3. Decision point:                                                     │
│                                                                         │
│     QUICK REPLY (operational):                                          │
│     - "Check resource X"                                                │
│     - "We'll discuss Tuesday"                                           │
│     → Stays in Supabase only                                            │
│     → promoted_to_vault: false                                          │
│                                                                         │
│     SUBSTANTIVE ANSWER (valuable content):                              │
│     - Detailed technique explanation                                    │
│     - Reusable wisdom                                                   │
│     → Click [Promote to Vault]                                          │
│     → Opens form: title, tags, visibility                               │
│     → Commits to vault/mentorship/answers/                              │
│     → promoted_to_vault: true                                           │
│     → vault_path set                                                    │
│     → Content becomes IMMUTABLE                                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.5 Content Promotion Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      [PROMOTE TO VAULT] ACTION                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Triggered from: Q&A response or Feedback note                         │
│                                                                         │
│  1. User clicks [Promote to Vault] in Portal or Anchored               │
│                                                                         │
│  2. Form appears:                                                       │
│     - Title (pre-filled from context)                                   │
│     - Collection (mentorship/answers or mentorship/feedback)           │
│     - Tags                                                              │
│     - Visibility (usually tier-specific)                               │
│                                                                         │
│  3. On submit:                                                          │
│     - Generate ULID                                                     │
│     - Create markdown file with frontmatter                             │
│     - Commit to Git vault                                               │
│     - Update Supabase record:                                           │
│       → promoted_to_vault: true                                         │
│       → vault_path: path to new file                                    │
│                                                                         │
│  4. Content is now IMMUTABLE:                                           │
│     - Vault file is the permanent record                                │
│     - Portal reads from vault reference                                 │
│     - Edits not permitted                                               │
│     - To revise: publish new document that supersedes original         │
│     - Anchored UI marks promoted content as locked                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

-----

## 6. GATED CONTENT RENDERING

### 6.1 Wiki-Link Behavior for Gated Content

When a public article contains a wiki-link to gated content:

|Target Visibility                            |Rendered URL                                       |
|---------------------------------------------|---------------------------------------------------|
|`public`                                     |`https://dwaynemcyrus.com{canonical}`              |
|Gated (`members`, `patron`, `voyagers`, etc.)|`https://app.dwaynemcyrus.com/content/{id}`        |
|`private`                                    |Internal Anchored link only (not rendered publicly)|

### 6.2 Paywall Interstitial (Option A)

When an unauthenticated or unauthorized user clicks a gated link, they land on `app.dwaynemcyrus.com/content/{id}` and see:

**For unauthenticated users:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  [Document Title]                                                       │
│                                                                         │
│  [First paragraph or summary, if available]                            │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  This is [Voyagers/Members/Patron]-only content.                       │
│                                                                         │
│  [Brief, warm explanation of what this tier offers]                    │
│                                                                         │
│  [Testimonial or value proposition]                                    │
│                                                                         │
│  [Learn about membership →]                                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**For authenticated users lacking the required tier:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  [Document Title]                                                       │
│                                                                         │
│  [First paragraph or summary, if available]                            │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  This content is available to [Required Tier] members.                 │
│                                                                         │
│  You're currently on the [Current Tier] tier.                          │
│                                                                         │
│  [Upgrade to [Required Tier] →]                                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Benefits of this approach:**

- Respects reader flow (no pre-click warnings)
- Captures intent data (which gated content attracts interest)
- Higher conversion (user already demonstrated intent by clicking)
- Tier-specific upgrade paths for existing members

-----

## 7. WIKI-LINK SUPPORT

### 7.1 Authoring Syntax

Obsidian-style wiki-links are supported throughout:

```markdown
[[Document Title]]
[[Document Title|Display Text]]
[[Document Title#Section]]
```

### 7.2 Resolution Order

1. Title (normalized, case-insensitive)
2. Alias (from frontmatter `aliases` array)
3. Slug
4. ID (internal fallback)

### 7.3 Link Rendering

|Target Visibility                |Rendered URL                               |
|---------------------------------|-------------------------------------------|
|`public`                         |`https://dwaynemcyrus.com{canonical}`      |
|Gated (`members`, `patron`, etc.)|`https://app.dwaynemcyrus.com/content/{id}`|
|`private`                        |Internal Anchored link only                |

### 7.4 Link Index

A global link index is generated from the vault to enable:

- Wiki-link resolution at build time
- Broken link detection
- Backlink generation

-----

## 8. CANONICAL URL RULES

1. **Canonical = permanent public URL** (e.g., `/library/emotional-mastery-guide`)
2. **Human-readable, never ID-based** for public content
3. **Required only for public + published** documents
4. **IDs are internal** — used for database references, not public URLs
5. **Title/slug can change** without breaking canonical
6. **Redirects handle changes** via `redirect_from` frontmatter

-----

## 9. AUTHENTICATION & AUTHORIZATION

### 9.1 Auth Provider

Supabase Auth with magic links (passwordless email).

### 9.2 User Roles

|Role       |Description                 |Access                      |
|-----------|----------------------------|----------------------------|
|`owner`    |Dwayne (identified by email)|Everything                  |
|`member`   |Paid subscriber             |Members content             |
|`patron`   |Patron tier subscriber      |Patron + members content    |
|`group`    |Group coaching client       |Group + Voyagers content    |
|`community`|Community tier              |Community + Voyagers content|
|`armory`   |Armory tier                 |Armory + Voyagers content   |
|`voyager`  |Any Voyagers tier           |Base Voyagers content       |

### 9.3 Entitlement Checking

```typescript
// Pseudocode for access control
const hasAccess = (user, document) => {
  if (document.visibility === 'public') return true;
  if (!user) return false;
  if (isOwner(user)) return true;

  const userTiers = getActiveTiers(user);
  const requiredTiers = document.tiers || [document.visibility];

  if (requiredTiers.includes('all')) {
    return userTiers.length > 0;
  }

  return userTiers.some(tier => requiredTiers.includes(tier));
};
```

-----

## 10. STORE MODEL

The store is split by fulfillment type across three surfaces:

```
dwaynemcyrus.com/store              → Showcase/landing (links to both stores)
app.dwaynemcyrus.com/store          → Digital products (Stripe checkout)
prints.dwaynemcyrus.com             → Art prints (POD platform storefront)
```

### 10.1 Public Store Landing (dwaynemcyrus.com/store)

- Showcase page with product categories
- SEO-optimized product storytelling
- No checkout — routes users to appropriate store:
  - “Digital Products” → app.dwaynemcyrus.com/store
  - “Art Prints” → prints.dwaynemcyrus.com

### 10.2 Digital Store (app.dwaynemcyrus.com/store)

- **Products:** Workbooks, templates, courses, guides
- **Checkout:** Stripe
- **Delivery:** Instant via Supabase Storage
- **Features:**
  - Purchase history
  - License/entitlement management
  - Member discounts (tied to entitlements)
  - Re-download access

### 10.3 Print Store (prints.dwaynemcyrus.com)

- **Products:** Art prints, posters, merchandise
- **Platform:** POD service storefront (Printful, Gelato, or similar)
- **Fulfillment:** POD handles printing, shipping, returns
- **Setup:** DNS subdomain pointing to POD platform
- **Integration:** Linked from `/artist/work/*` pages

### 10.4 Why Split Stores

|Concern       |Digital (app.dwaynemcyrus.com)|Prints (prints.dwaynemcyrus.com)|
|--------------|------------------------------|--------------------------------|
|Fulfillment   |Instant download              |Physical shipping               |
|Margin        |~100%                         |~30-50% after POD costs         |
|Audience      |Mentorship clients            |Art collectors                  |
|Infrastructure|Your code + Stripe            |POD platform (turnkey)          |
|Returns       |N/A                           |POD handles                     |

### 10.5 Product Flow from Public Site

```
/artist/work/visual/[slug]     → "Buy print" → prints.dwaynemcyrus.com/[product]
/mentor/voyagers               → "Get workbook" → app.dwaynemcyrus.com/store/[product]
/store                         → Landing with both paths
```

**Note:** Store purchases are separate from memberships. Buying a product does not grant tier access.

-----

## 11. MEMBERSHIP & PORTAL TIERS

### 11.1 Patronage (General Membership)

- Path: `/members/*`
- Stripe subscriptions
- Tiers: `members`, `patron`

### 11.2 Voyagers (Mentorship Program)

- Path: `/portal/*`
- Tiered coaching program
- Tiers: `group`, `community`, `armory`, `patron`
- Optional cohort groupings

### 11.3 Tier Hierarchy

```
patron (highest)
   ↓
armory
   ↓
community
   ↓
group
   ↓
members (base paid tier)
   ↓
(free/unauthenticated)
```

Higher tiers include access to all lower tier content.

-----

## 12. COMMENTS MODEL

- **Public pages (dwaynemcyrus.com):** Read-only comment display
- **Members/clients:** Post comments via app
- **Moderation:** Handled in app.dwaynemcyrus.com
- **Keyed by:** Canonical URL (links comments across surfaces)

-----

## 13. PERSONAL OPERATIONS (ANCHORED)

These features live in getanchored.app and are private to the owner (initially):

### 13.1 Journals

- Daily/weekly entries
- Private, never synced to Git
- Stored in Anchored’s encrypted database

### 13.2 OKRs (Objectives & Key Results)

- Quarterly objectives
- Measurable key results
- Progress tracking

### 13.3 Habits

- Daily habit tracking
- Streaks and analytics

### 13.4 Reviews

- Weekly, monthly, quarterly, annual reviews
- Reflection templates

### 13.5 Future: Client Access

When Anchored becomes a product, clients will have their own:

- Journals
- Habit tracking
- Goal setting
- Progress visible to coach (Dwayne) if permitted

-----

## 14. REPOSITORIES

### Repo: dwaynemcyrus-com (Private)

- Astro public site code
- No authored content (reads from public-mirror)
- Deployment config

### Repo: dwaynemcyrus-app (Private)

- Next.js app code
- Portal, billing, store logic
- No authored content

### Repo: vault (Private)

- All markdown content
- Organized by collection
- Visibility controlled via frontmatter
- Source for public-mirror export

### Repo: public-mirror (Can be public)

- Generated export only
- Contains only `visibility: public` + `status: published`
- Safe build input for Astro
- Deletable and regeneratable

### Repo: getanchored-app (Private)

- Anchored application code
- Personal OS functionality

-----

## 15. TECHNOLOGY STACK

|Surface                  |Framework                   |Hosting        |Database                           |
|-------------------------|----------------------------|---------------|-----------------------------------|
|dwaynemcyrus.com         |Astro                       |Vercel         |None (static, builds from Supabase)|
|voyagers.dwaynemcyrus.com|Next.js                     |Vercel         |Supabase                           |
|prints.dwaynemcyrus.com  |POD Platform                |Printful/Gelato|Managed by platform                |
|getanchored.app          |Next.js (responsive web app)|Vercel         |Supabase                           |

**Note on getanchored.app:** Built as a responsive web application optimized for desktop and mobile browsers. No native iOS/Android apps in scope. Progressive Web App (PWA) capabilities may be added for home screen installation and offline support.

### Shared Services

- **Supabase:** Auth, PostgreSQL, Storage, Realtime — single source of truth
- **Stripe:** Payments, subscriptions (digital products)
- **Git:** Nightly backup export only (not in write path)
- **Vercel:** Hosting, edge functions, cron jobs (for nightly export)
- **POD Platform:** Print fulfillment, shipping, returns (Printful, Gelato, or similar)

-----

## 16. PHASED EXECUTION PLAN

> **⚠️ MVP FOCUS**
> 
> Phase 1-3 deliver the core 20% that provides 80% of value. Each phase builds on the previous and results in usable software.

### Phase 0 — IA & Schema Lock ✓

- Architecture defined
- Content model locked
- This document

### Phase 1 — Anchored Core (Weeks 1-4)

**Goal:** Personal productivity system you use daily while building everything else.

**Core Features (the 20%):**

- [ ] Supabase project setup
- [ ] Auth (owner-only, magic link)
- [ ] Projects → Tasks (defer Areas)
- [ ] Task status: inbox, today, anytime, done (defer other statuses)
- [ ] Stopwatch time tracking attached to tasks (defer pomodoro, activity log)
- [ ] Daily habit check-off with streaks (defer duration habits)
- [ ] Today view: tasks, habits, active timer
- [ ] End-of-day review: clear inbox, review today’s tasks
- [ ] Basic responsive UI (desktop + mobile browser)

**Deferred to Later:**

- Areas (task hierarchy level)
- 7-status task flow
- Pomodoro timer
- Activity logging
- Duration-based habits
- Time reports
- Weekly reviews

**Acceptance Criteria:**

- Can create projects and tasks
- Can track time on a task with stopwatch
- Can check off daily habits
- Can see what’s due today
- Can do end-of-day inbox zero review

### Phase 2 — Digital Garden (Weeks 5-6)

**Goal:** Public website live with digital garden features.

**Core Features:**

- [ ] Astro site setup with Vercel deploy
- [ ] Supabase → Astro build pipeline
- [ ] Markdown rendering with frontmatter
- [ ] Wiki-link resolution (`[[Internal Link]]` → proper URLs)
- [ ] Backlinks (“pages that link here”)
- [ ] Callout blocks (`> [!note]`, `> [!warning]`)
- [ ] Core collections: /library, /mentor, /engineer, /artist
- [ ] Simple navigation

**Deferred to Later:**

- Full sitemap implementation
- Search
- Tags
- Comments
- Newsletter integration

**Acceptance Criteria:**

- Public site renders markdown from Supabase
- Wiki-links work between pages
- Each page shows backlinks
- Callout blocks render styled

### Phase 3 — Voyagers Portal MVP (Weeks 7-8)

**Goal:** Client portal for 1:1 and Supporter tiers.

**Core Features:**

- [ ] Next.js app with Supabase auth
- [ ] Two tiers: 1:1 (highest), Supporter (lowest)
- [ ] Entitlements table and tier checking
- [ ] Stripe subscription integration
- [ ] Announcements (visible to all tiers)
- [ ] Resources library (visible to all tiers)
- [ ] Session management for 1:1 clients
- [ ] Feedback notes display for 1:1 clients
- [ ] Basic Q&A for 1:1 clients
- [ ] Account and billing management

**Deferred to Later:**

- Middle tiers (Community, Armory, Group)
- Cohorts
- Client uploads
- Comments
- Digital store

**Acceptance Criteria:**

- Clients can sign up for Supporter or 1:1 tier
- 1:1 clients see their sessions and feedback
- All clients see announcements and resources
- Billing works via Stripe

-----

### Phase 4 — Anchored Writing Core

**Goal:** Full markdown authoring in Anchored.

- [ ] Markdown editor with live preview
- [ ] Wiki-link support with autocomplete
- [ ] Document frontmatter editing
- [ ] Visibility and status controls
- [ ] Save to Supabase (triggers site rebuild option)
- [ ] Daily journal with prompts
- [ ] Journal ↔ Task two-way sync

### Phase 5 — Habits, OKRs, Reviews

- [ ] Full habit tracking with duration integration
- [ ] OKR management (quarterly objectives, key results)
- [ ] Weekly review with time reports
- [ ] Monthly/quarterly/annual reviews
- [ ] Review scheduling and prompts

### Phase 6 — Time Tracking Expansion

- [ ] Pomodoro timer mode
- [ ] Activity logging (non-task time)
- [ ] Hybrid categories with autocomplete
- [ ] Daily timeline view
- [ ] Time reports by project/category

### Phase 7 — Portal Expansion

- [ ] Additional tiers (Community, Armory, Group)
- [ ] Cohort support
- [ ] Client uploads
- [ ] Session recording integration
- [ ] Promotion to vault workflow

### Phase 8 — Comments & Community

- [ ] Comment system on digital garden
- [ ] Member posting via portal
- [ ] Moderation interface

### Phase 9 — Store & Products

- [ ] Product catalog
- [ ] Stripe checkout for digital products
- [ ] Digital delivery
- [ ] Purchase history

### Phase 10 — Nightly Git Export

- [ ] Scheduled Vercel cron job
- [ ] Full Supabase → Git export
- [ ] Versioned commits
- [ ] Recovery documentation

### Phase 11 — Reading App (Future)

- [ ] Save links, YouTube, PDFs, EPUBs
- [ ] In-app reader with highlighting
- [ ] Annotations and notes
- [ ] Export to vault
- [ ] Audio/video transcription (AI)

### Phase 12 — Anchored Product (Future)

- [ ] Multi-user support
- [ ] Client onboarding
- [ ] Coach visibility features
- [ ] Billing for Anchored

**Note:** Public release and native iOS app are out of scope for this project.

-----

## 17. ANCHORED DESIGN DIRECTION

> **⚠️ CLAUDE CODE ATTENTION REQUIRED**
> 
> When building getanchored.app, reference the design patterns and UX principles from the following applications. Anchored should feel like a focused, premium personal OS — not a generic SaaS dashboard.

### 17.1 Design Inspiration Sources

|App          |Borrow From                                                                                    |Apply To                                                                 |
|-------------|-----------------------------------------------------------------------------------------------|-------------------------------------------------------------------------|
|**Things 3** |Clean hierarchy, subtle animations, keyboard shortcuts, “today” focus, project/area structure  |Task views, habit tracking, session management, overall navigation       |
|**TickTick** |Calendar integration, habit streaks visualization, multi-view flexibility (list/board/calendar)|Habit tracking, OKR progress, session scheduling                         |
|**OmniFocus**|Perspectives (custom filtered views), review workflows, defer/due date model                   |Weekly/monthly reviews, vault filtering, content status workflows        |
|**Bear**     |Markdown editing, tag-based organization, minimal chrome, typography focus                     |Document authoring, wiki-links, vault browsing                           |
|**Obsidian** |Graph view, backlinks, wiki-link resolution, local-first philosophy, plugin-like extensibility |Vault structure, link resolution, content relationships                  |
|**iA Writer**|Distraction-free writing, focus mode, syntax highlighting, document library                    |Markdown editor, session prep/summary writing, journal entries           |
|**Stoic**    |Journaling prompts, reflection workflows, mood/emotion tracking, evening review ritual         |Daily journals, weekly reflections, review templates, personal operations|

### 17.2 Core UX Principles

**1. Focused, Not Busy**

- One primary action per screen
- Progressive disclosure — advanced features hidden until needed
- Generous whitespace, clear typography
- No dashboard clutter

**2. Keyboard-First, Touch-Friendly**

- All primary actions have keyboard shortcuts
- Command palette (⌘K) for quick navigation
- Mobile: thumb-friendly tap targets, swipe gestures
- Desktop: dense information display when appropriate

**3. Writing is Sacred**

- Editor is distraction-free by default
- No sidebar/chrome when writing (can toggle)
- Autosave with visible confirmation
- Markdown rendered inline (like Bear/iA Writer hybrid)

**4. Hierarchy Matters**

- Clear distinction: Personal (journals, OKRs) vs. Content (vault) vs. Mentorship (sessions, clients)
- Navigation reflects mental model, not database structure
- “Today” view as default landing (like Things 3)

**5. Review Rituals Built-In**

- Weekly review is a first-class feature (like OmniFocus)
- Prompts and templates for reflection
- Progress visualization for habits and OKRs

### 17.3 Visual Design Guidelines

**Typography:**

- System font stack for UI (native feel)
- Monospace or serif option for writing (user preference)
- Generous line-height in editor (1.6-1.8)

**Color:**

- Light mode default, dark mode supported
- Minimal accent color (one primary, used sparingly)
- Status colors: muted, not alarming (soft green/amber/red)

**Layout:**

- Sidebar navigation (collapsible)
- Main content area (flexible width)
- No right sidebar unless contextual (e.g., backlinks panel)
- Mobile: bottom tab bar for primary navigation

**Animations:**

- Subtle, fast transitions (150-200ms)
- No bouncy/playful animations — professional, calm
- Loading states: skeleton screens, not spinners

### 17.4 Responsive Behavior

**Desktop (>1024px):**

- Sidebar always visible (can collapse to icons)
- Full editor with metadata panel
- Multi-column views where appropriate

**Tablet (768-1024px):**

- Sidebar as overlay (swipe or hamburger)
- Full-width content
- Touch-optimized controls

**Mobile (<768px):**

- Bottom tab navigation (5 max: Today, Vault, Sessions, Journal, Settings)
- Full-screen views, stack navigation
- Swipe gestures for common actions
- Thumb-zone aware button placement

### 17.5 Key Screens to Design First

1. **Today View** — Dashboard showing: today’s habits, upcoming session, recent journal prompt, quick capture
2. **Vault Browser** — File tree with search, filters by collection/status/visibility
3. **Document Editor** — Distraction-free markdown with frontmatter panel
4. **Session Workspace** — Prep, internal notes, summary, feedback in tabbed view
5. **Journal Entry** — Prompted or freeform, date navigation
6. **Weekly Review** — Guided flow: what happened, what’s next, reflections
7. **Client Profile** — Sessions, feedback, internal notes, Q&A for one client
8. **Habit Tracker** — Today’s checklist, streak visualization, manage habits

-----

## 17. NON-NEGOTIABLE RULES

1. **getanchored.app is canonical** for all authored content
2. **Supabase is the source of truth** — all data lives here
3. **Git is backup only** — nightly export, not in write path
4. **Public site stays static-first** — Astro, builds from Supabase
5. **Voyagers portal owns client interactions** — auth, sessions, billing
6. **One phase at a time** — don’t skip ahead
7. **Core 20% first** — defer complexity until basics work
8. **Two tiers at launch** — 1:1 and Supporter only
9. **Human-readable canonical URLs** — never expose IDs publicly
10. **IDs are internal only** — ULIDs for database, not URLs
11. **No content authoring in voyagers.dwaynemcyrus.com** — that’s Anchored’s job
12. **Internal notes never leave Anchored** — private to owner
13. **Ship, use, then iterate** — dogfood before expanding

-----

## 19. GLOSSARY

|Term                    |Definition                                                                      |
|------------------------|--------------------------------------------------------------------------------|
|**Anchored**            |getanchored.app — the personal OS and canonical content source                  |
|**Digital Garden**      |The public website (dwaynemcyrus.com) with interconnected notes and backlinks   |
|**Voyagers Portal**     |Client-facing area at voyagers.dwaynemcyrus.com                                 |
|**Voyagers**            |Mentorship program with tiered access                                           |
|**1:1 Tier**            |Highest tier — full session access, feedback, unlimited Q&A                     |
|**Supporter Tier**      |Lowest tier — resources, announcements, limited Q&A                             |
|**Wiki-link**           |Obsidian-style `[[link]]` syntax                                                |
|**Backlinks**           |Pages that link to the current page                                             |
|**Callout**             |Styled block using `> [!note]` syntax                                           |
|**Canonical URL**       |Permanent public URL for a document                                             |
|**Entitlement**         |User’s access rights based on subscription/tier                                 |
|**Internal notes**      |Private observations about clients, never synced outside Anchored               |
|**Feedback notes**      |Shared reflections for client growth, visible in portal                         |
|**Paywall interstitial**|Page shown when accessing gated content without authorization                   |
|**RLS**                 |Row Level Security — PostgreSQL feature restricting data access by user         |
|**FTS**                 |Full-Text Search — PostgreSQL feature for searching document content            |
|**ULID**                |Universally Unique Lexicographically Sortable Identifier — used for document IDs|
|**Nightly Export**      |Scheduled Git backup of all Supabase content                                    |
|**Today View**          |Anchored’s home screen showing tasks, habits, and active timer                  |
|**End-of-Day Review**   |Daily ritual to clear inbox and review completed tasks                          |

-----

## 20. IMPLEMENTATION SPECIFICATIONS

> **⚠️ CLAUDE CODE ATTENTION REQUIRED**
> 
> This section contains critical implementation details that must be resolved during development. Each specification is flagged with its relevant phase(s). When implementing any phase, review all specifications tagged with that phase number.

### 20.1 Clients Model

**Relevant Phases:** 3, 5, 8

**Problem:** Multiple tables reference `client_id` but no explicit client model exists.

**Specification:**

Clients are users with Voyagers-tier entitlements. There is no separate `clients` table. A user becomes a “client” when they have an active entitlement with tier ∈ {group, community, armory}.

```sql
-- No separate clients table. Use this view for client queries:
CREATE VIEW clients AS
SELECT DISTINCT u.id, u.email, u.raw_user_meta_data, e.tier
FROM auth.users u
JOIN entitlements e ON e.user_id = u.id
WHERE e.active = true
AND e.tier IN ('group', 'community', 'armory')
AND (e.expires_at IS NULL OR e.expires_at > now());
```

**Implementation Notes:**

- When querying “all clients,” use the view or equivalent join
- `client_id` foreign keys reference `auth.users.id`, not a separate table
- Client-specific features (internal notes, feedback, sessions) are gated by checking entitlements
- A user can be both a `members` subscriber AND a Voyagers client simultaneously

-----

### 20.2 Document Versions Table

**Relevant Phases:** 1, 2, 8

**Problem:** Referenced in Section 3.4 but no schema provided.

**Specification:**

```sql
document_versions
  - id: uuid (primary key, default gen_random_uuid())
  - document_id: text (references documents.id, NOT NULL)
  - version_number: integer (NOT NULL, auto-increment per document)
  - title: text (NOT NULL)
  - body_md: text (NOT NULL)
  - frontmatter: jsonb (NOT NULL, complete frontmatter snapshot)
  - change_summary: text (nullable, optional description of changes)
  - created_by: uuid (references auth.users, NOT NULL)
  - created_at: timestamptz (default now())

-- Indexes
CREATE INDEX idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX idx_document_versions_created_at ON document_versions(created_at DESC);

-- Unique constraint for version numbers per document
CREATE UNIQUE INDEX idx_document_versions_unique ON document_versions(document_id, version_number);
```

**Trigger Conditions:**

- Version created on every save in Anchored (parallel write includes version snapshot)
- Version number auto-increments per document
- Never deleted (append-only)

**Retention Policy:**

- Keep all versions indefinitely
- Future: Add archival policy if storage becomes concern (compress versions older than 1 year)

**Implementation Notes:**

- Git remains the authoritative version history
- Supabase versions are for quick access/comparison without Git operations
- Version diff UI can compare any two versions

-----

### 20.3 Comments Table

**Relevant Phases:** 6

**Problem:** Section 12 describes comments but no schema exists.

**Specification:**

```sql
comments
  - id: uuid (primary key, default gen_random_uuid())
  - canonical_url: text (NOT NULL, e.g., "/library/emotional-mastery")
  - user_id: uuid (references auth.users, NOT NULL)
  - parent_id: uuid (nullable, references comments.id for threading)
  - body_md: text (NOT NULL)
  - status: text (NOT NULL, default 'pending')
    -- Values: pending | approved | rejected | spam
  - moderation_note: text (nullable, internal note for rejection reason)
  - moderated_by: uuid (nullable, references auth.users)
  - moderated_at: timestamptz (nullable)
  - created_at: timestamptz (default now())
  - updated_at: timestamptz (default now())

-- Indexes
CREATE INDEX idx_comments_canonical_url ON comments(canonical_url);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_status ON comments(status);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
```

**Display Rules:**

- `dwaynemcyrus.com` (public): Display only `status = 'approved'` comments (read-only)
- `app.dwaynemcyrus.com`: Members can post (creates with `status = 'pending'`)
- Owner sees all comments; can approve/reject via moderation interface

**Implementation Notes:**

- Comments keyed by `canonical_url` so they persist across domain surfaces
- Threading supported via `parent_id` (one level deep recommended)
- Approved comments visible on public site via build-time fetch or client-side load
- Consider: rate limiting (max 5 comments per user per hour)

-----

### 20.4 Cohorts Model

**Relevant Phases:** 5

**Problem:** Phase 5 mentions “Cohort support” but no model defined.

**Specification:**

```sql
cohorts
  - id: uuid (primary key, default gen_random_uuid())
  - name: text (NOT NULL, e.g., "Spring 2024 Armory")
  - slug: text (NOT NULL, unique, e.g., "spring-2024-armory")
  - tier: text (NOT NULL, one of: group | community | armory)
  - starts_at: date (NOT NULL)
  - ends_at: date (nullable, NULL = ongoing)
  - description: text (nullable)
  - created_at: timestamptz (default now())

cohort_members
  - id: uuid (primary key, default gen_random_uuid())
  - cohort_id: uuid (references cohorts.id, NOT NULL)
  - user_id: uuid (references auth.users, NOT NULL)
  - joined_at: timestamptz (default now())
  - left_at: timestamptz (nullable, NULL = still active)

-- Unique constraint: user can only be in one cohort per tier at a time
CREATE UNIQUE INDEX idx_cohort_members_active ON cohort_members(user_id, cohort_id) 
WHERE left_at IS NULL;
```

**Session Visibility with Cohorts:**

Update `portal_sessions` to include optional cohort scoping:

```sql
-- Add to portal_sessions:
cohort_id: uuid (nullable, references cohorts.id)
```

**Visibility Rules:**

- `cohort_id = NULL`: Session visible to all users with matching `audience` tier
- `cohort_id = X`: Session visible only to members of cohort X

**Implementation Notes:**

- Cohorts are optional; system works without them
- A user can be in multiple cohorts (different tiers, different time periods)
- Cohort membership is separate from entitlements (entitlement = billing, cohort = grouping)
- Announcements and resources can also be cohort-scoped (add `cohort_id` to those tables if needed)

-----

### 20.5 File and Media Storage

**Relevant Phases:** 1, 2, 7, 8

**Problem:** No specification for where files are stored or how they’re accessed.

**Specification:**

**Storage Locations:**

|File Type                        |Storage                          |URL Pattern                                                          |
|---------------------------------|---------------------------------|---------------------------------------------------------------------|
|Document images (hero, inline)   |Supabase Storage                 |`https://[project].supabase.co/storage/v1/object/public/media/[path]`|
|Member downloads                 |Supabase Storage (private bucket)|Signed URLs, 1-hour expiry                                           |
|Audio files                      |Supabase Storage (private bucket)|Signed URLs, 1-hour expiry                                           |
|Client uploads                   |Supabase Storage (private bucket)|`uploads/[user_id]/[filename]`                                       |
|Public site assets (logos, icons)|Git repo `/public/`              |`/assets/[path]`                                                     |

**Supabase Storage Buckets:**

```sql
-- Public bucket (no auth required)
media
  - images/
    - hero/
    - content/
    - artist/
  - downloads/
    - public/

-- Private bucket (auth required, signed URLs)
private
  - downloads/
    - members/
    - patron/
  - audio/
  - uploads/
    - [user_id]/
```

**Upload Workflow (Client Uploads):**

1. Client initiates upload in Portal
2. App generates signed upload URL (Supabase Storage)
3. Client uploads directly to Supabase
4. On success, create record in `portal_uploads` table:

```sql
portal_uploads
  - id: uuid (primary key)
  - user_id: uuid (references auth.users, NOT NULL)
  - filename: text (NOT NULL)
  - storage_path: text (NOT NULL)
  - file_size: integer (bytes)
  - mime_type: text
  - description: text (nullable, client-provided)
  - reviewed: boolean (default false)
  - reviewed_at: timestamptz (nullable)
  - created_at: timestamptz (default now())
```

**Frontmatter Asset References:**

```yaml
hero: /images/hero/emotional-mastery.jpg
# Resolves to: https://[project].supabase.co/storage/v1/object/public/media/images/hero/emotional-mastery.jpg
```

**Implementation Notes:**

- Use Supabase Storage transforms for image resizing (thumbnails, responsive)
- Set appropriate cache headers (public assets: 1 year, private: no-cache)
- Git LFS not used; all binary assets in Supabase Storage
- Public-mirror export copies asset references, not files (Astro fetches from Supabase at build)

-----

### 20.6 Newsletter Integration

**Relevant Phases:** 4, 6

**Problem:** Newsletter subscribe exists in sitemap but no integration specified.

**Specification:**

**Recommended Provider:** Buttondown (simple, developer-friendly, supports paid tiers)

**Integration Model:**

```sql
-- No local subscriber table. Buttondown is source of truth for newsletter.
-- Store only the mapping for platform users who are also subscribers:

newsletter_subscriptions
  - id: uuid (primary key)
  - user_id: uuid (nullable, references auth.users)
  - email: text (NOT NULL, unique)
  - buttondown_id: text (NOT NULL, Buttondown subscriber ID)
  - subscribed_at: timestamptz
  - unsubscribed_at: timestamptz (nullable)
  - created_at: timestamptz (default now())
```

**Sync Behavior:**

- When user signs up on platform, option to subscribe to newsletter
- If yes, create Buttondown subscriber via API, store mapping
- Buttondown webhooks update `unsubscribed_at` if they unsubscribe
- Newsletter archive pages fetch from Buttondown API or are statically generated

**Public Site (`/newsletter/subscribe`):**

- Embed Buttondown form or custom form that POSTs to Buttondown
- No auth required

**Implementation Notes:**

- Newsletter subscribers ≠ platform members (separate lists)
- Paid newsletter tiers (if any) are separate from Voyagers/membership
- Consider: auto-subscribe new members to newsletter (with opt-out)

-----

### 20.7 Private Database Specification

**Relevant Phases:** 8, 9

**Problem:** “Private DB” referenced but location/implementation unclear.

**Specification:**

**Decision: Same Supabase instance with strict RLS.**

There is no separate database. All “private” data (journals, OKRs, habits, reviews, internal notes) lives in the same Supabase project with Row Level Security policies that restrict access to owner only.

**Private Tables (owner-only access):**

```sql
-- Journals
journals
  - id: uuid (primary key)
  - owner_id: uuid (references auth.users, NOT NULL)
  - entry_type: text (NOT NULL, 'daily' | 'weekly')
  - entry_date: date (NOT NULL)
  - body_md: text (NOT NULL)
  - metadata: jsonb (nullable)
  - created_at: timestamptz
  - updated_at: timestamptz

-- OKRs
okr_periods
  - id: uuid (primary key)
  - owner_id: uuid (NOT NULL)
  - period_type: text ('quarterly' | 'annual')
  - period_label: text (e.g., '2024-Q1', '2024')
  - starts_at: date
  - ends_at: date
  - reflection_md: text (nullable, end-of-period reflection)
  - created_at: timestamptz

okr_objectives
  - id: uuid (primary key)
  - period_id: uuid (references okr_periods.id)
  - owner_id: uuid (NOT NULL)
  - title: text (NOT NULL)
  - description: text (nullable)
  - sort_order: integer
  - created_at: timestamptz

okr_key_results
  - id: uuid (primary key)
  - objective_id: uuid (references okr_objectives.id)
  - owner_id: uuid (NOT NULL)
  - title: text (NOT NULL)
  - target_value: numeric (nullable)
  - current_value: numeric (nullable)
  - unit: text (nullable, e.g., '%', 'count', '$')
  - sort_order: integer
  - created_at: timestamptz
  - updated_at: timestamptz

-- Habits
habits
  - id: uuid (primary key)
  - owner_id: uuid (NOT NULL)
  - title: text (NOT NULL)
  - description: text (nullable)
  - frequency: text ('daily' | 'weekly' | 'custom')
  - frequency_config: jsonb (nullable, for custom frequencies)
  - active: boolean (default true)
  - archived_at: timestamptz (nullable)
  - created_at: timestamptz

habit_entries
  - id: uuid (primary key)
  - habit_id: uuid (references habits.id)
  - owner_id: uuid (NOT NULL)
  - entry_date: date (NOT NULL)
  - completed: boolean (NOT NULL)
  - notes: text (nullable)
  - created_at: timestamptz

-- Reviews
reviews
  - id: uuid (primary key)
  - owner_id: uuid (NOT NULL)
  - review_type: text ('weekly' | 'monthly' | 'quarterly' | 'annual')
  - period_label: text (e.g., '2024-W03', '2024-01', '2024-Q1', '2024')
  - body_md: text (NOT NULL)
  - metadata: jsonb (nullable)
  - created_at: timestamptz
  - updated_at: timestamptz
```

**RLS Policies (applied to all private tables):**

```sql
-- Example for journals table (apply same pattern to all private tables)
ALTER TABLE journals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can CRUD own journals"
ON journals
FOR ALL
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());
```

**Encryption:**

- Supabase encrypts data at rest by default
- For additional security on `internal_notes.body_md`, consider application-level encryption (encrypt before insert, decrypt after select)
- Key management: Store encryption key in environment variable, not in database

**Implementation Notes:**

- All private tables include `owner_id` for RLS
- No API endpoints expose private data to other users
- Anchored UI is the only interface for private data
- Future multi-user: Each user gets their own isolated data via RLS

-----

### 20.8 Git Recovery Procedure

**Relevant Phases:** 1, 11

**Problem:** “Git is recovery” stated but no procedure defined.

**Specification:**

**What Git Contains (recoverable):**

- All markdown documents with frontmatter
- Document structure and relationships
- Version history (commits)
- Public-mirror export

**What Git Does NOT Contain (not recoverable from Git):**

- User accounts and auth data
- Entitlements and billing history
- Internal notes
- Feedback notes (unless promoted)
- Q&A questions and responses (unless promoted)
- Portal uploads
- Comments
- Journals, OKRs, habits, reviews
- Session metadata (dates, recordings, visibility flags)

**Recovery Script Specification:**

```bash
# Location: scripts/recover-from-git.sh
# Purpose: Rebuild Supabase documents table from Git vault

#!/bin/bash
# Usage: ./recover-from-git.sh <vault-path> <supabase-url> <supabase-key>

# 1. Clone or pull latest vault
# 2. Parse all .md files, extract frontmatter
# 3. For each document:
#    - Upsert to documents table (id from frontmatter is primary key)
#    - body_md = file content after frontmatter
#    - vault_path = relative path in repo
# 4. Log any documents in Supabase not in Git (orphans)
# 5. Generate report of recovered documents
```

**Recovery Procedure:**

1. **Assess damage:** Determine what Supabase data is corrupted/lost
2. **Export current state:** `pg_dump` of affected tables (if any data salvageable)
3. **Run recovery script:** Rebuilds `documents` table from Git
4. **Rebuild derived tables:**
- `portal_announcements`: Re-parse from `vault/mentorship/announcements/`
- `portal_resources`: Re-parse from `vault/mentorship/resources/`
- `portal_sessions`: Manual reconstruction needed (metadata not in Git)
1. **Verify:** Compare document counts, spot-check content
2. **Notify:** Inform users if any data was lost

**Data Loss Acceptance:**

- Operational data (Q&A, feedback notes, comments) may be lost if not promoted
- This is acceptable tradeoff for architecture simplicity
- Users should be informed: “Promote valuable content to preserve it permanently”

**Implementation Notes:**

- Recovery script should be tested quarterly
- Consider: nightly Supabase backup to separate storage (belt and suspenders)

-----

### 20.9 Public-Mirror Export Script

**Relevant Phases:** 1

**Problem:** Export criteria defined but not implementation.

**Specification:**

**Script Location:** `scripts/export-public-mirror.ts` (TypeScript, runs via `ts-node` or compiled)

**Trigger Mechanism:**

- **Primary:** Manual trigger from Anchored UI (`/sync/publish` button)
- **Secondary:** GitHub Action on vault push (optional, can be disabled)
- **Not automatic:** Parallel write does NOT trigger export (intentional separation)

**Script Behavior:**

```typescript
// Pseudocode for export-public-mirror.ts

interface ExportConfig {
  vaultPath: string;           // Local path to vault repo
  mirrorPath: string;          // Local path to public-mirror repo
  allowedCanonicalPrefixes: string[];  // ['/engineer', '/mentor', '/artist', '/labs', '/library', '/newsletter', '/linked', '/press', '/pages']
}

async function exportPublicMirror(config: ExportConfig) {
  // 1. Read all .md files from vault
  const documents = await parseVault(config.vaultPath);
  
  // 2. Filter for exportable documents
  const exportable = documents.filter(doc => 
    doc.frontmatter.visibility === 'public' &&
    doc.frontmatter.status === 'published' &&
    doc.frontmatter.canonical &&
    config.allowedCanonicalPrefixes.some(p => doc.frontmatter.canonical.startsWith(p))
  );
  
  // 3. Clear mirror directory (except .git)
  await clearMirrorDirectory(config.mirrorPath);
  
  // 4. Write each document to mirror, preserving structure
  for (const doc of exportable) {
    const mirrorPath = pathFromCanonical(doc.frontmatter.canonical);
    await writeDocument(config.mirrorPath, mirrorPath, doc);
  }
  
  // 5. Generate index files (_index/documents.json, _index/tags.json)
  await generateIndexes(config.mirrorPath, exportable);
  
  // 6. Copy referenced assets (images) — or just reference Supabase URLs
  // Decision: Reference Supabase URLs, don't copy files
  
  // 7. Commit and push mirror repo
  await gitCommitAndPush(config.mirrorPath, `Export: ${new Date().toISOString()}`);
  
  // 8. Return summary
  return {
    exported: exportable.length,
    skipped: documents.length - exportable.length,
    timestamp: new Date().toISOString()
  };
}
```

**Canonical Path → Mirror Path Mapping:**

|Canonical                |Mirror Path                     |
|-------------------------|--------------------------------|
|`/library/principles/foo`|`library/principles/foo.md`     |
|`/engineer/projects/bar` |`engineer/projects/bar/index.md`|
|`/now`                   |`pages/now.md`                  |

**Implementation Notes:**

- Export is full, not incremental (simpler, mirror is small)
- Run takes <30 seconds for typical vault size
- Mirror repo triggers Vercel deploy via GitHub webhook
- Sync status tracked in Supabase for UI display:

```sql
sync_log
  - id: uuid
  - sync_type: text ('public-mirror' | 'supabase')
  - status: text ('started' | 'completed' | 'failed')
  - documents_exported: integer (nullable)
  - error_message: text (nullable)
  - started_at: timestamptz
  - completed_at: timestamptz (nullable)
```

-----

### 20.10 Realtime Subscription Patterns

**Relevant Phases:** 2, 5

**Problem:** Realtime mentioned but no subscription architecture defined.

**Specification:**

**Tables with Realtime Enabled:**

|Table                 |Realtime|Reason                              |
|----------------------|--------|------------------------------------|
|`documents`           |Yes     |CMS UI updates                      |
|`portal_sessions`     |Yes     |Session updates visible immediately |
|`portal_announcements`|Yes     |New announcements appear instantly  |
|`portal_questions`    |Yes     |Owner sees new questions            |
|`portal_responses`    |Yes     |Client sees answers                 |
|`feedback_notes`      |Yes     |Client sees new feedback            |
|`comments`            |No      |Not time-critical, poll on page load|
|`entitlements`        |No      |Checked on auth, not real-time      |
|Private tables        |No      |Single user, no real-time need      |

**Channel Structure:**

```typescript
// Portal client subscriptions (app.dwaynemcyrus.com)

// 1. User-specific channel (for client's own data)
const userChannel = supabase
  .channel(`user:${userId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'feedback_notes',
    filter: `client_id=eq.${userId}`
  }, handleFeedbackUpdate)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'portal_responses',
    filter: `question_id=in.(${userQuestionIds.join(',')})`
  }, handleResponseUpdate)
  .subscribe();

// 2. Tier-based channel (for announcements, resources)
const tierChannel = supabase
  .channel(`tier:${userTier}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'portal_announcements',
    filter: `audience=in.(${userTier},all)`
  }, handleAnnouncementUpdate)
  .subscribe();

// 3. Owner channel (Anchored, sees everything)
const ownerChannel = supabase
  .channel('owner')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'portal_questions'
  }, handleNewQuestion)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'documents'
  }, handleDocumentUpdate)
  .subscribe();
```

**Implementation Notes:**

- Enable Realtime per-table in Supabase dashboard
- Use filters to minimize payload (don’t send all changes to all clients)
- Unsubscribe on component unmount to prevent memory leaks
- Fallback: If Realtime connection drops, poll every 30 seconds

-----

### 20.11 Row Level Security Policies

**Relevant Phases:** 3, 5

**Problem:** No RLS policies defined, critical for security.

**Specification:**

**Owner Detection:**

```sql
-- Helper function to check if current user is owner
CREATE OR REPLACE FUNCTION is_owner()
RETURNS boolean AS $$
BEGIN
  RETURN auth.jwt() ->> 'email' = 'dwayne@dwaynemcyrus.com';  -- Replace with actual email
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**RLS Policies by Table:**

```sql
-- DOCUMENTS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Anyone can read public documents
CREATE POLICY "Public documents are readable by all"
ON documents FOR SELECT
USING (visibility = 'public' AND status = 'published');

-- Owner can do everything
CREATE POLICY "Owner has full access to documents"
ON documents FOR ALL
USING (is_owner())
WITH CHECK (is_owner());

-- Members can read gated content based on entitlements
CREATE POLICY "Members can read entitled content"
ON documents FOR SELECT
USING (
  visibility != 'private' 
  AND (
    visibility = 'public'
    OR EXISTS (
      SELECT 1 FROM entitlements e
      WHERE e.user_id = auth.uid()
      AND e.active = true
      AND (e.expires_at IS NULL OR e.expires_at > now())
      AND (
        e.tier = documents.visibility
        OR (e.tier = 'patron' AND documents.visibility IN ('members', 'patron'))
        OR (e.tier = 'armory' AND documents.visibility IN ('voyagers', 'group', 'community', 'armory'))
        OR (e.tier = 'community' AND documents.visibility IN ('voyagers', 'group', 'community'))
        OR (e.tier = 'group' AND documents.visibility IN ('voyagers', 'group'))
      )
    )
  )
);

-- ENTITLEMENTS
ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own entitlements"
ON entitlements FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Owner has full access to entitlements"
ON entitlements FOR ALL
USING (is_owner())
WITH CHECK (is_owner());

-- INTERNAL_NOTES
ALTER TABLE internal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only owner can access internal notes"
ON internal_notes FOR ALL
USING (is_owner())
WITH CHECK (is_owner());

-- FEEDBACK_NOTES
ALTER TABLE feedback_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can read their own feedback"
ON feedback_notes FOR SELECT
USING (client_id = auth.uid());

CREATE POLICY "Owner has full access to feedback notes"
ON feedback_notes FOR ALL
USING (is_owner())
WITH CHECK (is_owner());

-- PORTAL_SESSIONS
ALTER TABLE portal_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can read their sessions"
ON portal_sessions FOR SELECT
USING (
  -- 1v1 session for this client
  client_id = auth.uid()
  OR
  -- Group session matching their tier
  (client_id IS NULL AND EXISTS (
    SELECT 1 FROM entitlements e
    WHERE e.user_id = auth.uid()
    AND e.active = true
    AND e.tier = portal_sessions.audience
  ))
);

CREATE POLICY "Owner has full access to sessions"
ON portal_sessions FOR ALL
USING (is_owner())
WITH CHECK (is_owner());

-- PORTAL_QUESTIONS
ALTER TABLE portal_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read and create own questions"
ON portal_questions FOR SELECT
USING (user_id = auth.uid() OR is_owner());

CREATE POLICY "Users can insert own questions"
ON portal_questions FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owner has full access to questions"
ON portal_questions FOR ALL
USING (is_owner())
WITH CHECK (is_owner());

-- PORTAL_RESPONSES
ALTER TABLE portal_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read responses to their questions"
ON portal_responses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM portal_questions q
    WHERE q.id = portal_responses.question_id
    AND q.user_id = auth.uid()
  )
  OR is_owner()
);

CREATE POLICY "Owner can create responses"
ON portal_responses FOR INSERT
WITH CHECK (is_owner());

-- COMMENTS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read approved comments"
ON comments FOR SELECT
USING (status = 'approved' OR user_id = auth.uid() OR is_owner());

CREATE POLICY "Authenticated users can create comments"
ON comments FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Owner can moderate comments"
ON comments FOR UPDATE
USING (is_owner())
WITH CHECK (is_owner());
```

**Implementation Notes:**

- Test RLS policies thoroughly before production
- Use `auth.uid()` for current user ID
- `is_owner()` function should use email or a dedicated `is_admin` flag in user metadata
- Consider: audit log for owner actions on sensitive data

-----

### 20.12 Session ID Strategy

**Relevant Phases:** 5, 8

**Problem:** Document IDs are ULIDs, session IDs are UUIDs. Vault paths use dates. Unclear how these relate.

**Specification:**

**Decision: Sessions use UUIDs (not ULIDs).**

Rationale:

- Sessions are operational records, not canonical content
- Session metadata (times, recordings, visibility) changes frequently
- UUIDs are native to Supabase/PostgreSQL, simpler for operational data
- Session content (prep.md, summary.md) lives in vault with ULIDs if promoted

**ID to Vault Path Mapping:**

```sql
-- portal_sessions.vault_path stores the path
-- Example: "mentorship/sessions/2024-01-15-armory-emotional-regulation"

-- The session UUID is the primary key for DB operations
-- The vault_path is the link to Git content
```

**URL Patterns:**

|Context                   |URL                                     |ID Used   |
|--------------------------|----------------------------------------|----------|
|Portal session view       |`/portal/sessions/[uuid]`               |UUID      |
|Anchored session workspace|`/sessions/[uuid]`                      |UUID      |
|Vault browsing            |`/vault/mentorship/sessions/[date-slug]`|Path-based|

**Implementation Notes:**

- Session creation generates both UUID (for DB) and vault_path (for Git)
- Vault path format: `mentorship/sessions/[YYYY-MM-DD]-[type]-[slug]`
- If session prep/summary promoted to standalone doc, that doc gets its own ULID
- Session lookup: by UUID in portal, by path in vault browser

-----

### 20.13 Search Implementation

**Relevant Phases:** 2, 8

**Problem:** Search mentioned in sitemap but no implementation specified.

**Specification:**

**Decision: PostgreSQL Full-Text Search (FTS) for MVP, Meilisearch for future.**

**Phase 1-8 Implementation (PostgreSQL FTS):**

```sql
-- Add search vector column to documents
ALTER TABLE documents ADD COLUMN search_vector tsvector;

-- Create index
CREATE INDEX idx_documents_search ON documents USING GIN(search_vector);

-- Update trigger
CREATE OR REPLACE FUNCTION documents_search_trigger()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.body_md, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.metadata->>'tags', '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_search_update
BEFORE INSERT OR UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION documents_search_trigger();

-- Search function
CREATE OR REPLACE FUNCTION search_documents(query text, user_id uuid DEFAULT NULL)
RETURNS TABLE (
  id text,
  title text,
  canonical text,
  visibility text,
  rank real
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.title,
    d.canonical,
    d.visibility,
    ts_rank(d.search_vector, websearch_to_tsquery('english', query)) as rank
  FROM documents d
  WHERE d.search_vector @@ websearch_to_tsquery('english', query)
  AND d.status = 'published'
  -- RLS handles visibility filtering
  ORDER BY rank DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Search Scope by Surface:**

|Surface             |Searches                          |Notes                              |
|--------------------|----------------------------------|-----------------------------------|
|dwaynemcyrus.com    |Public documents only             |Build-time index or client-side FTS|
|app.dwaynemcyrus.com|All entitled documents            |Server-side FTS via Supabase       |
|getanchored.app     |All vault documents + private data|Server-side FTS                    |

**Future (Meilisearch):**

- Migrate when search volume or complexity justifies
- Better typo tolerance, faceting, instant search
- Self-hosted or Meilisearch Cloud
- Sync via Supabase webhook → Meilisearch indexer

**Implementation Notes:**

- PostgreSQL FTS is sufficient for <10k documents
- Search API endpoint: `/api/search?q=query`
- Include snippets in results (use `ts_headline`)
- Consider: search analytics (what people search for)

-----

### 20.14 Parallel Write Error Handling

**Relevant Phases:** 1, 2, 8

**Problem:** No specification for handling partial failures in parallel write.

**Specification:**

**Error States and Handling:**

|Git Result|Supabase Result|Action                                     |
|----------|---------------|-------------------------------------------|
|✓ Success |✓ Success      |Normal completion                          |
|✓ Success |✗ Failure      |Retry Supabase 3x, then queue for later    |
|✗ Failure |✓ Success      |Rollback Supabase, retry Git, alert user   |
|✗ Failure |✗ Failure      |Alert user, save to local storage as backup|

**Implementation:**

```typescript
// Pseudocode for parallel write with error handling

interface WriteResult {
  git: { success: boolean; commitSha?: string; error?: string };
  supabase: { success: boolean; error?: string };
  status: 'complete' | 'partial' | 'failed';
}

async function parallelWrite(document: Document): Promise<WriteResult> {
  const results: WriteResult = {
    git: { success: false },
    supabase: { success: false },
    status: 'failed'
  };
  
  // Execute in parallel
  const [gitResult, supabaseResult] = await Promise.allSettled([
    writeToGit(document),
    writeToSupabase(document)
  ]);
  
  // Process Git result
  if (gitResult.status === 'fulfilled') {
    results.git = { success: true, commitSha: gitResult.value.sha };
  } else {
    results.git = { success: false, error: gitResult.reason.message };
  }
  
  // Process Supabase result
  if (supabaseResult.status === 'fulfilled') {
    results.supabase = { success: true };
  } else {
    results.supabase = { success: false, error: supabaseResult.reason.message };
  }
  
  // Determine overall status and handle failures
  if (results.git.success && results.supabase.success) {
    results.status = 'complete';
  } else if (results.git.success && !results.supabase.success) {
    // Git succeeded, Supabase failed — queue retry
    await queueSupabaseRetry(document.id, results.git.commitSha);
    results.status = 'partial';
  } else if (!results.git.success && results.supabase.success) {
    // Supabase succeeded, Git failed — rollback and retry
    await rollbackSupabase(document.id);
    results.status = 'failed';
  } else {
    // Both failed
    await saveToLocalBackup(document);
    results.status = 'failed';
  }
  
  return results;
}
```

**Retry Queue Table:**

```sql
write_retry_queue
  - id: uuid (primary key)
  - document_id: text (NOT NULL)
  - target: text ('git' | 'supabase')
  - payload: jsonb (document data)
  - attempts: integer (default 0)
  - last_attempt_at: timestamptz
  - last_error: text
  - status: text ('pending' | 'processing' | 'completed' | 'failed')
  - created_at: timestamptz
```

**Retry Worker:**

- Runs every 5 minutes
- Processes pending items, max 3 attempts
- After 3 failures, marks as ‘failed’ and alerts owner

**User Feedback:**

- Show save status indicator in UI (green checkmark, yellow warning, red error)
- If partial failure: “Saved locally, syncing in background…”
- If full failure: “Unable to save. Your work is backed up locally.”

**Implementation Notes:**

- Local backup uses IndexedDB in browser
- Recovery UI: “You have unsaved changes from [date]. [Retry] [Discard]”
- Log all failures for debugging

-----

### 20.15 Stripe Webhook Events

**Relevant Phases:** 6, 9

**Problem:** Stripe integration mentioned but no event handling specified.

**Specification:**

**Webhook Endpoint:** `app.dwaynemcyrus.com/api/webhooks/stripe`

**Events to Handle:**

|Event                                 |Action                                       |
|--------------------------------------|---------------------------------------------|
|`checkout.session.completed`          |Create/update entitlement, send welcome email|
|`customer.subscription.created`       |Create entitlement record                    |
|`customer.subscription.updated`       |Update tier if changed, update expiry        |
|`customer.subscription.deleted`       |Mark entitlement inactive                    |
|`invoice.paid`                        |Extend entitlement expiry                    |
|`invoice.payment_failed`              |Send payment failure notification            |
|`customer.subscription.trial_will_end`|Send trial ending reminder (if using trials) |

**Webhook Handler Pseudocode:**

```typescript
// /api/webhooks/stripe.ts

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return new Response('Webhook signature verification failed', { status: 400 });
  }
  
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutComplete(event.data.object);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdate(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionCanceled(event.data.object);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
    // ... other handlers
  }
  
  return new Response('OK', { status: 200 });
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string;
  const userId = session.client_reference_id; // Set during checkout creation
  const tier = session.metadata.tier; // Set during checkout creation
  
  // Create or update stripe_customers mapping
  await supabase.from('stripe_customers').upsert({
    user_id: userId,
    stripe_customer_id: customerId
  });
  
  // Create entitlement
  await supabase.from('entitlements').insert({
    user_id: userId,
    tier: tier,
    active: true,
    expires_at: null // Subscription-based, no fixed expiry
  });
  
  // TODO: Send welcome email
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  
  // Find user by Stripe customer ID
  const { data: customer } = await supabase
    .from('stripe_customers')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();
  
  if (customer) {
    // Mark entitlement inactive
    await supabase
      .from('entitlements')
      .update({ active: false })
      .eq('user_id', customer.user_id);
  }
}
```

**Stripe Product/Price Mapping:**

```sql
-- Store mapping between Stripe products and platform tiers
stripe_products
  - id: uuid (primary key)
  - stripe_product_id: text (NOT NULL, unique)
  - stripe_price_id: text (NOT NULL)
  - tier: text (NOT NULL, 'members' | 'patron' | 'group' | 'community' | 'armory')
  - billing_interval: text ('month' | 'year')
  - price_cents: integer
  - active: boolean (default true)
  - created_at: timestamptz
```

**Implementation Notes:**

- Always verify webhook signatures
- Use Stripe CLI for local testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- Log all webhook events for debugging
- Idempotency: Check if entitlement already exists before creating
- Consider: grace period for failed payments (don’t revoke access immediately)

-----

### 20.16 Personal Operations: Areas, Projects, Tasks

**Relevant Phases:** 1, 2, 3

**Problem:** Task management hierarchy needed for personal productivity.

**Specification:**

**Hierarchy Model:**

```
Areas (stable life categories)
  └── Projects (time-bounded outcomes)
       └── Tasks (actionable items)
            └── Time Entries (pomodoros, stopwatch, activity)
```

**Schema:**

```sql
-- Areas (stable life categories, rarely change)
areas
  - id: uuid (primary key, default gen_random_uuid())
  - owner_id: uuid (references auth.users, NOT NULL)
  - title: text (NOT NULL)
  - description: text (nullable)
  - icon: text (nullable, emoji or icon name)
  - color: text (nullable, hex color for UI)
  - sort_order: integer (default 0)
  - archived: boolean (default false)
  - created_at: timestamptz (default now())
  - updated_at: timestamptz (default now())

-- Default areas to seed:
-- Personal, Work, Health, Learning, Creative, Relationships, Finance, Admin

-- Projects (time-bounded, have outcomes)
projects
  - id: uuid (primary key, default gen_random_uuid())
  - owner_id: uuid (references auth.users, NOT NULL)
  - area_id: uuid (nullable, references areas.id)
  - title: text (NOT NULL)
  - description: text (nullable)
  - status: text (NOT NULL, default 'active')
    -- Values: 'active' | 'completed' | 'on_hold' | 'someday' | 'archived'
  - due_date: date (nullable)
  - completed_at: timestamptz (nullable)
  - sort_order: integer (default 0)
  - tags: text[] (default '{}')
  - created_at: timestamptz (default now())
  - updated_at: timestamptz (default now())

-- Tasks (actionable items)
tasks
  - id: uuid (primary key, default gen_random_uuid())
  - owner_id: uuid (references auth.users, NOT NULL)
  - project_id: uuid (nullable, references projects.id)
  - area_id: uuid (nullable, references areas.id — for tasks without project)
  - title: text (NOT NULL)
  - notes: text (nullable, markdown supported)
  - status: text (NOT NULL, default 'inbox')
    -- Values: 'inbox' | 'anytime' | 'today' | 'scheduled' | 'waiting' | 'completed' | 'cancelled'
  - priority: text (NOT NULL, default 'none')
    -- Values: 'none' | 'low' | 'medium' | 'high'
  - due_date: date (nullable)
  - due_time: time (nullable, for time-specific tasks)
  - defer_date: date (nullable, don't show until this date)
  - scheduled_date: date (nullable, when to work on it)
  - completed_at: timestamptz (nullable)
  - cancelled_at: timestamptz (nullable)
  - waiting_for: text (nullable, who/what are you waiting on)
  - energy_level: text (nullable, 'low' | 'medium' | 'high' — for energy-based filtering)
  - estimated_minutes: integer (nullable)
  - tags: text[] (default '{}')
  - sort_order: integer (default 0)
  - created_at: timestamptz (default now())
  - updated_at: timestamptz (default now())
  
  -- Source tracking (for journal integration)
  - source_type: text (nullable, 'manual' | 'journal' | 'session' | 'recurring')
  - source_id: uuid (nullable, references source record)
  - source_excerpt: text (nullable, original text that spawned this task)

-- Indexes
CREATE INDEX idx_tasks_owner_status ON tasks(owner_id, status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_tasks_scheduled_date ON tasks(scheduled_date) WHERE scheduled_date IS NOT NULL;
CREATE INDEX idx_tasks_project ON tasks(project_id) WHERE project_id IS NOT NULL;
```

**Task Status Flow:**

```
                    ┌─────────────┐
                    │    inbox    │ ← New tasks land here
                    └──────┬──────┘
                           │ organize
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
    ┌───────────┐    ┌───────────┐    ┌───────────┐
    │  anytime  │    │ scheduled │    │  waiting  │
    │ (do soon) │    │ (future)  │    │(blocked)  │
    └─────┬─────┘    └─────┬─────┘    └─────┬─────┘
          │                │                │
          │    ┌───────────┘                │
          │    │  (date arrives)            │
          ▼    ▼                            │
    ┌───────────┐                           │
    │   today   │ ←─────────────────────────┘
    │           │   (unblocked)
    └─────┬─────┘
          │ complete
          ▼
    ┌───────────┐
    │ completed │
    └───────────┘
```

-----

### 20.17 Personal Operations: Recurring Tasks

**Relevant Phases:** 1

**Problem:** Need tasks that automatically recreate on schedule.

**Specification:**

```sql
-- Recurring task templates
recurring_tasks
  - id: uuid (primary key, default gen_random_uuid())
  - owner_id: uuid (references auth.users, NOT NULL)
  - project_id: uuid (nullable, references projects.id)
  - area_id: uuid (nullable, references areas.id)
  
  -- Template fields (copied to generated tasks)
  - title: text (NOT NULL)
  - notes: text (nullable)
  - priority: text (default 'none')
  - estimated_minutes: integer (nullable)
  - tags: text[] (default '{}')
  
  -- Recurrence configuration
  - frequency: text (NOT NULL)
    -- Values: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  - interval: integer (default 1, e.g., every 2 weeks)
  - days_of_week: text[] (nullable, for weekly: ['MO', 'WE', 'FR'])
  - day_of_month: integer (nullable, for monthly: 15)
  - month_of_year: integer (nullable, for yearly: 3 = March)
  - rrule: text (nullable, iCal RRULE for complex patterns)
  
  -- Scheduling
  - start_date: date (NOT NULL, when recurrence begins)
  - end_date: date (nullable, when recurrence stops)
  - due_time: time (nullable)
  - defer_days: integer (default 0, show task N days before due)
  
  -- State
  - active: boolean (default true)
  - last_generated_at: timestamptz (nullable)
  - next_due_date: date (nullable, calculated)
  
  - created_at: timestamptz (default now())
  - updated_at: timestamptz (default now())
```

**Generation Logic:**

```typescript
// Pseudocode: Run daily (or on app load)

async function generateRecurringTasks(ownerId: string) {
  const today = new Date();
  const lookAhead = 7; // Generate tasks up to 7 days ahead
  
  const templates = await getActiveRecurringTasks(ownerId);
  
  for (const template of templates) {
    const nextDue = calculateNextDueDate(template);
    
    // Skip if next due is beyond look-ahead window
    if (nextDue > addDays(today, lookAhead)) continue;
    
    // Skip if already generated for this date
    if (await taskExistsForDate(template.id, nextDue)) continue;
    
    // Create task from template
    await createTask({
      owner_id: ownerId,
      project_id: template.project_id,
      area_id: template.area_id,
      title: template.title,
      notes: template.notes,
      priority: template.priority,
      due_date: nextDue,
      defer_date: subDays(nextDue, template.defer_days),
      status: 'scheduled',
      source_type: 'recurring',
      source_id: template.id,
      estimated_minutes: template.estimated_minutes,
      tags: template.tags
    });
    
    // Update template
    await updateRecurringTask(template.id, {
      last_generated_at: now(),
      next_due_date: calculateNextDueDate(template, nextDue)
    });
  }
}
```

**Common Patterns:**

|Pattern         |Configuration                                                  |
|----------------|---------------------------------------------------------------|
|Daily           |`frequency: 'daily', interval: 1`                              |
|Every weekday   |`frequency: 'weekly', days_of_week: ['MO','TU','WE','TH','FR']`|
|Every Friday    |`frequency: 'weekly', days_of_week: ['FR']`                    |
|1st of month    |`frequency: 'monthly', day_of_month: 1`                        |
|Every 2 weeks   |`frequency: 'weekly', interval: 2`                             |
|Quarterly review|`frequency: 'monthly', interval: 3, day_of_month: 1`           |

-----

### 20.18 Personal Operations: Time Tracking

**Relevant Phases:** 1, 3

**Problem:** Need pomodoro, stopwatch, and activity logging with reporting.

**Specification:**

**Three Modes:**

|Mode         |Attached To             |Behavior                                       |
|-------------|------------------------|-----------------------------------------------|
|**Pomodoro** |Task (required)         |Fixed duration (default 25min), break reminders|
|**Stopwatch**|Task or Project         |Variable duration, start/stop/pause            |
|**Activity** |Activity name (freeform)|Life logging, category-based                   |

**Schema:**

```sql
-- Activity categories (hybrid: preset + user-defined + autocomplete)
activity_categories
  - id: uuid (primary key, default gen_random_uuid())
  - owner_id: uuid (references auth.users, NOT NULL)
  - name: text (NOT NULL)
  - color: text (nullable, hex)
  - icon: text (nullable, emoji)
  - is_default: boolean (default false, true for system presets)
  - usage_count: integer (default 0, for autocomplete ranking)
  - sort_order: integer (default 0)
  - created_at: timestamptz (default now())

-- Default categories to seed:
-- Work, Personal, Health, Admin, Social, Learning, Creative, Rest, Commute

-- Time entries (all three modes)
time_entries
  - id: uuid (primary key, default gen_random_uuid())
  - owner_id: uuid (references auth.users, NOT NULL)
  - entry_type: text (NOT NULL)
    -- Values: 'pomodoro' | 'stopwatch' | 'activity'
  
  -- For pomodoro/stopwatch (task-attached)
  - task_id: uuid (nullable, references tasks.id)
  - project_id: uuid (nullable, references projects.id)
  
  -- For activity log (freeform)
  - activity_name: text (nullable)
  - category_id: uuid (nullable, references activity_categories.id)
  
  -- Timing
  - started_at: timestamptz (NOT NULL)
  - ended_at: timestamptz (nullable, NULL = currently running)
  - paused_at: timestamptz (nullable, for pause tracking)
  - total_paused_seconds: integer (default 0)
  - duration_seconds: integer (nullable, calculated on end)
  - target_seconds: integer (nullable, for pomodoro: default 1500)
  
  -- Status
  - status: text (NOT NULL, default 'running')
    -- Values: 'running' | 'paused' | 'completed' | 'cancelled'
  
  -- Metadata
  - notes: text (nullable)
  - created_at: timestamptz (default now())

-- Constraints
ALTER TABLE time_entries ADD CONSTRAINT time_entry_attachment_check
CHECK (
  (entry_type = 'pomodoro' AND task_id IS NOT NULL) OR
  (entry_type = 'stopwatch' AND (task_id IS NOT NULL OR project_id IS NOT NULL)) OR
  (entry_type = 'activity' AND activity_name IS NOT NULL)
);

-- Only one running entry at a time
CREATE UNIQUE INDEX idx_time_entries_one_running 
ON time_entries(owner_id) 
WHERE status = 'running';

-- Indexes
CREATE INDEX idx_time_entries_owner_date ON time_entries(owner_id, started_at);
CREATE INDEX idx_time_entries_task ON time_entries(task_id) WHERE task_id IS NOT NULL;
```

**Pomodoro Settings:**

```sql
-- User preferences for pomodoro
-- Stored in user_preferences jsonb or separate table

pomodoro_settings (part of user preferences)
  - work_duration_seconds: integer (default 1500 = 25min)
  - short_break_seconds: integer (default 300 = 5min)
  - long_break_seconds: integer (default 900 = 15min)
  - long_break_interval: integer (default 4, after every N pomodoros)
  - auto_start_breaks: boolean (default false)
  - auto_start_pomodoros: boolean (default false)
  - sound_enabled: boolean (default true)
```

**Daily Timeline View Query:**

```sql
-- Get all time entries for a specific day
SELECT 
  te.*,
  t.title as task_title,
  p.title as project_title,
  ac.name as category_name,
  ac.color as category_color
FROM time_entries te
LEFT JOIN tasks t ON te.task_id = t.id
LEFT JOIN projects p ON te.project_id = p.id OR t.project_id = p.id
LEFT JOIN activity_categories ac ON te.category_id = ac.id
WHERE te.owner_id = :owner_id
AND te.started_at >= :day_start
AND te.started_at < :day_end
ORDER BY te.started_at ASC;
```

**Autocomplete for Activity Categories:**

```typescript
// When user types activity name, suggest categories
async function suggestCategory(activityName: string, ownerId: string) {
  // 1. Check if exact activity name was used before
  const previousEntry = await db.query(`
    SELECT category_id FROM time_entries 
    WHERE owner_id = $1 
    AND activity_name ILIKE $2 
    AND category_id IS NOT NULL
    ORDER BY created_at DESC LIMIT 1
  `, [ownerId, activityName]);
  
  if (previousEntry) return previousEntry.category_id;
  
  // 2. Fuzzy match on activity name
  const fuzzyMatch = await db.query(`
    SELECT category_id, COUNT(*) as cnt
    FROM time_entries
    WHERE owner_id = $1
    AND activity_name % $2  -- trigram similarity
    AND category_id IS NOT NULL
    GROUP BY category_id
    ORDER BY cnt DESC LIMIT 1
  `, [ownerId, activityName]);
  
  if (fuzzyMatch) return fuzzyMatch.category_id;
  
  // 3. Return most-used category as fallback
  return getMostUsedCategory(ownerId);
}
```

-----

### 20.19 Personal Operations: Habit + Time Integration

**Relevant Phases:** 3

**Problem:** Habits like “Write for 2 hours” need time tracking integration.

**Specification:**

**Habit Types:**

|Type         |Completion Criteria|Example                   |
|-------------|-------------------|--------------------------|
|**Check-off**|Manual toggle      |“Take vitamins”           |
|**Count**    |Reach target count |“Drink 8 glasses of water”|
|**Duration** |Accumulate time    |“Write for 2 hours”       |

**Updated Habit Schema:**

```sql
habits
  - id: uuid (primary key, default gen_random_uuid())
  - owner_id: uuid (references auth.users, NOT NULL)
  - title: text (NOT NULL)
  - description: text (nullable)
  
  -- Type configuration
  - habit_type: text (NOT NULL, default 'check')
    -- Values: 'check' | 'count' | 'duration'
  - target_count: integer (nullable, for 'count' type)
  - target_seconds: integer (nullable, for 'duration' type)
  
  -- Scheduling
  - frequency: text (NOT NULL, default 'daily')
    -- Values: 'daily' | 'weekly' | 'custom'
  - days_of_week: text[] (nullable, for weekly/custom)
  
  -- Time tracking link
  - track_time: boolean (default false)
  - linked_project_id: uuid (nullable, references projects.id)
  - linked_area_id: uuid (nullable, references areas.id)
  - auto_create_task: boolean (default false, create daily task for habit)
  
  -- State
  - active: boolean (default true)
  - archived_at: timestamptz (nullable)
  - sort_order: integer (default 0)
  
  - created_at: timestamptz (default now())
  - updated_at: timestamptz (default now())

habit_entries
  - id: uuid (primary key, default gen_random_uuid())
  - habit_id: uuid (references habits.id, NOT NULL)
  - owner_id: uuid (references auth.users, NOT NULL)
  - entry_date: date (NOT NULL)
  
  -- Completion data
  - completed: boolean (NOT NULL, default false)
  - count_value: integer (nullable, for 'count' type)
  - duration_seconds: integer (nullable, for 'duration' type, auto-summed from time entries)
  
  -- Manual override
  - manually_completed: boolean (default false, user marked complete despite not hitting target)
  
  - notes: text (nullable)
  - created_at: timestamptz (default now())
  - updated_at: timestamptz (default now())

-- Unique constraint: one entry per habit per day
CREATE UNIQUE INDEX idx_habit_entries_unique ON habit_entries(habit_id, entry_date);
```

**Duration Habit Auto-Completion:**

```typescript
// When time entry ends, check if it completes a duration habit

async function onTimeEntryComplete(entry: TimeEntry) {
  if (!entry.task_id && !entry.project_id) return;
  
  // Find duration habits linked to this project/area
  const habits = await getDurationHabitsForEntry(entry);
  
  for (const habit of habits) {
    // Sum today's time for this habit
    const todayTotal = await sumTodayTimeForHabit(habit.id, entry.owner_id);
    
    // Update or create habit entry
    await upsertHabitEntry({
      habit_id: habit.id,
      owner_id: entry.owner_id,
      entry_date: today(),
      duration_seconds: todayTotal,
      completed: todayTotal >= habit.target_seconds
    });
  }
}
```

**Example Workflow:**

1. Create habit: “Write for 2 hours” (`habit_type: 'duration'`, `target_seconds: 7200`)
2. Link to project: “Novel Draft” or area: “Creative”
3. Start pomodoro on task in “Novel Draft” project
4. Complete 4 pomodoros (100 minutes)
5. System auto-sums: 6000 seconds logged
6. Habit shows: 1h 40m / 2h (83%)
7. One more pomodoro → habit auto-completes

-----

### 20.20 Personal Operations: Journal ↔ Task Sync

**Relevant Phases:** 2

**Problem:** Tasks in journals should sync bidirectionally with task system.

**Specification:**

**Detection: Explicit Syntax**

```markdown
Journal entry content...

- [ ] Follow up with Marcus about breathing exercises
- [ ] Review OKR progress
- [x] Send invoice to client

More journal content...
```

**Schema Addition:**

```sql
-- Track journal-task relationships
journal_task_links
  - id: uuid (primary key)
  - journal_id: uuid (references journals.id, NOT NULL)
  - task_id: uuid (references tasks.id, NOT NULL)
  - markdown_line: integer (line number in journal)
  - original_text: text (the checkbox line as written)
  - created_at: timestamptz (default now())

CREATE UNIQUE INDEX idx_journal_task_unique ON journal_task_links(journal_id, task_id);
```

**Parse on Save:**

```typescript
// When journal is saved

async function syncJournalTasks(journal: Journal) {
  const lines = journal.body_md.split('\n');
  const taskPattern = /^- \[([ x])\] (.+)$/;
  
  const foundTasks: ParsedTask[] = [];
  
  lines.forEach((line, index) => {
    const match = line.match(taskPattern);
    if (match) {
      foundTasks.push({
        lineNumber: index + 1,
        completed: match[1] === 'x',
        title: match[2].trim(),
        originalText: line
      });
    }
  });
  
  // Get existing linked tasks
  const existingLinks = await getJournalTaskLinks(journal.id);
  
  for (const parsed of foundTasks) {
    const existingLink = existingLinks.find(l => l.markdown_line === parsed.lineNumber);
    
    if (existingLink) {
      // Update existing task status
      await updateTaskStatus(existingLink.task_id, parsed.completed);
    } else {
      // New checkbox — prompt user or auto-create
      if (shouldAutoCreate(parsed)) {
        const task = await createTask({
          owner_id: journal.owner_id,
          title: parsed.title,
          status: parsed.completed ? 'completed' : 'today',
          due_date: journal.entry_date,
          source_type: 'journal',
          source_id: journal.id,
          source_excerpt: parsed.originalText
        });
        
        await createJournalTaskLink({
          journal_id: journal.id,
          task_id: task.id,
          markdown_line: parsed.lineNumber,
          original_text: parsed.originalText
        });
      }
    }
  }
}
```

**Reverse Sync (Task → Journal):**

```typescript
// When task is completed in task UI, update journal

async function onTaskComplete(task: Task) {
  if (task.source_type !== 'journal') return;
  
  const link = await getJournalTaskLink(task.id);
  if (!link) return;
  
  const journal = await getJournal(link.journal_id);
  const lines = journal.body_md.split('\n');
  
  // Update the checkbox
  const lineIndex = link.markdown_line - 1;
  lines[lineIndex] = lines[lineIndex].replace('- [ ]', '- [x]');
  
  await updateJournal(journal.id, {
    body_md: lines.join('\n')
  });
}
```

**UI Behavior:**

1. **On journal save:**
- Scan for new `- [ ]` items
- Show toast: “Found 3 tasks. [Add to Today] [Ignore]”
- If user confirms, create tasks linked to journal
1. **In journal view:**
- Checkboxes are interactive
- Clicking checkbox updates both journal AND linked task
1. **In task view:**
- Tasks from journals show source indicator
- “From journal: Jan 15” link to jump to source

-----

### 20.21 Personal Operations: End-of-Day Review

**Relevant Phases:** 1

**Problem:** Need OmniFocus-style daily review to organize and close out the day.

**Specification:**

**Review Components:**

|Section              |Purpose                           |
|---------------------|----------------------------------|
|**Inbox Processing** |Clear inbox to zero               |
|**Today Review**     |What got done, what didn’t        |
|**Tomorrow Planning**|Move incomplete, schedule tomorrow|
|**Daily Log**        |Time spent summary                |
|**Quick Journal**    |Optional reflection prompt        |

**Schema:**

```sql
-- Review sessions
review_sessions
  - id: uuid (primary key)
  - owner_id: uuid (references auth.users, NOT NULL)
  - review_type: text (NOT NULL)
    -- Values: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual'
  - review_date: date (NOT NULL)
  - started_at: timestamptz (NOT NULL)
  - completed_at: timestamptz (nullable)
  - data: jsonb (review-specific data, answers, metrics)
  - created_at: timestamptz (default now())

CREATE UNIQUE INDEX idx_review_sessions_unique 
ON review_sessions(owner_id, review_type, review_date);

-- Review prompts/schedule
review_schedules
  - id: uuid (primary key)
  - owner_id: uuid (references auth.users, NOT NULL)
  - review_type: text (NOT NULL)
  - enabled: boolean (default true)
  - prompt_time: time (nullable, when to show prompt)
  - days_of_week: text[] (nullable, for weekly: which day)
  - day_of_month: integer (nullable, for monthly)
  - created_at: timestamptz (default now())
```

**Daily Review Flow:**

```typescript
interface DailyReviewData {
  // Inbox processing
  inboxStartCount: number;
  inboxProcessed: number;
  tasksCreated: number;
  tasksDeferred: number;
  tasksDeleted: number;
  
  // Today review
  todayTasksCompleted: number;
  todayTasksIncomplete: number;
  tasksMovedToTomorrow: string[]; // task IDs
  tasksRescheduled: string[];
  
  // Time summary
  totalTrackedSeconds: number;
  timeByCategory: Record<string, number>;
  timeByProject: Record<string, number>;
  pomodorosCompleted: number;
  
  // Reflection
  reflection?: string;
  dayRating?: number; // 1-5
  wins?: string[];
  challenges?: string[];
}
```

**Review UI Flow:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         END OF DAY REVIEW                               │
│                         Friday, January 15                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  STEP 1: INBOX (3 items)                                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ □ Call dentist                        [Today] [Tomorrow] [Someday] │
│  │ □ Research project management tools   [Today] [Tomorrow] [Someday] │
│  │ □ Buy birthday gift for Mom           [Today] [Tomorrow] [Someday] │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                          [Next →]      │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  STEP 2: TODAY'S TASKS                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ✓ Design database schema                              2h 15m     │
│  │ ✓ Write project scope                                 1h 30m     │
│  │ ○ Review contractor proposals        [→ Tomorrow] [Reschedule]   │
│  │ ○ Update portfolio site              [→ Tomorrow] [Reschedule]   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  Completed: 2 of 4 (50%)                                               │
│                                                          [Next →]      │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  STEP 3: TIME SUMMARY                                                  │
│                                                                         │
│  Total tracked: 6h 45m                                                 │
│                                                                         │
│  ████████████████░░░░  Work         4h 30m (67%)                      │
│  ████░░░░░░░░░░░░░░░░  Personal     1h 15m (19%)                      │
│  ██░░░░░░░░░░░░░░░░░░  Health       0h 45m (11%)                      │
│  █░░░░░░░░░░░░░░░░░░░  Admin        0h 15m (3%)                       │
│                                                                         │
│  🍅 Pomodoros completed: 8                                             │
│                                                          [Next →]      │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  STEP 4: REFLECTION (optional)                                         │
│                                                                         │
│  How was your day? (1-5): ○ ○ ● ○ ○                                   │
│                                                                         │
│  Wins:                                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Finished the database design ahead of schedule                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Anything to note?                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│                                              [Skip] [Complete Review]  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Scheduling:**

```typescript
// Check if review prompt should show

function shouldShowReviewPrompt(schedule: ReviewSchedule): boolean {
  const now = new Date();
  const currentTime = format(now, 'HH:mm');
  
  if (!schedule.enabled) return false;
  if (schedule.prompt_time && currentTime < schedule.prompt_time) return false;
  
  // Check if already completed today
  const existingReview = await getReviewSession(
    schedule.owner_id,
    schedule.review_type,
    today()
  );
  
  return !existingReview?.completed_at;
}
```

**Implementation Notes:**

- Review can be triggered manually anytime via button/shortcut
- Scheduled prompt appears as non-blocking notification
- Review state is saved incrementally (can pause and resume)
- Completing review creates a `review_sessions` record with full data

-----

### 20.22 Personal Operations: Weekly Review with Time Reports

**Relevant Phases:** 3

**Problem:** Weekly review needs time analysis and goal progress.

**Specification:**

**Weekly Review Components:**

|Section               |Purpose                 |
|----------------------|------------------------|
|**Time Analysis**     |Where did the week go?  |
|**Project Progress**  |What moved forward?     |
|**Habit Streaks**     |How consistent were you?|
|**OKR Check-in**      |Are you on track?       |
|**Wins & Challenges** |Celebrate and learn     |
|**Next Week Planning**|Set intentions          |

**Weekly Review Data:**

```typescript
interface WeeklyReviewData {
  weekStart: string; // ISO date
  weekEnd: string;
  
  // Time analysis
  totalTrackedSeconds: number;
  timeByCategory: Record<string, number>;
  timeByProject: Record<string, number>;
  timeByArea: Record<string, number>;
  dailyBreakdown: Array<{
    date: string;
    trackedSeconds: number;
    pomodorosCompleted: number;
  }>;
  comparisonToPreviousWeek: {
    totalDelta: number; // seconds
    categoryDeltas: Record<string, number>;
  };
  
  // Tasks
  tasksCompleted: number;
  tasksCreated: number;
  taskCompletionRate: number;
  
  // Habits
  habitCompletionRates: Array<{
    habitId: string;
    habitTitle: string;
    completedDays: number;
    targetDays: number;
    currentStreak: number;
  }>;
  overallHabitRate: number;
  
  // OKRs
  okrProgress: Array<{
    objectiveId: string;
    objectiveTitle: string;
    keyResults: Array<{
      id: string;
      title: string;
      currentValue: number;
      targetValue: number;
      progressPercent: number;
    }>;
  }>;
  
  // Reflection
  wins: string[];
  challenges: string[];
  lessonsLearned: string;
  nextWeekFocus: string[];
  energyLevel: number; // 1-5
  overallRating: number; // 1-5
}
```

**Time Report Visualizations:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    WEEKLY TIME REPORT                                   │
│                    Jan 8 - Jan 14, 2024                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  TOTAL TRACKED: 38h 45m (+2h 30m vs last week)                        │
│                                                                         │
│  BY CATEGORY                                                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Work       ████████████████████████████░░░░░░  24h 15m (63%)    │   │
│  │ Personal   ████████░░░░░░░░░░░░░░░░░░░░░░░░░░   6h 30m (17%)    │   │
│  │ Health     █████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   4h 00m (10%)    │   │
│  │ Learning   ███░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   2h 30m (6%)     │   │
│  │ Other      ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   1h 30m (4%)     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  DAILY BREAKDOWN                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │     Mon   Tue   Wed   Thu   Fri   Sat   Sun                     │   │
│  │  8h  █                                                          │   │
│  │  6h  █     █     █     █     █                                  │   │
│  │  4h  █     █     █     █     █           █                      │   │
│  │  2h  █     █     █     █     █     █     █                      │   │
│  │  0h  ─     ─     ─     ─     ─     ─     ─                      │   │
│  │     6h30  7h15  6h45  7h00  6h15  3h00  2h00                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  TOP PROJECTS                                                           │
│  1. Anchored MVP ..................... 12h 30m                         │
│  2. Client Work ...................... 8h 45m                          │
│  3. Content Creation ................. 3h 00m                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Implementation Notes:**

- Weekly review prompts on configured day (default: Sunday evening)
- Time data is aggregated from `time_entries` table
- Previous week comparison helps spot trends
- OKR progress calculated from `okr_key_results` current vs target
- Review data stored in `review_sessions.data` as JSONB

-----

### 20.23 Personal Operations: Reading App (Future)

**Relevant Phases:** 11

**Problem:** Need read-later + annotation system to feed Zettelkasten.

**Status:** Deferred. Not in MVP scope.

**Specification Preview:**

```sql
-- Reading items (the source material)
reading_items
  - id: uuid
  - owner_id: uuid
  - item_type: text ('link' | 'pdf' | 'epub' | 'youtube' | 'audio')
  - title: text
  - author: text (nullable)
  - source_url: text (nullable)
  - storage_path: text (nullable)
  - thumbnail_url: text (nullable)
  - duration_seconds: integer (nullable)
  - word_count: integer (nullable)
  - status: text ('inbox' | 'reading' | 'completed' | 'archived')
  - reading_progress: numeric (nullable, 0-100)
  - tags: text[]
  - created_at: timestamptz
  - completed_at: timestamptz (nullable)

-- Highlights and annotations
reading_highlights
  - id: uuid
  - reading_item_id: uuid
  - highlight_text: text
  - note: text (nullable)
  - color: text (nullable)
  - location_data: jsonb
  - promoted_to_vault: boolean (default false)
  - vault_path: text (nullable)
  - created_at: timestamptz

-- Transcriptions (for video/audio)
reading_transcriptions
  - id: uuid
  - reading_item_id: uuid
  - transcription_text: text
  - segments: jsonb
  - source: text
  - created_at: timestamptz
```

**Features (when implemented):**

- Save links, PDFs, EPUBs, YouTube videos
- In-app reader with highlighting
- Notes on highlights
- YouTube playback with transcript sync
- Audio/video transcription (AI: Whisper/AssemblyAI)
- Export highlights to vault as Zettelkasten notes

**Implementation Notes:**

- This is a significant feature, roughly 1-2 phases of work
- Can be built independently after core personal operations stable
- Consider: start with links + YouTube only, add PDF/EPUB later

-----

## 22. CHANGE LOG

|Date      |Change                                                                                                                                                                                                                                                                     |
|----------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|2024-XX-XX|Initial architecture (Supabase as source of truth)                                                                                                                                                                                                                         |
|2024-XX-XX|Revised: getanchored.app as canonical, three-surface model                                                                                                                                                                                                                 |
|2024-XX-XX|V2: Hybrid sync model (parallel write), internal/feedback notes separation, gated content interstitials, promotion immutability                                                                                                                                            |
|2024-XX-XX|V2.1: Added Implementation Specifications section with schemas                                                                                                                                                                                                             |
|2024-XX-XX|V2.2: Added Section 17 (Anchored Design Direction) with UX inspiration                                                                                                                                                                                                     |
|2024-XX-XX|V3: Reordered phases, added personal operations specs (20.16-20.23)                                                                                                                                                                                                        |
|2024-XX-XX|V4: Simplified architecture — Git as nightly export (not in write path), Supabase is source of truth. Renamed app.dwaynemcyrus.com → voyagers.dwaynemcyrus.com. Reduced to two launch tiers (1:1, Supporter). Defined core 20% MVP for each phase with acceptance criteria.|
|2024-XX-XX|V4.1: Incorporated missing schemas from v3 document — added profiles table, portal_uploads, newsletter_subscriptions. Updated tier names to ‘1v1’ and ‘supporter’. Fixed remaining parallel write references in content flows.                                             |
|2024-XX-XX|V4.2: Specified MailerLite as newsletter provider.                                                                                                                                                                                                                         |

-----

*This document is the authoritative reference for platform architecture. All implementation decisions should align with the principles and flows defined here.*

#documentation 
