-- ============================================================================
-- ANCHORED PHASE 1 DATABASE SCHEMA
-- Run this entire script in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. PROJECTS TABLE
-- ============================================================================

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'complete', 'archived', 'cancelled')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_status ON projects(owner_id, status);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can create own projects"
  ON projects FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (owner_id = auth.uid());

-- ============================================================================
-- 2. TASKS TABLE
-- ============================================================================

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  notes TEXT,
  task_location TEXT NOT NULL DEFAULT 'inbox'
    CHECK (task_location IN ('inbox', 'anytime', 'project')),
  status TEXT NOT NULL DEFAULT 'inbox'
    CHECK (status IN ('inbox', 'today', 'anytime', 'done', 'cancel')),
  is_now BOOLEAN NOT NULL DEFAULT false,
  now_slot TEXT
    CHECK (now_slot IN ('primary', 'secondary')),
  next_task BOOLEAN NOT NULL DEFAULT false,
  start_date DATE,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_tasks_owner ON tasks(owner_id);
CREATE INDEX idx_tasks_status ON tasks(owner_id, status);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_due ON tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_tasks_is_now ON tasks(owner_id, is_now);
CREATE INDEX idx_tasks_now_slot ON tasks(owner_id, now_slot);
CREATE INDEX idx_tasks_next_task ON tasks(owner_id, next_task);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own tasks"
  ON tasks FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can create own tasks"
  ON tasks FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own tasks"
  ON tasks FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete own tasks"
  ON tasks FOR DELETE
  USING (owner_id = auth.uid());

-- ============================================================================
-- 3. TIME ENTRIES TABLE (Stopwatch Only)
-- ============================================================================

CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  accumulated_seconds INTEGER NOT NULL DEFAULT 0,
  paused_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Only one running timer at a time per user
CREATE UNIQUE INDEX idx_time_entries_running
  ON time_entries(owner_id)
  WHERE ended_at IS NULL;

-- Other indexes
CREATE INDEX idx_time_entries_task ON time_entries(task_id);
CREATE INDEX idx_time_entries_date ON time_entries(owner_id, started_at);

-- Enable RLS
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own time entries"
  ON time_entries FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can create own time entries"
  ON time_entries FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own time entries"
  ON time_entries FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete own time entries"
  ON time_entries FOR DELETE
  USING (owner_id = auth.uid());

-- ============================================================================
-- 3B. TIME ENTRY SEGMENTS (Pause/Resume)
-- ============================================================================

CREATE TABLE time_entry_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id UUID NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_time_entry_segments_owner ON time_entry_segments(owner_id);
CREATE INDEX idx_time_entry_segments_entry ON time_entry_segments(time_entry_id);
CREATE INDEX idx_time_entry_segments_task ON time_entry_segments(task_id);
CREATE INDEX idx_time_entry_segments_started ON time_entry_segments(started_at);

ALTER TABLE time_entry_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own time entry segments"
  ON time_entry_segments FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can create own time entry segments"
  ON time_entry_segments FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own time entry segments"
  ON time_entry_segments FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete own time entry segments"
  ON time_entry_segments FOR DELETE
  USING (owner_id = auth.uid());

-- ============================================================================
-- 3C. TIME ENTRY DAILY TOTALS
-- ============================================================================

CREATE TABLE time_entry_daily_totals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  total_seconds INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_time_entry_daily_totals_unique
  ON time_entry_daily_totals(owner_id, task_id, entry_date);
CREATE INDEX idx_time_entry_daily_totals_owner
  ON time_entry_daily_totals(owner_id, entry_date);

ALTER TABLE time_entry_daily_totals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own time entry daily totals"
  ON time_entry_daily_totals FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can create own time entry daily totals"
  ON time_entry_daily_totals FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own time entry daily totals"
  ON time_entry_daily_totals FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete own time entry daily totals"
  ON time_entry_daily_totals FOR DELETE
  USING (owner_id = auth.uid());

-- ============================================================================
-- 4. HABITS TABLE
-- ============================================================================

CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_habits_owner ON habits(owner_id);
CREATE INDEX idx_habits_active ON habits(owner_id, active);

-- Enable RLS
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own habits"
  ON habits FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can create own habits"
  ON habits FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own habits"
  ON habits FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete own habits"
  ON habits FOR DELETE
  USING (owner_id = auth.uid());

-- ============================================================================
-- 5. HABIT ENTRIES TABLE
-- ============================================================================

CREATE TABLE habit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- One entry per habit per day
CREATE UNIQUE INDEX idx_habit_entries_unique
  ON habit_entries(habit_id, entry_date);

-- Other indexes
CREATE INDEX idx_habit_entries_owner ON habit_entries(owner_id);
CREATE INDEX idx_habit_entries_date ON habit_entries(owner_id, entry_date);

-- Enable RLS
ALTER TABLE habit_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own habit entries"
  ON habit_entries FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can create own habit entries"
  ON habit_entries FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own habit entries"
  ON habit_entries FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete own habit entries"
  ON habit_entries FOR DELETE
  USING (owner_id = auth.uid());

