ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_status_check;

ALTER TABLE tasks
  ALTER COLUMN status SET DEFAULT 'backlog';

UPDATE tasks
SET status = 'pending'
WHERE task_location = 'inbox'
  AND status NOT IN ('done', 'cancel');

ALTER TABLE tasks
  ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('pending', 'backlog', 'active', 'waiting', 'anytime', 'done', 'cancel'));
