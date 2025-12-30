DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'tasks'
      AND column_name = 'action_location'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'tasks'
      AND column_name = 'task_location'
  ) THEN
    ALTER TABLE tasks RENAME COLUMN action_location TO task_location;
  END IF;
END $$;
