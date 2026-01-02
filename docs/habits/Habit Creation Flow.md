# Habit Creation Flow

This document defines the **single, unified Habit Creation flow** for the Voyagers app.

This flow must support **all four habit types** while remaining calm, minimal, and non-overwhelming.

This is a **design + behavior spec**, not a visual design system.

---

## Design Principles (Non-Negotiable)

- One decision per screen
- Progressive disclosure
- Text-first UI
- Calm, minimal aesthetic
- Defaults over configuration
- Advanced options are hidden by default

### Explicit UI Constraints
- ❌ NO Tailwind
- ❌ NO icons (SVGs, icon fonts, emojis)
- ❌ NO animations
- ❌ NO transitions
- ❌ NO motion effects
- Use **pure CSS** with semantic class names

---

## Supported Habit Types

The system supports four habit types:

| User Intent           | Internal Type |
|----------------------|---------------|
| Stop something        | `avoid`       |
| Limit something       | `quota`       |
| Build something       | `build`       |
| Show up at a time     | `schedule`    |

Users NEVER see internal type names in the UI.

---

## Flow Overview

The Habit Creation flow consists of **four steps maximum**:

1. Choose intent
2. Name the habit
3. Define one rule
4. Review & create

Users must never be presented with more than one decision at a time.

---

## STEP 1 — Choose Intent

### Screen Title
**Create a habit**

### Prompt
**What kind of change do you want?**

### Options
- Stop something (break a habit)
- Limit something (keep it under control)
- Build something (do a minimum regularly)
- Show up at a time (a routine or ritual)

### Behavior
- Selecting an option sets the internal habit type
- Proceed immediately to Step 2
- No configuration on this screen

---

## STEP 2 — Name the Habit

### Prompt
**Name your habit**

### Input
Free-text input.

Example helper text:
- Smoking
- Social media
- Reading
- Morning prayer

### Rules
- Name is required
- No validation beyond non-empty
- Verbs are optional

---

## STEP 3 — Define the Rule (Type-Specific)

This step branches based on habit type.
Only the relevant rule UI is shown.

---

### A) Avoid Habit (`avoid`)

#### Prompt
**The rule**

> If I do this today, the day is broken.

No configuration required.

Optional (collapsed):
- Timezone (auto-detected)

Primary action:
**Create habit**

---

### B) Quota Habit (`quota`)

#### Prompt
**Set a limit**

Fields:
- Amount (number input)
- Unit (minutes, count, grams, units, currency)
- Period (day, week, month)

Defaults:
- 30 minutes per day
- Near-threshold warning at 80%
- Soft over-limit disabled

Optional (collapsed):
- Adjust near threshold
- Allow soft over

Primary action:
**Create habit**

---

### C) Build Habit (`build`)

#### Prompt
**Set the minimum**

Fields:
- Amount (number input)
- Unit (pages, steps, minutes, reps, sessions)
- Period (day, week, month)

Defaults:
- Small, achievable minimum
- Daily period

Optional (collapsed):
- Timezone

Primary action:
**Create habit**

---

### D) Schedule Habit (`schedule`)

#### Prompt
**Set the time**

Fields:
- Frequency (daily / weekly)
- Time
- Days of week (if weekly)

Defaults:
- Daily
- Time unset until user selects

Optional (collapsed):
- Timezone

Primary action:
**Create habit**

---

## STEP 4 — Review & Confirm (Optional but Recommended)

### Prompt
**Review habit**

Displayed summary:
- Type (human-readable)
- Name
- Rule

Example:
> Limit social media to 30 minutes per day.

Primary action:
**Create habit**

Secondary:
Back / Edit

---

## UX Rules

- One screen = one decision
- No icons anywhere
- No visual metaphors (progress bars, charts, gamification)
- Text buttons only
- Plenty of whitespace
- Calm typography

---

## Accessibility & Clarity

- All actions must be keyboard accessible
- No reliance on color alone for meaning
- Clear language, no productivity jargon

---

## Implementation Notes

- Flow may be implemented as:
  - A single route with internal step state
  - Or multiple routes (wizard-style)
- Advanced options must be collapsed by default
- Defaults should allow most users to complete flow in under 20 seconds

---

## Out of Scope

This document does NOT define:
- Habit tracking behavior
- Streak calculations
- Notifications
- Gamification
- Analytics

Those are defined in separate Phase documents.

---

## Authoritative Status

This document is the **single source of truth** for Habit Creation UX.
Any future habit types must integrate into this flow without increasing step count.