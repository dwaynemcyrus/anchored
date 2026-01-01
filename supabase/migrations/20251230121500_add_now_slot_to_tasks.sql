ALTER TABLE tasks
  ADD COLUMN now_slot TEXT
  CHECK (now_slot IN ('primary', 'secondary'));

CREATE INDEX idx_tasks_now_slot ON tasks(owner_id, now_slot);

UPDATE tasks
SET now_slot = 'primary'
WHERE is_now = true AND now_slot IS NULL;