-- ============================================================================
-- 6. REVIEW SESSIONS TABLE
-- ============================================================================

CREATE TABLE review_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  review_type TEXT NOT NULL DEFAULT 'daily'
    CHECK (review_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'annual')),
  review_date DATE NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- One review per type per day
CREATE UNIQUE INDEX idx_review_sessions_unique
  ON review_sessions(owner_id, review_type, review_date);

-- Other indexes
CREATE INDEX idx_review_sessions_owner ON review_sessions(owner_id);
CREATE INDEX idx_review_sessions_date ON review_sessions(owner_id, review_date);

-- Enable RLS
ALTER TABLE review_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own review sessions"
  ON review_sessions FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can create own review sessions"
  ON review_sessions FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own review sessions"
  ON review_sessions FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete own review sessions"
  ON review_sessions FOR DELETE
  USING (owner_id = auth.uid());

-- ============================================================================
-- 7. UPDATED_AT TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at column
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_habits_updated_at
  BEFORE UPDATE ON habits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. REORDER TASKS RPC FUNCTION
-- ============================================================================

-- Function to atomically update task sort orders
-- Takes an array of objects with id and sort_order
CREATE OR REPLACE FUNCTION reorder_tasks(task_orders JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  task_record JSONB;
  task_id UUID;
  new_order INTEGER;
BEGIN
  -- Loop through each task order in the array
  FOR task_record IN SELECT * FROM jsonb_array_elements(task_orders)
  LOOP
    task_id := (task_record->>'id')::UUID;
    new_order := (task_record->>'sort_order')::INTEGER;

    -- Update only if the user owns this task
    UPDATE tasks
    SET sort_order = new_order, updated_at = now()
    WHERE id = task_id AND owner_id = auth.uid();
  END LOOP;
END;
$$;

-- ============================================================================
-- 9. DOCUMENTS TABLE - Digital Garden Content System
-- ============================================================================

CREATE TABLE documents (
  id TEXT PRIMARY KEY,  -- ULID, generated by application
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  collection TEXT NOT NULL,  -- open text: essays, notes, linked, etc.
  visibility TEXT NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('public', 'personal', 'private')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  body_md TEXT,  -- markdown content
  summary TEXT,  -- optional excerpt/description
  "order" INTEGER,  -- for manual sorting within series (quoted: reserved word)
  metadata JSONB DEFAULT '{}',  -- type-specific fields (medium, author, repo_url, etc.)
  canonical TEXT,
  tags TEXT[],
  date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ  -- set when status becomes published
);

-- Indexes
CREATE INDEX idx_documents_slug ON documents(slug);
CREATE INDEX idx_documents_collection ON documents(collection);
CREATE INDEX idx_documents_visibility ON documents(visibility);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_published_at ON documents(published_at DESC) WHERE published_at IS NOT NULL;
CREATE INDEX idx_documents_collection_status_visibility ON documents(collection, status, visibility);
CREATE INDEX idx_documents_user_collection ON documents(user_id, collection);

-- Constraints
ALTER TABLE documents
  ADD CONSTRAINT documents_user_slug_unique UNIQUE (user_id, slug);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own documents"
  ON documents FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own documents"
  ON documents FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own documents"
  ON documents FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own documents"
  ON documents FOR DELETE
  USING (user_id = auth.uid());

-- Public read access for digital garden
CREATE POLICY "Public can view published public documents"
  ON documents FOR SELECT
  USING (
    visibility = 'public'
    AND status = 'published'
  );

-- Updated_at trigger
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 10. DOCUMENT VERSIONS - Document Snapshots
-- ============================================================================

CREATE TABLE document_versions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  summary TEXT,
  body_md TEXT,
  status TEXT NOT NULL
    CHECK (status IN ('draft', 'published', 'archived')),
  visibility TEXT NOT NULL
    CHECK (visibility IN ('public', 'personal', 'private')),
  collection TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  canonical TEXT,
  tags TEXT[],
  date DATE,
  published_at TIMESTAMPTZ,
  snapshot_reason TEXT NOT NULL
    CHECK (snapshot_reason IN ('manual', 'publish'))
);

CREATE INDEX idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX idx_document_versions_created_at
  ON document_versions(created_at DESC);
CREATE INDEX idx_document_versions_document_id_created_at
  ON document_versions(document_id, created_at DESC);

ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own document versions"
  ON document_versions FOR SELECT
  USING (
    document_id IN (SELECT id FROM documents WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create own document versions"
  ON document_versions FOR INSERT
  WITH CHECK (
    document_id IN (SELECT id FROM documents WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update own document versions"
  ON document_versions FOR UPDATE
  USING (
    document_id IN (SELECT id FROM documents WHERE user_id = auth.uid())
  )
  WITH CHECK (
    document_id IN (SELECT id FROM documents WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete own document versions"
  ON document_versions FOR DELETE
  USING (
    document_id IN (SELECT id FROM documents WHERE user_id = auth.uid())
  );

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================
