-- Phase 3: Build Habits Migration
-- Build habits track minimum commitments per period (day/week/month)

-- Add type column to habits table (covers all habit types)
ALTER TABLE habits ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'build';

-- Add build-specific columns
ALTER TABLE habits ADD COLUMN IF NOT EXISTS build_target numeric NULL;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS build_unit text NULL;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS build_period text NULL;

-- Add check constraints
ALTER TABLE habits ADD CONSTRAINT habits_type_check
  CHECK (type IN ('avoid', 'quota', 'build'));

ALTER TABLE habits ADD CONSTRAINT habits_build_unit_check
  CHECK (build_unit IS NULL OR build_unit IN ('minutes', 'count', 'pages', 'steps', 'reps', 'sessions'));

ALTER TABLE habits ADD CONSTRAINT habits_build_period_check
  CHECK (build_period IS NULL OR build_period IN ('day', 'week', 'month'));

-- Build fields required when type = 'build'
ALTER TABLE habits ADD CONSTRAINT habits_build_fields_check
  CHECK (
    (type != 'build') OR
    (build_target IS NOT NULL AND build_unit IS NOT NULL AND build_period IS NOT NULL)
  );

-- Create habit_build_events table
CREATE TABLE IF NOT EXISTS habit_build_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  local_period_start date NOT NULL,
  local_period_end date NOT NULL,
  amount numeric NOT NULL,
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for habit_build_events
CREATE INDEX IF NOT EXISTS idx_habit_build_events_habit_period
  ON habit_build_events(habit_id, local_period_start);
CREATE INDEX IF NOT EXISTS idx_habit_build_events_user_period
  ON habit_build_events(user_id, local_period_start);

-- Create habit_build_periods cache table
CREATE TABLE IF NOT EXISTS habit_build_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_period_start date NOT NULL,
  local_period_end date NOT NULL,
  total_done numeric NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('incomplete', 'complete')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(habit_id, local_period_start)
);

-- Enable RLS
ALTER TABLE habit_build_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_build_periods ENABLE ROW LEVEL SECURITY;

-- RLS policies for habit_build_events
CREATE POLICY "Users can view own build events"
  ON habit_build_events FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own build events"
  ON habit_build_events FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own build events"
  ON habit_build_events FOR DELETE
  USING (user_id = auth.uid());

-- RLS policies for habit_build_periods
CREATE POLICY "Users can view own build periods"
  ON habit_build_periods FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own build periods"
  ON habit_build_periods FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own build periods"
  ON habit_build_periods FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own build periods"
  ON habit_build_periods FOR DELETE
  USING (user_id = auth.uid());
