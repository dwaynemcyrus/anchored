-- ============================================================================
-- GUEST ACCESS: Allow anonymous users to access owner's data
-- ============================================================================
--
-- BEFORE RUNNING: Replace f00d2ca8-4a71-459d-900d-58020bb1bf83 with your actual user UUID.
--
-- To find your UUID, run this query in Supabase SQL Editor:
--   SELECT id FROM auth.users WHERE email = 'cyrusdwayne@icloud.com';
--
-- ============================================================================

-- Store owner UUID in a variable for reuse
DO $$
DECLARE
  owner_uuid UUID := 'f00d2ca8-4a71-459d-900d-58020bb1bf83';
BEGIN
  -- Verify the UUID exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = owner_uuid) THEN
    RAISE EXCEPTION 'Owner UUID not found. Please replace f00d2ca8-4a71-459d-900d-58020bb1bf83 with your actual UUID.';
  END IF;
END $$;

-- ============================================================================
-- PROJECTS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can create own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;

CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83');

CREATE POLICY "Users can create own projects"
  ON projects FOR INSERT
  WITH CHECK (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83');

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83')
  WITH CHECK (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83');

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83');

-- ============================================================================
-- PROJECT ACTIVITY
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own project activity" ON project_activity;
DROP POLICY IF EXISTS "Users can create own project activity" ON project_activity;

CREATE POLICY "Users can view own project activity"
  ON project_activity FOR SELECT
  USING (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83');

CREATE POLICY "Users can create own project activity"
  ON project_activity FOR INSERT
  WITH CHECK (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83');

-- ============================================================================
-- TASKS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can create own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;

CREATE POLICY "Users can view own tasks"
  ON tasks FOR SELECT
  USING (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83');

CREATE POLICY "Users can create own tasks"
  ON tasks FOR INSERT
  WITH CHECK (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83');

CREATE POLICY "Users can update own tasks"
  ON tasks FOR UPDATE
  USING (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83')
  WITH CHECK (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83');

CREATE POLICY "Users can delete own tasks"
  ON tasks FOR DELETE
  USING (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83');

-- ============================================================================
-- TIME ENTRIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can create own time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can update own time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can delete own time entries" ON time_entries;

CREATE POLICY "Users can view own time entries"
  ON time_entries FOR SELECT
  USING (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83');

CREATE POLICY "Users can create own time entries"
  ON time_entries FOR INSERT
  WITH CHECK (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83');

CREATE POLICY "Users can update own time entries"
  ON time_entries FOR UPDATE
  USING (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83')
  WITH CHECK (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83');

CREATE POLICY "Users can delete own time entries"
  ON time_entries FOR DELETE
  USING (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83');

-- ============================================================================
-- TIME ENTRY SEGMENTS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own time entry segments" ON time_entry_segments;
DROP POLICY IF EXISTS "Users can create own time entry segments" ON time_entry_segments;
DROP POLICY IF EXISTS "Users can update own time entry segments" ON time_entry_segments;
DROP POLICY IF EXISTS "Users can delete own time entry segments" ON time_entry_segments;

CREATE POLICY "Users can view own time entry segments"
  ON time_entry_segments FOR SELECT
  USING (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83');

CREATE POLICY "Users can create own time entry segments"
  ON time_entry_segments FOR INSERT
  WITH CHECK (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83');

CREATE POLICY "Users can update own time entry segments"
  ON time_entry_segments FOR UPDATE
  USING (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83')
  WITH CHECK (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83');

CREATE POLICY "Users can delete own time entry segments"
  ON time_entry_segments FOR DELETE
  USING (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83');

-- ============================================================================
-- TIME ENTRY DAILY TOTALS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own time entry daily totals" ON time_entry_daily_totals;
DROP POLICY IF EXISTS "Users can create own time entry daily totals" ON time_entry_daily_totals;
DROP POLICY IF EXISTS "Users can update own time entry daily totals" ON time_entry_daily_totals;
DROP POLICY IF EXISTS "Users can delete own time entry daily totals" ON time_entry_daily_totals;

CREATE POLICY "Users can view own time entry daily totals"
  ON time_entry_daily_totals FOR SELECT
  USING (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83');

CREATE POLICY "Users can create own time entry daily totals"
  ON time_entry_daily_totals FOR INSERT
  WITH CHECK (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83');

CREATE POLICY "Users can update own time entry daily totals"
  ON time_entry_daily_totals FOR UPDATE
  USING (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83')
  WITH CHECK (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83');

CREATE POLICY "Users can delete own time entry daily totals"
  ON time_entry_daily_totals FOR DELETE
  USING (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83');

-- ============================================================================
-- HABITS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own habits" ON habits;
DROP POLICY IF EXISTS "Users can create own habits" ON habits;
DROP POLICY IF EXISTS "Users can update own habits" ON habits;
DROP POLICY IF EXISTS "Users can delete own habits" ON habits;

CREATE POLICY "Users can view own habits"
  ON habits FOR SELECT
  USING (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83');

CREATE POLICY "Users can create own habits"
  ON habits FOR INSERT
  WITH CHECK (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83');

CREATE POLICY "Users can update own habits"
  ON habits FOR UPDATE
  USING (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83')
  WITH CHECK (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83');

CREATE POLICY "Users can delete own habits"
  ON habits FOR DELETE
  USING (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83');

-- ============================================================================
-- HABIT ENTRIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own habit entries" ON habit_entries;
DROP POLICY IF EXISTS "Users can create own habit entries" ON habit_entries;
DROP POLICY IF EXISTS "Users can update own habit entries" ON habit_entries;
DROP POLICY IF EXISTS "Users can delete own habit entries" ON habit_entries;

CREATE POLICY "Users can view own habit entries"
  ON habit_entries FOR SELECT
  USING (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83');

CREATE POLICY "Users can create own habit entries"
  ON habit_entries FOR INSERT
  WITH CHECK (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83');

CREATE POLICY "Users can update own habit entries"
  ON habit_entries FOR UPDATE
  USING (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83')
  WITH CHECK (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83');

CREATE POLICY "Users can delete own habit entries"
  ON habit_entries FOR DELETE
  USING (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83');

-- ============================================================================
-- REVIEW SESSIONS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own review sessions" ON review_sessions;
DROP POLICY IF EXISTS "Users can create own review sessions" ON review_sessions;
DROP POLICY IF EXISTS "Users can update own review sessions" ON review_sessions;
DROP POLICY IF EXISTS "Users can delete own review sessions" ON review_sessions;

CREATE POLICY "Users can view own review sessions"
  ON review_sessions FOR SELECT
  USING (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83');

CREATE POLICY "Users can create own review sessions"
  ON review_sessions FOR INSERT
  WITH CHECK (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83');

CREATE POLICY "Users can update own review sessions"
  ON review_sessions FOR UPDATE
  USING (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83')
  WITH CHECK (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83');

CREATE POLICY "Users can delete own review sessions"
  ON review_sessions FOR DELETE
  USING (owner_id = auth.uid() OR owner_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83');

-- ============================================================================
-- DOCUMENTS (uses user_id instead of owner_id)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own documents" ON documents;
DROP POLICY IF EXISTS "Users can create own documents" ON documents;
DROP POLICY IF EXISTS "Users can update own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON documents;
-- Keep the public read policy intact

CREATE POLICY "Users can view own documents"
  ON documents FOR SELECT
  USING (user_id = auth.uid() OR user_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83');

CREATE POLICY "Users can create own documents"
  ON documents FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83');

CREATE POLICY "Users can update own documents"
  ON documents FOR UPDATE
  USING (user_id = auth.uid() OR user_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83')
  WITH CHECK (user_id = auth.uid() OR user_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83');

CREATE POLICY "Users can delete own documents"
  ON documents FOR DELETE
  USING (user_id = auth.uid() OR user_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83');

-- ============================================================================
-- DOCUMENT VERSIONS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own document versions" ON document_versions;
DROP POLICY IF EXISTS "Users can create own document versions" ON document_versions;
DROP POLICY IF EXISTS "Users can update own document versions" ON document_versions;
DROP POLICY IF EXISTS "Users can delete own document versions" ON document_versions;

CREATE POLICY "Users can view own document versions"
  ON document_versions FOR SELECT
  USING (
    document_id IN (SELECT id FROM documents WHERE user_id = auth.uid() OR user_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83')
  );

CREATE POLICY "Users can create own document versions"
  ON document_versions FOR INSERT
  WITH CHECK (
    document_id IN (SELECT id FROM documents WHERE user_id = auth.uid() OR user_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83')
  );

CREATE POLICY "Users can update own document versions"
  ON document_versions FOR UPDATE
  USING (
    document_id IN (SELECT id FROM documents WHERE user_id = auth.uid() OR user_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83')
  )
  WITH CHECK (
    document_id IN (SELECT id FROM documents WHERE user_id = auth.uid() OR user_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83')
  );

CREATE POLICY "Users can delete own document versions"
  ON document_versions FOR DELETE
  USING (
    document_id IN (SELECT id FROM documents WHERE user_id = auth.uid() OR user_id = 'f00d2ca8-4a71-459d-900d-58020bb1bf83')
  );

-- ============================================================================
-- UPDATE reorder_tasks FUNCTION to allow guest access
-- ============================================================================

CREATE OR REPLACE FUNCTION reorder_tasks(task_orders JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  task_record JSONB;
  task_id UUID;
  new_order INTEGER;
  allowed_owner UUID := 'f00d2ca8-4a71-459d-900d-58020bb1bf83';
BEGIN
  FOR task_record IN SELECT * FROM jsonb_array_elements(task_orders)
  LOOP
    task_id := (task_record->>'id')::UUID;
    new_order := (task_record->>'sort_order')::INTEGER;

    UPDATE tasks
    SET sort_order = new_order, updated_at = now()
    WHERE id = task_id AND (owner_id = auth.uid() OR owner_id = allowed_owner);
  END LOOP;
END;
$$;
