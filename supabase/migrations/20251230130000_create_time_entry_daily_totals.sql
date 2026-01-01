CREATE TABLE time_entry_daily_totals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  total_seconds INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_time_entry_daily_totals_unique
  ON time_entry_daily_totals(owner_id, task_id, entry_date);
CREATE INDEX idx_time_entry_daily_totals_owner
  ON time_entry_daily_totals(owner_id, entry_date);

ALTER TABLE time_entry_daily_totals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own time entry daily totals"
  ON time_entry_daily_totals FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can create own time entry daily totals"
  ON time_entry_daily_totals FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own time entry daily totals"
  ON time_entry_daily_totals FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete own time entry daily totals"
  ON time_entry_daily_totals FOR DELETE
  USING (owner_id = auth.uid());
