# Phase 1 Implementation Brief: Anchored Core

> **Timeline:** Weeks 1-4  
> **Goal:** Personal productivity system you use daily while building everything else.

-----

## 1. WHAT WE’RE BUILDING

A minimal but functional personal OS with:

- Project and task management
- Stopwatch time tracking
- Daily habit tracking
- Today view dashboard
- End-of-day review

**What we’re NOT building yet:**

- Areas (higher-level task grouping)
- Pomodoro timer
- Activity logging (non-task time)
- Duration-based habits
- Journals
- OKRs
- Weekly/monthly reviews
- Time reports
- Markdown editor
- Wiki-links

-----

## 2. TECH STACK

| Layer     | Choice                   | Notes                              |
|-----------|--------------------------|------------------------------------|
| Framework | Next.js 14+ (App Router) | Shared with future Voyagers portal |
| Styling   | Tailwind CSS + shadcn/ui | Consistent, accessible components  |
| Database  | Supabase (PostgreSQL)    | Auth, data, realtime               |
| Hosting   | Vercel                   | Auto-deploy from GitHub            |
| State     | React Query + Zustand    | Server state + local UI state      |

### Why These Choices

**shadcn/ui:** Not a component library — it’s copy-paste components you own. Customizable, accessible, works with Tailwind. Avoids dependency bloat.

**React Query:** Handles server state, caching, optimistic updates. Perfect for Supabase.

**Zustand:** Tiny, simple. For UI state like “is sidebar open” or “current timer”.

-----

## 3. DATABASE SCHEMA (Phase 1 Only)

### 3.1 Projects

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'completed', 'archived')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_status ON projects(owner_id, status);
```

### 3.2 Tasks

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'inbox'
    CHECK (status IN ('inbox', 'today', 'anytime', 'done')),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tasks_owner ON tasks(owner_id);
CREATE INDEX idx_tasks_status ON tasks(owner_id, status);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_due ON tasks(due_date) WHERE due_date IS NOT NULL;
```

### 3.3 Time Entries (Stopwatch Only)

```sql
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Only one running timer at a time
CREATE UNIQUE INDEX idx_time_entries_running 
ON time_entries(owner_id) 
WHERE ended_at IS NULL;

CREATE INDEX idx_time_entries_task ON time_entries(task_id);
CREATE INDEX idx_time_entries_date ON time_entries(owner_id, started_at);
```

### 3.4 Habits

```sql
CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_habits_owner ON habits(owner_id);
```

### 3.5 Habit Entries

```sql
CREATE TABLE habit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  entry_date DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- One entry per habit per day
CREATE UNIQUE INDEX idx_habit_entries_unique 
ON habit_entries(habit_id, entry_date);

CREATE INDEX idx_habit_entries_date ON habit_entries(owner_id, entry_date);
```

### 3.6 Review Sessions

```sql
CREATE TABLE review_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  review_type TEXT NOT NULL DEFAULT 'daily',
  review_date DATE NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_review_sessions_unique 
ON review_sessions(owner_id, review_type, review_date);
```

### 3.7 Row Level Security

```sql
-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_sessions ENABLE ROW LEVEL SECURITY;

-- Owner-only policies (same pattern for all tables)
CREATE POLICY "Owner access only" ON projects
  FOR ALL USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owner access only" ON tasks
  FOR ALL USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owner access only" ON time_entries
  FOR ALL USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owner access only" ON habits
  FOR ALL USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owner access only" ON habit_entries
  FOR ALL USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owner access only" ON review_sessions
  FOR ALL USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
```

-----

## 4. APPLICATION STRUCTURE

