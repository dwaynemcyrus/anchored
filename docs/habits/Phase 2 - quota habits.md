# Phase 2 - quota habits
You are an expert full-stack engineer. Build **Phase 2: Quota (Allowance) Habits** for the app.

This phase EXTENDS the existing Phase 1 Avoid Habit system.
Avoid habits MUST remain unchanged in behavior, data model, and UI.

====================================================
NON-NEGOTIABLE CONSTRAINTS
====================================================

Tech
- Stack: Next.js App Router + TypeScript + Supabase (Postgres) + React Query
- Styling:
  - **PURE CSS ONLY**
  - CSS Modules
  - Semantic, descriptive class names
  - ❌ NO Tailwind
  - ❌ NO utility-first frameworks
- UI:
  - ❌ NO icons (no SVG icons, no icon fonts, no emoji icons)
  - ❌ NO animations
  - ❌ NO transitions
  - ❌ NO motion effects
  - Bare-minimal, text-first, calm, utilitarian aesthetic
- Time handling:
  - User timezone defines period boundaries
  - Calendar-based periods only (no rolling windows)
  - NEVER rely on UTC for period evaluation

Scope
- Habit type introduced in this phase: **`quota`**
- Avoid habits already exist and must remain intact
- No build (minimum) habits
- No schedule habits
- No notifications
- No gamification
- No timers beyond stubs/placeholders

====================================================
CORE DEFINITION — QUOTA HABITS
====================================================

A Quota Habit answers:
“How much am I allowed to do per period, and how much is left?”

Examples:
- Social media ≤ 30 minutes/day
- Gaming ≤ 5 hours/week
- Sugar ≤ 25 grams/day
- Impulse buys ≤ 3/week

Quota habits are:
- Quantitative (usage accumulates)
- Period-based (day / week / month)
- Evaluated per completed period
- Marked as UNDER / NEAR / OVER

Quota habits are NOT:
- Binary checklists
- Do-not habits
- Minimum targets

====================================================
1) DATABASE EXTENSIONS (SUPABASE)
====================================================

Extend `habits` table:

ADD columns:
- type text not null check (type in ('avoid','quota'))
- quota_amount numeric null
- quota_unit text null check (quota_unit in ('minutes','count','grams','units','currency'))
- quota_period text null check (quota_period in ('day','week','month'))
- near_threshold_percent smallint not null default 80
- allow_soft_over boolean not null default false

Constraints:
- quota_* fields MUST be NOT NULL when type = 'quota'
- quota_* fields MUST be NULL when type = 'avoid'

----------------------------------------------------

Create new table: habit_usage_events

- id uuid pk default gen_random_uuid()
- habit_id uuid not null references habits(id) on delete cascade
- user_id uuid not null references auth.users(id) on delete cascade
- occurred_at timestamptz not null default now()
- local_period_start date not null
- local_period_end date not null
- amount numeric not null
- note text null
- created_at timestamptz not null default now()

Indexes:
- (habit_id, local_period_start)
- (user_id, local_period_start)

----------------------------------------------------

Create derived cache table: habit_periods

- id uuid pk default gen_random_uuid()
- habit_id uuid not null references habits(id) on delete cascade
- user_id uuid not null references auth.users(id) on delete cascade
- local_period_start date not null
- local_period_end date not null
- total_used numeric not null default 0
- status text not null check (status in ('under','near','over'))
- updated_at timestamptz not null default now()

Unique:
- unique(habit_id, local_period_start)

----------------------------------------------------

RLS
- Enable RLS on all new tables
- User may only access rows where user_id = auth.uid()

====================================================
2) PERIOD + TIMEZONE UTILITIES
====================================================

Create:
- /lib/time/periods.ts

Functions:
- getCurrentPeriod(timezone, quota_period)
- getPeriodForDate(date, timezone, quota_period)
- isSamePeriod(a, b)

Rules:
- Day = local calendar day
- Week = calendar week (Monday default)
- Month = calendar month
- No rolling or sliding windows in Phase 2

====================================================
3) SERVER OPERATIONS
====================================================

Implement via Server Actions or Route Handlers:

- createQuotaHabit({
  name,
  quota_amount,
  quota_unit,
  quota_period,
  near_threshold_percent,
  allow_soft_over,
  timezone
  })

- logUsage(habitId, amount, occurredAt?, note?)
  - occurredAt defaults to now
  - compute local period via timezone
  - insert habit_usage_event
  - recompute habit_periods total + status

- undoUsage(eventId)
  - delete event
  - recompute period totals + status

- getQuotaHabitsToday()
  Returns:
  - used
  - remaining
  - quota_amount
  - status
  - period_end_date

- getQuotaHabitDetail(habitId, rangeStart, rangeEnd)

Status rules:
- near_threshold = quota_amount * (near_threshold_percent / 100)
- under = total_used < near_threshold
- near = >= near_threshold AND < quota_amount
- over = >= quota_amount

====================================================
4) QUOTA STREAKS + STATS
====================================================

Quota habits use **period wins**, not avoid streaks.

Definitions:
- winning period = status == 'under'
- failed period = status == 'over' AND allow_soft_over == false

Implement pure functions in:
- /lib/habits/quota-stats.ts

Stats:
- current winning streak
- wins last 7 periods
- wins last 30 periods
- breach count

====================================================
5) CLIENT DATA HOOKS
====================================================

React Query hooks:

- use-quota-habits.ts
  - For Home view
  - Returns remaining, used, status, period label

- use-quota-habit-detail.ts
  - Returns:
    - period history
    - usage event list
    - quota stats

Invalidate queries after mutations.

====================================================
6) UI (BARE-MINIMAL, TEXT-FIRST)
====================================================

A) Home / Today View

Add **Quota Habits** section BELOW Avoid Habits.

QuotaHabitCard:
- Habit name
- Remaining amount (PRIMARY TEXT)
- Used / Cap (secondary text)
- Status text: Under / Near / Over
- Action buttons (text buttons only):
  - +small
  - +medium
  - +large
  - Undo last

NO:
- icons
- animations
- charts
- progress bars
- decorative visuals

----------------------------------------------------

B) Quota Habit Detail View

- Header with habit name + archive
- Period summary (text only)
- Simple calendar-style grid (text + background color only)
- Usage log list (timestamp + amount + note)

====================================================
7) EDGE CASES (MANDATORY)
====================================================

- Multiple usage events accumulate per period
- Undo restores totals correctly
- Retroactive edits recompute stats
- Timezone changes do NOT rewrite history
- Archiving removes from Home but preserves data

====================================================
8) DELIVERABLES
====================================================

Provide:
- SQL migrations + RLS
- Period utilities
- Server operations
- React Query hooks
- UI components
- Quota stat functions
- /docs/habits-quota.md explaining rules

Do NOT:
- Modify Avoid Habit logic
- Add icons
- Add animations
- Add Tailwind
- Add timers
- Add notifications
- Add gamification

Build this clean, correct, and boring.