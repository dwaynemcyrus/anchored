-- Phase 2: Quota Habits
-- Extends the habit system to support quota/allowance tracking

-- ============================================
-- 1. EXTEND HABITS TABLE
-- ============================================

-- Update type check to include 'quota'
ALTER TABLE habits DROP CONSTRAINT IF EXISTS habits_type_check;
ALTER TABLE habits ADD CONSTRAINT habits_type_check
  CHECK (type IN ('avoid', 'quota', 'build', 'schedule'));

-- Add quota-specific columns
ALTER TABLE habits ADD COLUMN IF NOT EXISTS quota_amount numeric NULL;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS quota_unit text NULL;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS quota_period text NULL;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS near_threshold_percent smallint NOT NULL DEFAULT 80;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS allow_soft_over boolean NOT NULL DEFAULT false;

-- Add check constraints for quota fields
ALTER TABLE habits ADD CONSTRAINT habits_quota_unit_check
  CHECK (quota_unit IS NULL OR quota_unit IN ('minutes', 'count', 'grams', 'units', 'currency'));

ALTER TABLE habits ADD CONSTRAINT habits_quota_period_check
  CHECK (quota_period IS NULL OR quota_period IN ('day', 'week', 'month'));

-- Ensure quota fields are set when type = 'quota'
ALTER TABLE habits ADD CONSTRAINT habits_quota_fields_required
  CHECK (
    (type != 'quota') OR
    (quota_amount IS NOT NULL AND quota_unit IS NOT NULL AND quota_period IS NOT NULL)
  );

-- Ensure quota fields are null when type = 'avoid'
ALTER TABLE habits ADD CONSTRAINT habits_avoid_no_quota_fields
  CHECK (
    (type != 'avoid') OR
    (quota_amount IS NULL AND quota_unit IS NULL AND quota_period IS NULL)
  );

-- ============================================
-- 2. CREATE HABIT_USAGE_EVENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS habit_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  local_period_start date NOT NULL,
  local_period_end date NOT NULL,
  amount numeric NOT NULL,
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS habit_usage_events_habit_period_idx
  ON habit_usage_events(habit_id, local_period_start);
CREATE INDEX IF NOT EXISTS habit_usage_events_owner_period_idx
  ON habit_usage_events(owner_id, local_period_start);

-- ============================================
-- 3. CREATE HABIT_PERIODS CACHE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS habit_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_period_start date NOT NULL,
  local_period_end date NOT NULL,
  total_used numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'under',
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT habit_periods_status_check CHECK (status IN ('under', 'near', 'over')),
  CONSTRAINT habit_periods_unique_habit_period UNIQUE (habit_id, local_period_start)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS habit_periods_owner_idx
  ON habit_periods(owner_id);

-- ============================================
-- 4. ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on new tables
ALTER TABLE habit_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_periods ENABLE ROW LEVEL SECURITY;

-- habit_usage_events policies
CREATE POLICY "Users can view own usage events"
  ON habit_usage_events FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can insert own usage events"
  ON habit_usage_events FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own usage events"
  ON habit_usage_events FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete own usage events"
  ON habit_usage_events FOR DELETE
  USING (owner_id = auth.uid());

-- habit_periods policies
CREATE POLICY "Users can view own periods"
  ON habit_periods FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can insert own periods"
  ON habit_periods FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own periods"
  ON habit_periods FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete own periods"
  ON habit_periods FOR DELETE
  USING (owner_id = auth.uid());
