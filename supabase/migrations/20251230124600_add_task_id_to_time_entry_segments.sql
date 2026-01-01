ALTER TABLE time_entry_segments
  ADD COLUMN task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;

UPDATE time_entry_segments
SET task_id = time_entries.task_id
FROM time_entries
WHERE time_entry_segments.time_entry_id = time_entries.id
  AND time_entry_segments.task_id IS NULL;

ALTER TABLE time_entry_segments
  ALTER COLUMN task_id SET NOT NULL;

CREATE INDEX idx_time_entry_segments_task ON time_entry_segments(task_id);
