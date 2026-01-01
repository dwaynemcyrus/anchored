-- Add logbook fields for soft delete and completion tracking
-- Tasks: deleted_at, deleted_reason, deleted_parent_id
-- Projects: completed_at, deleted_at
-- Habits: deleted_at

-- ============================================
-- TASKS TABLE
-- ============================================

-- Add deleted_at for soft delete
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- Add deleted_reason to track why task was deleted
-- 'user_deleted' = user explicitly deleted
-- 'project_deleted' = cascade from project deletion
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_reason TEXT NULL;

-- Add deleted_parent_id to track which project caused cascade delete
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_parent_id UUID NULL REFERENCES projects(id) ON DELETE SET NULL;

-- Add constraint for deleted_reason values
ALTER TABLE tasks ADD CONSTRAINT tasks_deleted_reason_check
  CHECK (deleted_reason IS NULL OR deleted_reason IN ('user_deleted', 'project_deleted'));

-- ============================================
-- PROJECTS TABLE
-- ============================================

-- Add completed_at for project completion tracking
ALTER TABLE projects ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ NULL;

-- Add deleted_at for soft delete
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- ============================================
-- HABITS TABLE
-- ============================================

-- Add deleted_at for soft delete
ALTER TABLE habits ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- ============================================
-- INDEXES
-- ============================================

-- Indexes for logbook queries (completed items)
CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks(completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_completed_at ON projects(completed_at) WHERE completed_at IS NOT NULL;

-- Indexes for logbook queries (deleted items)
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_habits_deleted_at ON habits(deleted_at) WHERE deleted_at IS NOT NULL;

-- Partial indexes for active items (optimize normal queries)
CREATE INDEX IF NOT EXISTS idx_tasks_active ON tasks(owner_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_projects_active ON projects(owner_id)
  WHERE completed_at IS NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_habits_active ON habits(owner_id)
  WHERE deleted_at IS NULL;

-- Index for cascade restore queries
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_parent ON tasks(deleted_parent_id)
  WHERE deleted_parent_id IS NOT NULL;
