-- ============================================================================
-- UPDATE DOCUMENTS FOR WRITING SURFACE (Phase 2)
-- - Rename content_type -> collection
-- - Update visibility values
-- - Add canonical/tags/date columns
-- - Add document_versions table
-- ============================================================================

-- Rename column for collections
ALTER TABLE documents
  RENAME COLUMN content_type TO collection;

COMMENT ON COLUMN documents.collection IS 'open text: essays, notes, linked, etc.';

-- Map legacy visibility values to new set
UPDATE documents
SET visibility = 'personal'
WHERE visibility IN ('supporter', '1v1');

-- Update visibility constraint
ALTER TABLE documents
  DROP CONSTRAINT IF EXISTS documents_visibility_check;

ALTER TABLE documents
  ADD CONSTRAINT documents_visibility_check
  CHECK (visibility IN ('public', 'personal', 'private'));

-- Map legacy collection values to new set
UPDATE documents
SET collection = CASE
  WHEN collection IN ('essays', 'principles', 'projects') THEN 'essays'
  WHEN collection IN ('linked') THEN 'linked'
  WHEN collection IN ('fragments', 'poetry') THEN 'notes'
  ELSE 'notes'
END;

-- Add new columns for editor metadata
ALTER TABLE documents
  ADD COLUMN canonical TEXT,
  ADD COLUMN tags TEXT[],
  ADD COLUMN date DATE;

-- Rebuild indexes for collection rename
DROP INDEX IF EXISTS idx_documents_content_type;
DROP INDEX IF EXISTS idx_documents_type_status_visibility;
DROP INDEX IF EXISTS idx_documents_user_type;

CREATE INDEX idx_documents_collection ON documents(collection);
CREATE INDEX idx_documents_collection_status_visibility
  ON documents(collection, status, visibility);
CREATE INDEX idx_documents_user_collection ON documents(user_id, collection);

-- ============================================================================
-- DOCUMENT VERSIONS (SNAPSHOTS)
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
