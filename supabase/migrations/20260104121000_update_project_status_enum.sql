ALTER TABLE projects
  DROP CONSTRAINT IF EXISTS projects_status_check;

UPDATE projects
SET status = 'complete'
WHERE status = 'completed';

ALTER TABLE projects
  ADD CONSTRAINT projects_status_check
  CHECK (status IN ('active', 'paused', 'complete', 'archived', 'cancelled'));