```
getanchored-app/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── auth/callback/route.ts
│   ├── (app)/
│   │   ├── layout.tsx          ← Authenticated layout with sidebar
│   │   ├── page.tsx            ← Today view (home)
│   │   ├── inbox/page.tsx
│   │   ├── projects/
│   │   │   ├── page.tsx        ← Projects list
│   │   │   └── [id]/page.tsx   ← Project detail with tasks
│   │   ├── habits/page.tsx
│   │   ├── review/page.tsx     ← End-of-day review
│   │   └── settings/page.tsx
│   ├── api/
│   │   └── ... (if needed)
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                     ← shadcn/ui components
│   ├── tasks/
│   │   ├── task-list.tsx
│   │   ├── task-item.tsx
│   │   ├── task-form.tsx
│   │   └── task-status-badge.tsx
│   ├── projects/
│   │   ├── project-list.tsx
│   │   └── project-form.tsx
│   ├── timer/
│   │   ├── stopwatch.tsx
│   │   └── timer-display.tsx
│   ├── habits/
│   │   ├── habit-list.tsx
│   │   ├── habit-checkbox.tsx
│   │   └── streak-display.tsx
│   ├── review/
│   │   ├── inbox-processor.tsx
│   │   └── day-summary.tsx
│   └── layout/
│       ├── sidebar.tsx
│       ├── header.tsx
│       └── mobile-nav.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── hooks/
│   │   ├── use-tasks.ts
│   │   ├── use-projects.ts
│   │   ├── use-timer.ts
│   │   ├── use-habits.ts
│   │   └── use-today.ts
│   ├── stores/
│   │   └── timer-store.ts      ← Zustand store for active timer
│   └── utils/
│       ├── dates.ts
│       └── formatting.ts
├── types/
│   └── database.ts             ← Generated from Supabase
└── ...config files
```

-----

## 5. KEY SCREENS

### 5.1 Today View (Home)

The first screen you see. Shows what matters right now.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ☰  Anchored                                    Saturday, Dec 27       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  TODAY                                                                  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ⏱️ Working on: Design database schema           00:47:23  [Stop] │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  TASKS (3)                                              [+ Add Task]   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ○ Design database schema                    Anchored MVP    ⏱️  │   │
│  │ ○ Set up Supabase project                   Anchored MVP        │   │
│  │ ○ Review contractor proposals               —                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  HABITS                                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ✓ Morning routine                                    🔥 12 days │   │
│  │ ○ Exercise                                           🔥 3 days  │   │
│  │ ✓ Read 30 minutes                                    🔥 7 days  │   │
│  │ ○ Journal                                            —          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│  Inbox: 5 items                                     [Start Review →]   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Interactions:**

- Click task checkbox → mark done
- Click task title → edit task
- Click ⏱️ on task → start timer for that task
- Click habit → toggle completion
- Click “Start Review” → begin end-of-day review

### 5.2 Inbox

Uncategorized tasks waiting to be processed.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Back    INBOX (5)                                    [+ Add Task]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ○ Call dentist                                                   │   │
│  │   [Today] [Anytime] [Project ▼] [Delete]                       │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ ○ Research project management tools                              │   │
│  │   [Today] [Anytime] [Project ▼] [Delete]                       │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ ○ Buy birthday gift for Mom                                      │   │
│  │   [Today] [Anytime] [Project ▼] [Delete]                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│  Quick Add: ________________________________________________  [Add]    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Project Detail

Tasks within a project.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Projects    ANCHORED MVP                              [Edit] [...]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Build personal productivity system                                     │
│                                                                         │
│  TASKS (6)                                              [+ Add Task]   │
│                                                                         │
│  Today                                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ○ Design database schema                              ⏱️ 1h 23m │   │
│  │ ○ Set up Supabase project                                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Anytime                                                                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ○ Build auth flow                                               │   │
│  │ ○ Create task components                                        │   │
│  │ ○ Implement stopwatch                                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Completed                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ✓ Write project scope                                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.4 End-of-Day Review

