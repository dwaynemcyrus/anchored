DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'tasks'
      AND column_name = 'task_location'
  ) THEN
    ALTER TABLE tasks ADD COLUMN task_location text;
  END IF;
END $$;

UPDATE tasks
SET task_location = CASE
  WHEN project_id IS NOT NULL THEN 'project'
  WHEN status = 'anytime' THEN 'anytime'
  ELSE 'inbox'
END
WHERE task_location IS NULL;

ALTER TABLE tasks
  ALTER COLUMN task_location SET DEFAULT 'inbox',
  ALTER COLUMN task_location SET NOT NULL;
