ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS outcome TEXT;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS purpose TEXT;

UPDATE projects
SET outcome = ''
WHERE outcome IS NULL;

UPDATE projects
SET purpose = ''
WHERE purpose IS NULL;

ALTER TABLE projects
  ALTER COLUMN outcome SET NOT NULL;

ALTER TABLE projects
  ALTER COLUMN purpose SET NOT NULL;

ALTER TABLE projects
  DROP CONSTRAINT IF EXISTS projects_status_check;

ALTER TABLE projects
  ALTER COLUMN status SET DEFAULT 'backlog';

ALTER TABLE projects
  ADD CONSTRAINT projects_status_check
  CHECK (status IN ('backlog', 'active', 'paused', 'complete', 'archived', 'cancelled'));

ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_status_check;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('inbox', 'today', 'anytime', 'waiting', 'done', 'cancel'));

ALTER TABLE project_activity
  DROP CONSTRAINT IF EXISTS project_activity_action_check;

ALTER TABLE project_activity
  ALTER COLUMN reason DROP NOT NULL;

ALTER TABLE project_activity
  ADD CONSTRAINT project_activity_action_check
  CHECK (action IN ('created', 'active', 'paused', 'cancelled', 'complete', 'archived', 'task_completed', 'task_cancelled'));
