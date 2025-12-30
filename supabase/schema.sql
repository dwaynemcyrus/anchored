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
    CHECK (status IN ('active', 'completed', 'archived')),
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
    CHECK (status IN ('inbox', 'today', 'anytime', 'done')),
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
  content_type TEXT NOT NULL,  -- open text: principles, essays, fragments, projects, poetry, artwork, books, etc.
  visibility TEXT NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('public', 'supporter', '1v1', 'private')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  body_md TEXT,  -- markdown content
  summary TEXT,  -- optional excerpt/description
  "order" INTEGER,  -- for manual sorting within series (quoted: reserved word)
  metadata JSONB DEFAULT '{}',  -- type-specific fields (medium, author, repo_url, etc.)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ  -- set when status becomes published
);

-- Indexes
CREATE INDEX idx_documents_slug ON documents(slug);
CREATE INDEX idx_documents_content_type ON documents(content_type);
CREATE INDEX idx_documents_visibility ON documents(visibility);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_published_at ON documents(published_at DESC) WHERE published_at IS NOT NULL;
CREATE INDEX idx_documents_type_status_visibility ON documents(content_type, status, visibility);
CREATE INDEX idx_documents_user_type ON documents(user_id, content_type);

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
-- SCHEMA COMPLETE
-- ============================================================================
