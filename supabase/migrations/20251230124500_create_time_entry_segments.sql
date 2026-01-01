CREATE TABLE time_entry_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id UUID NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_time_entry_segments_owner ON time_entry_segments(owner_id);
CREATE INDEX idx_time_entry_segments_entry ON time_entry_segments(time_entry_id);
CREATE INDEX idx_time_entry_segments_task ON time_entry_segments(task_id);
CREATE INDEX idx_time_entry_segments_started ON time_entry_segments(started_at);

ALTER TABLE time_entry_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own time entry segments"
  ON time_entry_segments FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can create own time entry segments"
  ON time_entry_segments FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own time entry segments"
  ON time_entry_segments FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete own time entry segments"
  ON time_entry_segments FOR DELETE
  USING (owner_id = auth.uid());

INSERT INTO time_entry_segments (
  time_entry_id,
  owner_id,
  task_id,
  started_at,
  ended_at,
  duration_seconds
)
SELECT
  id,
  owner_id,
  task_id,
  started_at,
  ended_at,
  duration_seconds
FROM time_entries;
