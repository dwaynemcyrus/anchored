# DMC Platform — Project Scope & Architecture Infrastructure
Below is **Document 2 of 2**.

This is the **infrastructure spine** of the system, carried forward from v4.2, **validated against v5.0**, and lightly corrected only where doctrine required it (naming, precedence, wording).
There is **no philosophical drift** here — this is execution-grade material.

You can copy this **verbatim** into a second file.
## **v5.0 — INFRASTRUCTURE**

> **Status:** Authoritative
> **Audience:** Builder / future collaborators
> **Validated Against:** v5.0 Core Doctrine
> **Supersedes:** v4.2 Infrastructure (unchanged unless noted)

---

## 1. SYSTEM ARCHITECTURE (VALIDATED)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        getanchored.app                                  │
│                    (Canonical Authoring System)                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ALL writing happens here:                                              │
│                                                                         │
│  • Tasks / Capture / Today                                              │
│  • Journals                                                             │
│  • Markdown documents                                                   │
│  • Session prep & summaries                                             │
│  • Internal notes (private)                                             │
│  • Feedback notes (shared)                                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              │  save
                              ▼
                       ┌──────────────┐
                       │   Supabase   │  ← Source of Truth
                       └──────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
            ▼                 ▼                 ▼
     Voyagers Portal    Public Site       Nightly Export
     (real-time read)   (build on publish)    (Git backup)