Guided flow to close out the day.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         END OF DAY REVIEW                               │
│                         Saturday, Dec 27                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  STEP 1 OF 2: CLEAR INBOX                                              │
│  ━━━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ○ Call dentist                                                   │   │
│  │                                                                   │   │
│  │   [Today] [Anytime] [Delete]                                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  2 of 5 remaining                                                       │
│                                                                         │
│                                                         [Skip] [Next]  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         END OF DAY REVIEW                               │
│                         Saturday, Dec 27                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  STEP 2 OF 2: REVIEW TODAY                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━●━━   │
│                                                                         │
│  Completed (2)                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ✓ Design database schema                              ⏱️ 2h 15m │   │
│  │ ✓ Write project scope                                 ⏱️ 1h 30m │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Not Completed (2)                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ○ Review contractor proposals      [→ Tomorrow] [→ Anytime] [Done] │   │
│  │ ○ Update portfolio site            [→ Tomorrow] [→ Anytime] [Done] │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│  Today: 3h 45m tracked | 2 of 4 tasks completed | 3 of 4 habits done  │
│                                                                         │
│                                                    [Complete Review →]  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

-----

## 6. COMPONENT SPECIFICATIONS

### 6.1 Timer Store (Zustand)

```typescript
// lib/stores/timer-store.ts

interface TimerState {
  // Current running timer
  activeEntry: {
    id: string;
    taskId: string;
    taskTitle: string;
    startedAt: Date;
  } | null;
  
  // Computed elapsed time (updates every second)
  elapsedSeconds: number;
  
  // Actions
  startTimer: (taskId: string, taskTitle: string) => Promise<void>;
  stopTimer: () => Promise<void>;
  tick: () => void;
}
```

**Timer Behavior:**

- Only one timer can run at a time
- Starting a new timer stops the current one
- Timer persists across page navigation
- On page load, check for running timer in database
- Tick updates `elapsedSeconds` every second (local calculation, not database)

### 6.2 Habit Streak Calculation

```typescript
// Calculate current streak for a habit

function calculateStreak(entries: HabitEntry[]): number {
  // Sort by date descending
  const sorted = entries
    .filter(e => e.completed)
    .sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date));
  
  if (sorted.length === 0) return 0;
  
  let streak = 0;
  let expectedDate = new Date();
  expectedDate.setHours(0, 0, 0, 0);
  
  // If today isn't completed, start from yesterday
  const todayEntry = sorted.find(e => 
    new Date(e.entry_date).toDateString() === expectedDate.toDateString()
  );
  
  if (!todayEntry) {
    expectedDate.setDate(expectedDate.getDate() - 1);
  }
  
  for (const entry of sorted) {
    const entryDate = new Date(entry.entry_date);
    entryDate.setHours(0, 0, 0, 0);
    
    if (entryDate.getTime() === expectedDate.getTime()) {
      streak++;
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else if (entryDate < expectedDate) {
      break; // Gap in streak
    }
  }
  
  return streak;
}
```

### 6.3 Quick Add Task

Universal task input that parses natural language:

```typescript
// "Call dentist tomorrow" → { title: "Call dentist", due_date: tomorrow }
// "Buy milk #errands" → { title: "Buy milk", project: "errands" }
// "Review docs @anytime" → { title: "Review docs", status: "anytime" }

function parseQuickAdd(input: string): Partial<Task> {
  let title = input;
  let due_date: Date | null = null;
  let status: TaskStatus = 'inbox';
  let project_id: string | null = null;
  
  // Parse "tomorrow", "today"
  if (input.includes(' tomorrow')) {
    title = title.replace(' tomorrow', '');
    due_date = addDays(new Date(), 1);
    status = 'today'; // Will be today when tomorrow comes
  }
  if (input.includes(' today')) {
    title = title.replace(' today', '');
    due_date = new Date();
    status = 'today';
  }
  
  // Parse @anytime, @today
  if (input.includes('@anytime')) {
    title = title.replace('@anytime', '').trim();
    status = 'anytime';
  }
  if (input.includes('@today')) {
    title = title.replace('@today', '').trim();
    status = 'today';
  }
  
  // Parse #project
  const projectMatch = input.match(/#(\w+)/);
  if (projectMatch) {
    title = title.replace(projectMatch[0], '').trim();
    // Look up project by name
    // project_id = findProjectByName(projectMatch[1]);
  }
  
  return { title: title.trim(), due_date, status, project_id };
}
```

