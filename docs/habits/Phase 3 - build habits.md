# Phase 3 - build habits
You are an expert full-stack engineer. Build **Phase 3: Build (Minimum Commitment) Habits** for the app.

This phase EXTENDS the existing Habit system by adding a new habit type: `build`.

Avoid (Phase 1) and Quota (Phase 2) habits MUST remain unchanged in behavior, data model, and UI.

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
  - Calendar-based periods only
  - NEVER rely on UTC for day/week/month evaluation

Scope
- Habit type introduced in this phase: **`build`**
- Avoid and Quota habits already exist and must remain intact
- No schedule/ritual habits
- No notifications
- No gamification
- No timers (manual logging only)

====================================================
CORE DEFINITION — BUILD HABITS
====================================================

A Build Habit answers:
“What is the minimum I must do per period to win?”

Examples:
- Read **10 pages/day**
- Walk **8,000 steps/day**
- Write **200 words/day**
- Train **3 times/week**
- Pray **5 times/day**

Build habits are:
- Minimum-based (used ≥ target)
- Accumulative within a period
- Period-based (day / week / month)
- Evaluated as WIN or MISS per completed period

Build habits are NOT:
- Quotas (no upper limit)
- Avoid habits
- Time-scheduled rituals

Overachievement is allowed and ignored once the minimum is met.

====================================================
1) DATABASE EXTENSIONS (SUPABASE)
====================================================

Extend `habits` table:

ADD columns:
- type text not null check (type in ('avoid','quota','build'))
- build_target numeric null
- build_unit text null check (build_unit in ('minutes','count','pages','steps','reps','sessions'))
- build_period text null check (build_period in ('day','week','month'))

Constraints:
- build_* fields MUST be NOT NULL when type = 'build'
- build_* fields MUST be NULL when type != 'build'

----------------------------------------------------

Create new table: habit_build_events

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

Create derived cache table: habit_build_periods

- id uuid pk default gen_random_uuid()
- habit_id uuid not null references habits(id) on delete cascade
- user_id uuid not null references auth.users(id) on delete cascade
- local_period_start date not null
- local_period_end date not null
- total_done numeric not null default 0
- status text not null check (status in ('incomplete','complete'))
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

Reuse existing period utilities from Phase 2:
- getCurrentPeriod
- getPeriodForDate

Rules:
- Day = local calendar day
- Week = calendar week (Monday default)
- Month = calendar month
- No rolling windows

====================================================
3) SERVER OPERATIONS
====================================================

Implement via Server Actions or Route Handlers:

- createBuildHabit({
  name,
  build_target,
  build_unit,
  build_period,
  timezone
  })

- logBuildProgress(habitId, amount, occurredAt?, note?)
  - occurredAt defaults to now
  - compute local period via timezone
  - insert habit_build_event
  - recompute habit_build_periods total + status

- undoBuildEvent(eventId)
  - delete event
  - recompute period totals + status

- getBuildHabitsToday()
  Returns:
  - total_done
  - remaining_to_win
  - status (incomplete / complete)
  - period_end_date

- getBuildHabitDetail(habitId, rangeStart, rangeEnd)

Status rules:
- incomplete = total_done < build_target
- complete = total_done >= build_target

====================================================
4) BUILD STREAKS + STATS
====================================================

Build habits use **winning periods**, not avoid streaks or quota limits.

Definitions:
- winning period = status == 'complete'
- missed period = status == 'incomplete'

Implement pure functions in:
- /lib/habits/build-stats.ts

Stats:
- current win streak (ending at last completed period)
- wins last 7 periods
- wins last 30 periods
- completion rate %

====================================================
5) CLIENT DATA HOOKS
====================================================

React Query hooks:

- use-build-habits.ts
  - For Home view
  - Returns progress, remaining, status, period label

- use-build-habit-detail.ts
  - Returns:
    - period history
    - build event list
    - build stats

Invalidate queries after mutations.

====================================================
6) UI (BARE-MINIMAL, TEXT-FIRST)
====================================================

A) Home / Today View

Add **Build Habits** section BELOW Quota Habits.

BuildHabitCard:
- Habit name
- Progress text: “X / Target”
- Remaining to win (PRIMARY)
- Status text: Incomplete / Complete
- Action buttons (text only):
  - +small
  - +medium
  - +large
  - Undo last

NO:
- icons
- animations
- progress bars
- charts
- decorative UI

----------------------------------------------------

B) Build Habit Detail View

- Header with habit name + archive
- Period summary (text only)
- Simple calendar-style grid (complete / incomplete)
- Build event log list (timestamp + amount + note)

====================================================
7) EDGE CASES (MANDATORY)
====================================================

- Multiple build events accumulate per period
- Over-target does not change status beyond complete
- Undo restores totals correctly
- Retroactive edits recompute stats
- Timezone changes do NOT rewrite history
- Archiving removes from Home but preserves data

====================================================
8) DELIVERABLES
====================================================

Provide:
- SQL migrations + RLS
- Server operations
- Period utilities reuse
- React Query hooks
- UI components
- Build stat functions
- /docs/habits-build.md explaining rules

Do NOT:
- Modify Avoid Habit logic
- Modify Quota Habit logic
- Add icons
- Add animations
- Add Tailwind
- Add notifications
- Add schedule-based habits

Build this boring, correct, and psychologically clean.