```

**v5.0 confirmation:**

* Anchored is **upstream of everything**
* Voyagers and Public Site **never write**
* Git is **not** in the write path

---

## 2. DOMAIN RESPONSIBILITIES (UNCHANGED)

### 2.1 getanchored.app

**Purpose:**
Canonical environment for thinking, writing, planning, and mentorship preparation.

**Owns:**

* All markdown content
* Tasks, habits, reviews
* Journals (private)
* Session prep and summaries
* Internal notes (never synced)
* Feedback notes (shared)

**Does NOT own:**

* Billing
* Entitlements
* Client-facing UX

---

### 2.2 dwaynemcyrus.com (Public Site)

**Purpose:**
Static digital garden. Read-only.

* Astro
* No auth
* No dashboards
* No user state
* Built from Supabase export

---

### 2.3 voyagers.dwaynemcyrus.com (Portal)

**Purpose:**
Authenticated client interface.

* Auth
* Billing
* Entitlements
* Session viewing
* Feedback consumption
* Q&A

**Doctrine check:**
Voyagers **consumes** content.
It does **not** author or decide structure.

---

## 3. CONTENT MODEL (UNCHANGED)

### 3.1 Authoring Rules

| Content Type      | Authored In | Stored In      | Visible In        |
| ----------------- | ----------- | -------------- | ----------------- |
| Articles / Essays | Anchored    | Supabase + Git | Public site       |
| Resources         | Anchored    | Supabase + Git | Portal            |
| Announcements     | Anchored    | Supabase + Git | Portal            |
| Session Prep      | Anchored    | Supabase + Git | Portal (optional) |
| Session Summary   | Anchored    | Supabase + Git | Portal            |
| Internal Notes    | Anchored    | Private DB     | Anchored only     |
| Feedback Notes    | Anchored    | Supabase       | Portal            |

---

### 3.2 Document Schema (UNCHANGED)

```yaml
---
id: ULID
title: string
slug: string
collection: engineer | mentor | artist | labs | library | mentorship | pages
visibility: public | supporter | 1v1 | private
status: draft | published | archived
canonical: /library/example
tags: []
summary: string
date: YYYY-MM-DD
---
```

IDs are internal.
Canonicals are human-readable.
This remains unchanged in v5.0.

---

## 4. DATA ARCHITECTURE (UNCHANGED)

### 4.1 Supabase Is the Single Source of Truth

* All writes go to Supabase
* Realtime used for portals
* RLS enforced strictly
* Git is **backup only**

---

### 4.2 Key Tables (VALIDATED)

* `documents`
* `document_versions`
* `profiles`
* `entitlements`
* `portal_sessions`
* `portal_questions`
* `portal_responses`
* `feedback_notes`
* `portal_announcements`
* `portal_resources`
* `internal_notes` (private)
* Personal operations tables (tasks, habits, journals, reviews)

No schema changes required for v5.0.

---

## 5. ROW LEVEL SECURITY (RLS) (UNCHANGED)

**Principles:**

* Owner has full access
* Users can only read what they are entitled to
* Private tables are owner-only
* No cross-user leakage

RLS policies defined in v4.2 remain valid and **unchanged**.

---

## 6. CONTENT FLOWS (VALIDATED)

### 6.1 Authoring → Public

```
Anchored → Supabase → Astro build → Public site
```

Manual publish trigger only.

---

### 6.2 Authoring → Portal

```
Anchored → Supabase (realtime) → Voyagers Portal
```

Immediate visibility after save (subject to visibility flags).

---

## 7. SESSION LIFECYCLE (UNCHANGED)

1. Session created in Anchored
2. Prep written (optional visibility)
3. Session occurs
4. Internal notes written (private)
5. Summary written (client-facing)
6. Feedback notes added
7. Optional promotion to vault

This flow remains correct under v5.0.

---

## 8. STORAGE & MEDIA (UNCHANGED)

* Supabase Storage
* Public bucket for images
* Private bucket for downloads, uploads
* Signed URLs for private assets
* No Git LFS

---

## 9. STRIPE & BILLING (UNCHANGED)

* Stripe handles payments
* Webhooks manage entitlements
* Entitlements gate access
* Billing logic isolated to portal

Anchored never touches billing.

---

## 10. SEARCH (DEFERRED, VALIDATED)

* PostgreSQL FTS for MVP
* Meilisearch deferred
* Search is **not Phase 1–4 critical**

No change.

---

## 11. RECOVERY & BACKUP (UNCHANGED)

* Nightly Supabase → Git export
* Git is recovery, not operational
* Recovery scripts defined
* Operational data loss accepted unless promoted

Doctrine unchanged.

---

## 12. REPOSITORIES (VALIDATED)

```
/getanchored-app        ← Canonical authoring app
/dwaynemcyrus-app      ← Portal
/dwaynemcyrus-com      ← Public site
/vault                 ← Markdown content
/public-mirror         ← Generated export
```

Clear separation remains correct.

---

## 13. TECHNOLOGY STACK (MINOR UPDATE)

| Surface  | Tech                       |
| -------- | -------------------------- |
| Anchored | Next.js + Supabase         |
| Portal   | Next.js + Supabase         |
| Public   | Astro                      |
| Styling  | **Pure CSS + CSS Modules** |
| Auth     | Supabase                   |
| Payments | Stripe                     |
| Hosting  | Vercel                     |

> **v5.0 note:** Tailwind fully removed from all surfaces.

---

## 14. FINAL INFRASTRUCTURE VERDICT

* Architecture is sound
* Schemas are stable
* Data flow matches doctrine
* No rewrites required
* Safe to build on for years

This document is intentionally **boring**.
That’s a compliment.

---

## 15. CHANGE LOG (INFRASTRUCTURE)

| Date       | Change                                                                                                                                                    |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2025-01-XX | v5.0 validation pass. Infrastructure confirmed compatible with Anchored-first doctrine. Styling standard updated to pure CSS. No schema changes required. |

---

**End of v5.0 — INFRASTRUCTURE**

---

## What you have now (important)

You now have:

* **v5.0 Core** → Direction, phases, doctrine
* **v5.0 Infrastructure** → Execution truth

Together, these replace v4.2 entirely.

### Recommended next steps (pick one):

1. Extract a **1-page Build Constitution**
2. Turn Phase 1 into a **task checklist**
3. Lock Phase 1 schema + UI primitives
4. Start a **Phase 1 build log**

Say the word.
#documentation