-----

## 7. ACCEPTANCE CRITERIA

Phase 1 is complete when:

### Authentication

- [ ] Can sign in with magic link (email)
- [ ] Only owner can access (single-user for now)
- [ ] Session persists across browser sessions

### Projects

- [ ] Can create a project with title and description
- [ ] Can view list of all active projects
- [ ] Can archive/complete a project
- [ ] Can see task count per project

### Tasks

- [ ] Can create a task (title, optional notes, optional project)
- [ ] Can assign task to a project
- [ ] Can change task status (inbox → today → anytime → done)
- [ ] Can set due date
- [ ] Can see tasks grouped by status
- [ ] Can reorder tasks within a status
- [ ] Completing a task records completed_at timestamp

### Time Tracking

- [ ] Can start stopwatch on any task
- [ ] Can stop stopwatch (saves time entry)
- [ ] Only one timer runs at a time
- [ ] Timer visible on all screens while running
- [ ] Can see total time tracked per task
- [ ] Timer survives page refresh

### Habits

- [ ] Can create a habit with title
- [ ] Can see today’s habits on Today view
- [ ] Can check off a habit for today
- [ ] Can see current streak for each habit
- [ ] Habits reset daily (new entry for each day)

### Today View

- [ ] Shows tasks with status “today”
- [ ] Shows today’s habits with completion state
- [ ] Shows active timer if running
- [ ] Shows inbox count with link to process

### End-of-Day Review

- [ ] Can trigger review manually
- [ ] Step 1: Process each inbox item (today/anytime/delete)
- [ ] Step 2: Review incomplete today tasks (tomorrow/anytime/done)
- [ ] Shows summary: time tracked, tasks completed, habits done
- [ ] Saves review completion to database

### Responsive Design

- [ ] Desktop: Sidebar navigation, spacious layout
- [ ] Mobile: Bottom navigation, full-width views
- [ ] Touch-friendly tap targets on mobile

-----

## 8. DEVELOPMENT ORDER

### Week 1: Foundation

1. Set up Next.js project with Tailwind + shadcn/ui
2. Configure Supabase (project, tables, RLS)
3. Implement authentication flow
4. Build layout (sidebar, header, mobile nav)

### Week 2: Tasks & Projects

1. Projects CRUD
2. Tasks CRUD
3. Task status changes
4. Quick add with parsing
5. Project → Task relationship

### Week 3: Timer & Habits

1. Timer store (Zustand)
2. Stopwatch UI component
3. Start/stop timer flow
4. Time entries in database
5. Habits CRUD
6. Habit check-off
7. Streak calculation

### Week 4: Today & Review

1. Today view assembly
2. Inbox view
3. End-of-day review flow
4. Review data storage
5. Polish and bug fixes
6. Mobile responsiveness pass

-----

## 9. OPEN QUESTIONS

Decisions to make during implementation:

1. **Keyboard shortcuts:** Which shortcuts to implement first? (⌘K for command palette? ⌘N for new task?)
2. **Drag and drop:** Use for task reordering? Which library? (dnd-kit is recommended)
3. **Optimistic updates:** How aggressive? (Recommended: all mutations optimistic)
4. **Offline support:** Not in scope, but should we structure for it? (Recommended: no, keep simple)
5. **Sound/notification for timer:** Include in Phase 1? (Recommended: no, defer)
-----
## 10. SUCCESS METRICS

After Week 4, you should be able to:

1. Open Anchored each morning and see what’s on for today
2. Add tasks throughout the day (quick capture)
3. Track time while working on tasks
4. Check off habits as you do them
5. Do a 5-minute end-of-day review
6. Feel like you have a handle on your work

If these feel good, Phase 1 is successful. If something feels wrong, iterate before moving to Phase 2.
***
#documentation
