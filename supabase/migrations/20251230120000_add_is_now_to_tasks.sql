ALTER TABLE tasks
  ADD COLUMN is_now BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_tasks_is_now ON tasks(owner_id, is_now);
