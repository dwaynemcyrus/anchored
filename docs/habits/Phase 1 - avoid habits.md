# Phase 1 - avoid habits
You are an expert full-stack engineer. Build **Phase 1: Avoid (Do-Not) Habits** for the app.

This phase implements ONLY do-not habits (breaking habits). Do not add quota, build, or schedule habits.

====================================================
NON-NEGOTIABLE CONSTRAINTS
====================================================

Tech
- Stack: Next.js App Router + TypeScript + Supabase (Postgres) + React Query
- Styling: **PURE CSS ONLY**
  - CSS Modules
  - Semantic, descriptive class names
  - ❌ NO Tailwind
  - ❌ NO utility frameworks
- UI:
  - ❌ NO icons (no SVG icons, no icon fonts, no emoji icons)
  - ❌ NO animations
  - ❌ NO transitions
  - ❌ NO motion effects
  - Bare-minimal, text-first, calm aesthetic
- Time handling:
  - User timezone defines day boundaries
  - NEVER rely on UTC for “today”

Scope
- Habit type: **ONLY `avoid`**
- No positive habits
- No quotas
- No timers
- No notifications
- No gamification

Mental model
- Do-not habits track **absence**, not completion
- A day is clean by default
- User only interacts when they slip or explicitly exclude a day

====================================================
CORE CONCEPT
====================================================

A Do-Not Habit is a rule:
“If I do X today, I broke the rule.”

Daily state:
- clean (default)
- slipped (one or more slip events logged)
- excluded (manually excluded day)

====================================================
1) DATABASE (SUPABASE)
====================================================

Create tables:

A) habits
- id uuid pk default gen_random_uuid()
- user_id uuid not null references auth.users(id) on delete cascade
- name text not null
- type text not null check (type = 'avoid')
- is_active boolean not null default true
- timezone text not null
- created_at timestamptz not null default now()
- archived_at timestamptz null

Indexes:
- (user_id, is_active)

----------------------------------------------------

B) habit_slips  (source of truth)
- id uuid pk default gen_random_uuid()
- habit_id uuid not null references habits(id) on delete cascade
- user_id uuid not null references auth.users(id) on delete cascade
- occurred_at timestamptz not null default now()
- local_date date not null
- severity smallint null check (severity between 1 and 3)
- note text null
- created_at timestamptz not null default now()

Indexes:
- (habit_id, local_date)

----------------------------------------------------

C) habit_days  (cached day state)
- id uuid pk default gen_random_uuid()
- habit_id uuid not null references habits(id) on delete cascade
- user_id uuid not null references auth.users(id) on delete cascade
- local_date date not null
- status text not null check (status in ('clean','slipped','excluded')) default 'clean'
- note text null
- updated_at timestamptz not null default now()

Unique:
- unique(habit_id, local_date)

----------------------------------------------------

RLS
- Enable RLS on all tables
- User may only access rows where user_id = auth.uid()

----------------------------------------------------

Day state rules
- If ANY slip exists for a day → status = slipped
- Excluded overrides slipped for display only
- Undoing slips recomputes the day state

====================================================
2) TIME + LOCAL DATE UTILITIES
====================================================

Create:
- /lib/time/local-date.ts

Functions:
- getLocalDateString(date, timezone): YYYY-MM-DD
- getTodayLocalDateString(timezone)

Do NOT use naive toISOString slicing.

====================================================
3) SERVER OPERATIONS
====================================================

Implement via Server Actions or Route Handlers:

- createAvoidHabit(name, timezone)
- archiveHabit(habitId)

- logSlip(habitId, occurredAt?, severity?, note?)
  - occurredAt defaults to now
  - compute local_date via timezone
  - insert slip
  - upsert habit_days to slipped (unless excluded)

- undoSlip(slipId)
  - delete slip
  - recompute habit_days status

- setDayExcluded(habitId, local_date, excluded:boolean)

- getAvoidHabitsToday()
- getAvoidHabitDetail(habitId, rangeStart, rangeEnd)

====================================================
4) STREAK CALCULATION (PURE FUNCTION)
====================================================

Create:
- /lib/habits/streak.ts

Rules:
- Streak = consecutive CLEAN days
- Count ends at **yesterday**
- Excluded days do NOT increment or break
- Slipped breaks streak

Include unit tests:
- excluded chains
- slips in past
- slip today
- undo edge cases

====================================================
5) CLIENT DATA HOOKS
====================================================

Create React Query hooks:

- use-avoid-habits-today.ts
  Returns:
  - habits with today status
  - clean streak
  - last slip date

- use-avoid-habit-detail.ts
  Returns:
  - calendar days (last 60)
  - slip log
  - derived stats

Invalidate queries after all mutations.

====================================================
6) UI (MINIMAL, TEXT-FIRST)
====================================================

A) Home / Today View

Add “Avoid Habits” section.

HabitCard:
- Habit name (text only)
- Status text: Clean / Slipped / Excluded
- Clean streak value
- Last slip date (or “None”)
- Primary button:
  - “Log Slip”
  - “Undo Slip” (if slipped today)
- Secondary text button:
  - “Exclude today”
  - “View details”

NO:
- icons
- animations
- progress bars
- decorative UI

----------------------------------------------------

B) Habit Detail View

- Header with habit name + archive
- Simple calendar grid (text + background color only)
- Slip log list (timestamp + note)
- Toggle exclude per day

====================================================
7) EDGE CASES (MANDATORY)
====================================================

- Multiple slips per day allowed
- Undo removes latest slip
- Excluding a slipped day does not delete slips
- Un-excluding restores slipped if slips exist
- Timezone changes do NOT rewrite history
- Archived habits disappear from Home but retain data

====================================================
8) DELIVERABLES
====================================================

Provide:
- SQL migrations + RLS
- Utilities
- Hooks
- UI components
- Unit tests for streak logic
- /docs/habits-avoid.md explaining rules

Do NOT:
- Add icons
- Add animations
- Add Tailwind
- Add positive habits
- Add quotas
- Add timers
- Add notifications

Build this boring, correct, and psychologically clean.