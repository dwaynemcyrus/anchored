ALTER TABLE time_entries
  ADD COLUMN accumulated_seconds INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN paused_at TIMESTAMPTZ;
