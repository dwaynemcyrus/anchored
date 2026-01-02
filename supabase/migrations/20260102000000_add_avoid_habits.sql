-- Phase 1: Avoid Habits
-- Extends the habit system with type-specific tracking for "avoid" habits
-- Avoid habits track absence (clean days) rather than completion

-- ============================================
-- EXTEND HABITS TABLE
-- ============================================

-- Add type column (existing habits default to 'build' for backward compatibility)
ALTER TABLE habits ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'build';

-- Add timezone for local date calculations
ALTER TABLE habits ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/New_York';

-- Add type constraint (will expand in future phases)
ALTER TABLE habits ADD CONSTRAINT habits_type_check
  CHECK (type IN ('avoid', 'build'));

-- ============================================
-- HABIT SLIPS TABLE (Avoid Habit Events)
-- ============================================
-- Source of truth for avoid habits. A slip = a violation of the habit.
-- A day with ANY slips is considered "slipped"

CREATE TABLE IF NOT EXISTS habit_slips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  local_date DATE NOT NULL,
  severity SMALLINT NULL CHECK (severity BETWEEN 1 AND 3),
  note TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_habit_slips_habit_date ON habit_slips(habit_id, local_date);
CREATE INDEX IF NOT EXISTS idx_habit_slips_owner ON habit_slips(owner_id);

-- ============================================
-- HABIT DAYS TABLE (Cached Day State)
-- ============================================
-- Derived/cached state per day for avoid habits
-- status: 'clean' (default/no slips), 'slipped' (has slips), 'excluded' (user excluded)

CREATE TABLE IF NOT EXISTS habit_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'clean' CHECK (status IN ('clean', 'slipped', 'excluded')),
  note TEXT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(habit_id, local_date)
);

-- Index for efficient calendar queries
CREATE INDEX IF NOT EXISTS idx_habit_days_habit_date ON habit_days(habit_id, local_date);
CREATE INDEX IF NOT EXISTS idx_habit_days_owner ON habit_days(owner_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on new tables
ALTER TABLE habit_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_days ENABLE ROW LEVEL SECURITY;

-- Policies for habit_slips
CREATE POLICY "Users can view own habit slips"
  ON habit_slips FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can create own habit slips"
  ON habit_slips FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own habit slips"
  ON habit_slips FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete own habit slips"
  ON habit_slips FOR DELETE
  USING (owner_id = auth.uid());

-- Policies for habit_days
CREATE POLICY "Users can view own habit days"
  ON habit_days FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can create own habit days"
  ON habit_days FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own habit days"
  ON habit_days FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete own habit days"
  ON habit_days FOR DELETE
  USING (owner_id = auth.uid());

-- ============================================
-- INDEXES FOR HABITS TABLE
-- ============================================

-- Index for filtering by type
CREATE INDEX IF NOT EXISTS idx_habits_type ON habits(owner_id, type) WHERE deleted_at IS NULL;

-- Index for active avoid habits
CREATE INDEX IF NOT EXISTS idx_habits_avoid_active ON habits(owner_id)
  WHERE type = 'avoid' AND active = true AND deleted_at IS NULL;
