-- Add next task flag for end-of-day review flow

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS next_task boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_tasks_next_task
  ON tasks(owner_id, next_task);
