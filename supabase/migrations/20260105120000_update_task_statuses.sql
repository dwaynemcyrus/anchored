ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_status_check;

ALTER TABLE tasks
  ALTER COLUMN status SET DEFAULT 'backlog';

UPDATE tasks
SET status = 'backlog'
WHERE status = 'inbox';

UPDATE tasks
SET status = 'active'
WHERE status = 'today';

ALTER TABLE tasks
  ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('backlog', 'active', 'waiting', 'anytime', 'done', 'cancel'));
