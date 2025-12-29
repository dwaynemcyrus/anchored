# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Anchored** (getanchored.app) is a personal productivity OS that serves as the canonical authoring environment for the broader Dwayne M. Cyrus platform. It handles tasks, time tracking, habits, journals, content authoring, and session management for mentorship.

### Platform Context

Anchored is one of four interconnected surfaces:
- **getanchored.app** (this repo) — Next.js personal OS, source of all authored content
- **dwaynemcyrus.com** — Astro static digital garden, reads from Supabase
- **voyagers.dwaynemcyrus.com** — Next.js client portal for mentorship
- **prints.dwaynemcyrus.com** — Print-on-demand storefront

**Core principle:** Supabase is the source of truth. Git serves as nightly backup for portability.

## Tech Stack

| Layer     | Choice                   |
|-----------|--------------------------|
| Framework | Next.js 14+ (App Router) |
| Styling   | Tailwind CSS + shadcn/ui |
| Database  | Supabase (PostgreSQL)    |
| Hosting   | Vercel                   |
| State     | React Query + Zustand    |

## Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Generate Supabase types
npx supabase gen types typescript --project-id <project-id> > types/database.ts
```

## Architecture

### Application Structure

```
getanchored-app/
├── app/
│   ├── (auth)/           # Login, auth callback
│   ├── (app)/            # Authenticated routes with sidebar
│   │   ├── page.tsx      # Today view (home)
│   │   ├── inbox/
│   │   ├── projects/[id]/
│   │   ├── habits/
│   │   ├── review/       # End-of-day review
│   │   └── settings/
│   └── api/
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── tasks/
│   ├── projects/
│   ├── timer/
│   ├── habits/
│   ├── review/
│   └── layout/
├── lib/
│   ├── supabase/         # client.ts, server.ts, middleware.ts
│   ├── hooks/            # use-tasks, use-projects, use-timer, use-habits
│   ├── stores/           # Zustand stores (timer-store.ts)
│   └── utils/
└── types/
    └── database.ts       # Generated from Supabase
```

### State Management Pattern

- **React Query:** Server state, caching, optimistic updates for Supabase data
- **Zustand:** Local UI state (active timer, sidebar state)

### Timer Behavior

- Only one timer can run at a time (enforced by unique partial index)
- Starting a new timer stops the current one
- Timer persists across page navigation via database check on load
- `elapsedSeconds` updates locally every second (not database writes)

### Task Status Flow

Tasks have four statuses: `inbox` → `today` → `anytime` → `done`

### Habit Streak Calculation

Streaks count consecutive days completed. If today isn't completed, counting starts from yesterday.

## Database Schema (Phase 1)

Six core tables with owner-based Row Level Security:
- **projects** — title, description, status (active/completed/archived)
- **tasks** — title, notes, status, due_date, project_id, completed_at
- **time_entries** — task_id, started_at, ended_at, duration_seconds (unique partial index on owner where ended_at IS NULL)
- **habits** — title, description, active
- **habit_entries** — habit_id, entry_date, completed (unique per habit per day)
- **review_sessions** — review_type, review_date, data (JSONB)

All tables include `owner_id` referencing `auth.users` with RLS policies: `owner_id = auth.uid()`.

## Key Implementation Notes

- shadcn/ui components are copy-pasted, not npm dependencies — customize freely
- Quick add supports natural language: `@today`, `@anytime`, `#project`, `tomorrow`
- End-of-day review has two steps: (1) process inbox, (2) review incomplete today tasks
- Single-user app initially; owner is the only authenticated user
