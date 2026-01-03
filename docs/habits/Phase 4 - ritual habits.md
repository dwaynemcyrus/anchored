# Phase 4 - ritual habits
You are an expert full-stack engineer. Build **Phase 4: Schedule / Ritual Habits** for the app.

This phase EXTENDS the existing Habit system by adding a new habit type: `schedule`.

Avoid (Phase 1), Quota (Phase 2), and Build (Phase 3) habits MUST remain unchanged in behavior, data model, and UI.

====================================================
NON-NEGOTIABLE CONSTRAINTS
====================================================

Tech
- Stack: Next.js App Router + Supabase (Postgres) + React Query
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
  - User timezone defines all schedule boundaries
  - Calendar-based evaluation only
  - NEVER rely on UTC for scheduled occurrences

Scope
- Habit type introduced in this phase: **`schedule`**
- No quantity tracking
- No quotas or minimums
- No notifications (reminder stubs allowed but disabled)
- No gamification

====================================================
CORE DEFINITION — SCHEDULE / RITUAL HABITS
====================================================

A Schedule Habit answers:
“Did I show up at the intended time?”

Examples:
- Morning prayer at Fajr
- Journaling before bed
- Weekly review on Sunday evening
- Gym at 6am on Mon/Wed/Fri

Schedule habits are:
- Time-anchored
- Occurrence-based
- Pass / Fail per scheduled occurrence
- Focused on rhythm, not volume

Schedule habits are NOT:
- Quantity-based
- Streak-by-default checklists
- Quotas or minimums

====================================================
1) DATABASE EXTENSIONS (SUPABASE)
====================================================

Extend `habits` table:

ADD columns:
- type text not null check (type in ('avoid','quota','build','schedule'))
- schedule_pattern jsonb null
- schedule_timezone text null

Constraints:
- schedule_* fields MUST be NOT NULL when type = 'schedule'
- schedule_* fields MUST be NULL when type != 'schedule'

----------------------------------------------------

Create new table: habit_schedule_occurrences

- id uuid pk default gen_random_uuid()
- habit_id uuid not null references habits(id) on delete cascade
- user_id uuid not null references auth.users(id) on delete cascade
- scheduled_at timestamptz not null
- local_date date not null
- status text not null check (status in ('pending','completed','missed','skipped'))
- completed_at timestamptz null
- note text null
- created_at timestamptz not null default now()

Indexes:
- (habit_id, local_date)
- (user_id, local_date)

----------------------------------------------------

RLS
- Enable RLS on new tables
- User may only access rows where user_id = auth.uid()

====================================================
2) SCHEDULE PATTERN LOGIC
====================================================

schedule_pattern (jsonb) structure examples:

Daily at time:
{
  "type": "daily",
  "time": "06:00"
}

Weekly on days:
{
  "type": "weekly",
  "days": ["mon","wed","fri"],
  "time": "06:00"
}

Weekly single:
{
  "type": "weekly",
  "days": ["sun"],
  "time": "19:00"
}

Rules:
- Store pattern only, not future occurrences
- Occurrences are generated lazily (on read or daily job)
- Occurrences are evaluated per local_date

====================================================
3) OCCURRENCE GENERATION
====================================================

Create utilities in:
- /lib/time/schedule.ts

Functions:
- generateOccurrences(habit, rangeStart, rangeEnd)
- getTodayOccurrences(habit)

Rules:
- Generate only missing occurrences
- Past occurrences default to status = missed
- Today occurrences default to pending
- User action sets completed or skipped

====================================================
4) SERVER OPERATIONS
====================================================

Implement via Server Actions or Route Handlers:

- createScheduleHabit({
  name,
  schedule_pattern,
  schedule_timezone
  })

- markOccurrenceCompleted(occurrenceId, completedAt?)
- markOccurrenceSkipped(occurrenceId)

- getScheduleHabitsToday()
  Returns:
  - today’s occurrences
  - status per occurrence

- getScheduleHabitDetail(habitId, rangeStart, rangeEnd)

Correctness rules:
- Missed is final once the scheduled window passes
- Skipped does NOT count as failure
- Completed counts as success
- Only one status per occurrence

====================================================
5) SCHEDULE STREAKS + STATS
====================================================

Schedule habits use **occurrence consistency**, not daily streaks.

Definitions:
- success = completed
- neutral = skipped
- failure = missed

Implement pure functions in:
- /lib/habits/schedule-stats.ts

Stats:
- completion rate %
- completed last 7 occurrences
- missed last 7 occurrences
- current consistency run (consecutive completed, ignoring skipped)

====================================================
6) CLIENT DATA HOOKS
====================================================

React Query hooks:

- use-schedule-habits.ts
  - For Home view
  - Returns today’s occurrences grouped by habit

- use-schedule-habit-detail.ts
  - Returns:
    - occurrence list
    - schedule stats

Invalidate queries after mutations.

====================================================
7) UI (BARE-MINIMAL, TEXT-FIRST)
====================================================

A) Home / Today View

Add **Schedule Habits** section BELOW Build Habits.

ScheduleOccurrenceRow:
- Habit name
- Scheduled time (text)
- Status text: Pending / Completed / Missed / Skipped
- Action buttons (text only):
  - Complete
  - Skip

NO:
- icons
- animations
- progress bars
- decorative visuals

----------------------------------------------------

B) Schedule Habit Detail View

- Header with habit name + archive
- List of occurrences (chronological)
- Simple calendar list view (text + background color only)
- Stats summary (text only)

====================================================
8) EDGE CASES (MANDATORY)
====================================================

- Multiple occurrences per day allowed
- Retroactive completion not allowed once missed
- Skipped does not affect consistency
- Timezone changes do NOT rewrite history
- Archiving stops future generation but keeps history

====================================================
9) DELIVERABLES
====================================================

Provide:
- SQL migrations + RLS
- Schedule utilities
- Server operations
- React Query hooks
- UI components
- Schedule stat functions
- /docs/habits-schedule.md explaining rules

Do NOT:
- Modify Avoid, Quota, or Build habit logic
- Add icons
- Add animations
- Add Tailwind
- Add notifications
- Add gamification

Build this clean, strict, and rhythm-focused.