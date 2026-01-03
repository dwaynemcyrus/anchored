-- Phase 4: Schedule / Ritual Habits
-- Adds schedule habit type and occurrences table

-- Update habits type constraint to include 'schedule'
ALTER TABLE habits DROP CONSTRAINT IF EXISTS habits_type_check;
ALTER TABLE habits ADD CONSTRAINT habits_type_check
  CHECK (type IN ('avoid', 'quota', 'build', 'schedule'));

-- Add schedule-specific columns to habits table
ALTER TABLE habits ADD COLUMN IF NOT EXISTS schedule_pattern jsonb;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS schedule_timezone text;

-- Add constraint: schedule fields required when type = 'schedule'
ALTER TABLE habits ADD CONSTRAINT habits_schedule_fields_check
  CHECK (
    (type = 'schedule' AND schedule_pattern IS NOT NULL AND schedule_timezone IS NOT NULL)
    OR
    (type != 'schedule' AND schedule_pattern IS NULL AND schedule_timezone IS NULL)
  );

-- Create habit_schedule_occurrences table
CREATE TABLE IF NOT EXISTS habit_schedule_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  local_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'missed', 'skipped')),
  completed_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_schedule_occurrences_habit_date
  ON habit_schedule_occurrences(habit_id, local_date);
CREATE INDEX IF NOT EXISTS idx_schedule_occurrences_user_date
  ON habit_schedule_occurrences(user_id, local_date);

-- Unique constraint: one occurrence per habit per scheduled_at
CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_occurrences_unique
  ON habit_schedule_occurrences(habit_id, scheduled_at);

-- Enable RLS
ALTER TABLE habit_schedule_occurrences ENABLE ROW LEVEL SECURITY;

-- RLS policies for habit_schedule_occurrences
CREATE POLICY "Users can view their own schedule occurrences"
  ON habit_schedule_occurrences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own schedule occurrences"
  ON habit_schedule_occurrences FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own schedule occurrences"
  ON habit_schedule_occurrences FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own schedule occurrences"
  ON habit_schedule_occurrences FOR DELETE
  USING (user_id = auth.uid());
