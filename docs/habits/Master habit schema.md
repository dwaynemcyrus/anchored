# Master habit schema
This document defines the **canonical structure, vocabulary, and boundaries** of the Habit system.

It is the **single source of truth** for how habits are modeled, extended, and evaluated across all phases.

Any AI agent or developer working on habits MUST follow this document.

---

## Purpose

The Voyagers habit system supports multiple habit types without mixing logic, data, or mental models.

This document exists to:
- Prevent logic bleed between habit types
- Prevent schema drift over time
- Give AI agents a shared mental model
- Allow safe future extensions

This is a **structural constitution**, not a feature spec.

---

## Core Doctrine (Non-Negotiable)

1. Habit types NEVER share evaluation logic
2. Habit types NEVER reuse event tables
3. Habit identity is separate from habit behavior
4. Evaluation happens per completed period
5. Users see intent; the system sees types
6. Defaults favor clarity over flexibility

---

## Supported Habit Types

| Intent (UI)           | Internal Type |
|----------------------|---------------|
| Stop something        | `avoid`       |
| Limit something       | `quota`       |
| Build something       | `build`       |
| Show up at a time     | `schedule`    |

Internal type names are NEVER exposed in the UI.

---

## The Four-Layer Model (Applies to ALL Habit Types)

Every habit is composed of exactly four layers:
No habit may skip or merge these layers.

---

## 1) Habit Identity (Shared by All Types)

### Canonical `habits` table

Fields that ALL habits have:

- id
- user_id
- name
- type
- timezone
- is_active
- created_at
- archived_at

Rules:
- Identity contains NO behavior logic
- Identity never changes meaning when type changes
- Archiving affects visibility, not history

---

## 2) Rules (Type-Specific, Never Shared)

Rules define **what success or failure means**.

| Type      | Rule Definition |
|----------|------------------|
| avoid     | No violation events allowed per day |
| quota     | Total usage ≤ max per period |
| build     | Total progress ≥ minimum per period |
| schedule  | Presence at scheduled occurrence |

Rules are declarative, not procedural.

---

## 3) Events (Source of Truth)

Events represent **what the user actually does**.

Each habit type has its OWN event table.

| Type      | Event Meaning      |
|----------|---------------------|
| avoid     | Slip (violation)    |
| quota     | Usage amount        |
| build     | Progress amount     |
| schedule  | Completion / skip   |

Rules:
- Events are append-only
- Events never encode evaluation logic
- Deleting an event triggers recomputation

---

## 4) Evaluation (Derived, Cached)

Evaluation answers:
> “Given the events, what happened this period?”

Evaluation is:
- Deterministic
- Recomputable
- Cached for UI performance

| Type      | Evaluation States |
|----------|-------------------|
| avoid     | clean / slipped / excluded |
| quota     | under / near / over |
| build     | complete / incomplete |
| schedule  | completed / missed / skipped |

Evaluation tables may exist but are NEVER authoritative.

---

## Period Model (Shared Concept)

All evaluation happens in **periods**.

| Period | Definition |
|------|------------|
| day   | Local calendar day |
| week  | Local calendar week (Monday start) |
| month | Local calendar month |

Rules:
- Timezone defines boundaries
- UTC is NEVER used for evaluation
- No rolling windows unless explicitly defined in a future phase

---

## Streaks & Wins (Type-Specific)

Streaks are NOT universal.

| Type      | Streak Meaning |
|----------|----------------|
| avoid     | Consecutive clean days |
| quota     | Consecutive under-limit periods |
| build     | Consecutive completed periods |
| schedule  | Consecutive completed occurrences (ignoring skipped) |

Streak logic MUST live in type-specific pure functions.

---

## Hard Boundaries (Do Not Violate)

- ❌ Avoid habits must NOT use quota math
- ❌ Build habits must NOT use quota limits
- ❌ Schedule habits must NOT count “amounts”
- ❌ One habit type must NEVER query another’s event table
- ❌ No polymorphic “events” table

If logic seems reusable, it belongs in **shared utilities**, not shared models.

---

## UI Translation Rules

Users interact with:
- Intent (“Stop”, “Limit”, “Build”, “Show up”)
- Plain language rules
- Minimal configuration

Users NEVER see:
- Internal type names
- Evaluation states directly
- Raw event counts unless meaningful

---

## Extension Rules (Future Phases)

New habit types MAY be added only if:
1. They map cleanly to the 4-layer model
2. They define their own rules
3. They define their own events
4. They define their own evaluation states

If a proposed habit type cannot meet these, it is NOT a habit.

---

## AI Agent Instructions

When building or modifying habits:
1. Read this document first
2. Identify which layer you are touching
3. Do not cross layer boundaries
4. Do not generalize across types
5. If uncertain, ASK before implementing

This document overrides all other habit-related prompts.

---

## Status

This document is **authoritative**.

All Phase prompts (1–4) are implementations of this schema.

Any deviation must be explicit, documented, and intentional.