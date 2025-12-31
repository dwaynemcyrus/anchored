# DMC Platform — Project Scope & Architecture Core
Proceeding as locked.

Below is **Document 1 of 2**.

You can copy this **verbatim** into a new file.
## **v5.0 — CORE**

> **Status:** Authoritative
> **Audience:** Solo builder (with future collaborators)
> **Tone:** Builder-facing, doctrine-driven
> **Supersedes:** v4.2 Sections 0, 16, 17, Non-Negotiables, and Change Log

---

## 0. EXECUTIVE CORRECTION (v5.0)

This version formalizes a structural correction based on real usage, solo-builder constraints, and long-term intent.

Previous versions were directionally sound but **over-optimized for imagined scale** and **under-optimized for lived reality**.

### The truths v5.0 enforces:

1. A system you don’t open daily is fiction.
2. Writing is the highest-leverage action in the system.
3. Anchored is not a support tool — it is the product.
4. Portals, billing, and community are downstream consumers.
5. Styling decisions must survive 10+ years and native rewrites.
6. Sunk cost does not dictate architecture.

v5.0 replaces optimism with operational truth.

---

## 1. UPDATED CORE PRINCIPLES (v5.0)

1. **getanchored.app is the center of gravity**
2. **Writing → Publishing → Monetization (in that order)**
3. **Supabase is the single source of truth**
4. **Git is backup only — never in the write path**
5. **Voyagers consumes content; it does not author it**
6. **The public site is an export, not an application**
7. **Frontend clarity beats framework cleverness**
8. **One phase at a time — fully used before expansion**
9. **Solo-first execution, collaborator-ready seams**
10. **Dogfood before you sell**

If a feature violates any of the above, it does not ship.

---

## 2. FRONTEND & STYLING DOCTRINE (v5.0 — NON-NEGOTIABLE)

This section overrides **all prior frontend assumptions**.

### 2.1 Forbidden

* ❌ Tailwind (entirely)
* ❌ Utility-first CSS
* ❌ Atomic / cryptic class names
* ❌ Styling coupled to build tooling trends

No exceptions. No “just for layout.”

---

### 2.2 Approved Standard

* **Pure CSS**
* **CSS Modules**
* **Descriptive, semantic class names**
* **Component-scoped styles by default**

Class names must communicate **meaning**, not mechanics.

#### Directional examples (not exhaustive):

* `.today-view`
* `.capture-input`
* `.task-list`
* `.task-item`
* `.active-timer`
* `.editor-surface`
* `.document-metadata`
* `.vault-browser`
* `.session-workspace`
* `.journal-entry`
* `.review-step`
* `.habit-streak`

If a class name would not make sense to you **six months from now**, it is wrong.

---

### 2.3 Rationale

This doctrine is locked because it:

* Reduces cognitive load for a solo builder
* Improves long-term maintainability
* Translates cleanly to native iOS / Android later
* Avoids framework churn and rewrites
* Makes the UI self-documenting for collaborators

CSS is part of the product’s **language**, not a build shortcut.

---

## 3. PRODUCT CENTER OF GRAVITY

### 3.1 Anchored (getanchored.app)

Anchored is:

* The **only** serious writing environment
* The **only** place thinking happens
* The **only** canonical authoring surface
* The product you are actively dogfooding

Everything else reads from it.

---

### 3.2 Voyagers Portal

Voyagers is:

* A **consumer** of Anchored content
* A **service surface**, not a thinking surface
* Built to serve **existing clients**, not speculative scale

It does not author.
It does not own content models.
It does not set direction.

---

### 3.3 Public Site

The public site is:

* A **static export**
* A digital garden
* A visibility layer

It is not interactive software.

---

## 4. PHASED EXECUTION PLAN — **v5.0**

> **Important:**
> Phases 1 and 2 are considered **conceptually rebuilt**, even if code exists.
> Sunk cost does not override doctrine.

---

## Phase 1 — Anchored: Capture + Today Engine (FOUNDATION)

