CREATE TABLE IF NOT EXISTS project_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('paused', 'cancelled')),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_activity_project ON project_activity(project_id);
CREATE INDEX IF NOT EXISTS idx_project_activity_owner ON project_activity(owner_id);

ALTER TABLE project_activity ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own project activity"
    ON project_activity FOR SELECT
    USING (owner_id = auth.uid());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create own project activity"
    ON project_activity FOR INSERT
    WITH CHECK (owner_id = auth.uid());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