**Status:** Re-scoped
**Supersedes:** v4.x Phase 1

### Goal

Create a system you **actually open every day**.

This is not a full productivity suite.
This is a **capture → decide → act → close** loop.

---

### In Scope

* Owner-only auth
* Global capture (frictionless inbox)
* Tasks with **minimal states only**:

  * `inbox`
  * `today`
  * `done`
* Single running timer (stopwatch only)
* Today View:

  * Today’s tasks
  * Daily habits (check-off only)
  * Active timer
* End-of-Day Review:

  * Inbox zero
  * Close open loops
  * Decide tomorrow

---

### Explicitly Out of Scope

* GTD completeness
* Areas
* Complex task states
* Pomodoro logic
* Reports
* Weekly / monthly reviews
* Analytics

If it doesn’t serve **daily use**, it does not ship.

---

### Acceptance Criteria

* You can capture a thought in <2 seconds
* You can see exactly what matters **today**
* Only one task can be active at a time
* You end the day with a closed loop

---

## Phase 2 — Anchored: Writing Surface (PROMOTED)

**Status:** Moved earlier (formerly Phase 4)

### Goal

Anchored becomes the **only place you write**.

If writing is not excellent here, nothing else matters.

---

### In Scope

* Markdown editor (distraction-free)
* Live preview
* Wiki-links (`[[ ]]`)
* Frontmatter editing
* Document states:

  * `draft`
  * `published`
  * `archived`
* Visibility controls
* Save → Supabase
* Manual “Publish” trigger

---

### Deferred

* Graph view
* Search
* AI features
* Collaboration

Anchored should feel closer to **Bear / iA Writer** than to Notion.

---

## Phase 3 — Public Site Export (DIGITAL GARDEN)

**Status:** Slimmed and focused

### Goal

Make writing visible **without turning the public site into a product**.

---

### In Scope

* Astro static build
* Supabase → build pipeline
* Markdown rendering
* Wiki-link resolution
* Backlinks
* Callouts
* Core collections only

---

### Out of Scope

* Comments
* Search
* Newsletter automation
* Analytics sophistication

This is an **export**, not an app.

---

## Phase 4 — Voyagers Portal MVP (DEFERRED BY DESIGN)

**Status:** Moved later (formerly Phase 3)

### Goal

Serve **existing clients**, not imagined scale.

---

### In Scope

* Auth
* Two tiers only:

  * 1:1
  * Supporter
* Announcements
* Resources
* 1:1 session display (minimal UI)
* Billing

---

### Explicitly Out of Scope

* Community features
* Cohorts
* Uploads
* Comments
* Store
* Automation
* Social features

Voyagers consumes content.
It does not generate it.

---

## 5. UPDATED NON-NEGOTIABLES (v5.0)

1. Anchored is canonical for all authored content
2. Supabase is the single source of truth
3. Git is backup only
4. Public site is static-first
5. Voyagers owns **client interactions only**
6. No content authoring in Voyagers
7. Internal notes never leave Anchored
8. Two tiers only at launch
9. Pure CSS only — no Tailwind
10. One phase at a time
11. Dogfood before expansion
12. Clarity beats cleverness

---

## 6. CHANGE LOG (v5.0)

| Date       | Change                                                                                                                                                                                                                                    |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2025-01-XX | **v5.0** — Major doctrinal correction. Anchored confirmed as center of gravity. Phases 1–2 re-scoped. Phase 3 and 4 swapped. Writing core promoted earlier. Tailwind fully removed. Styling locked to pure CSS with semantic class names. |

---

**End of v5.0 — CORE**

---

### What’s next

The **next message** will contain:

**Document 2 of 2**
👉 **Project Scope & Architecture v5.0 — INFRASTRUCTURE**

That document will:

* Carry forward the full architecture, schemas, and specs
* Be explicitly validated against v5.0 doctrine
* Be safe to commit as-is

Do not reply unless you want changes — I’m proceeding automatically.
#documentation