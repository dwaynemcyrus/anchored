CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_documents_title_trgm
  ON documents USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_documents_body_trgm
  ON documents USING GIN (body_md gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_tasks_title_trgm
  ON tasks USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tasks_notes_trgm
  ON tasks USING GIN (notes gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_projects_title_trgm
  ON projects USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_projects_purpose_trgm
  ON projects USING GIN (purpose gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_projects_outcome_trgm
  ON projects USING GIN (outcome gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.search_all(
  search_query TEXT,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  result_id TEXT,
  result_type TEXT,
  title TEXT,
  snippet TEXT,
  updated_at TIMESTAMPTZ,
  score REAL
)
LANGUAGE sql
SECURITY INVOKER
AS $$
WITH q AS (
  SELECT trim(search_query) AS term
)
SELECT *
FROM (
  SELECT
    d.id::text AS result_id,
    'document' AS result_type,
    d.title,
    COALESCE(NULLIF(d.summary, ''), LEFT(d.body_md, 160), '') AS snippet,
    d.updated_at,
    GREATEST(
      similarity(d.title, q.term),
      similarity(COALESCE(d.body_md, ''), q.term)
    ) AS score
  FROM documents d, q
  WHERE d.user_id = auth.uid()
    AND q.term <> ''
    AND (d.title % q.term OR COALESCE(d.body_md, '') % q.term)

  UNION ALL

  SELECT
    t.id::text AS result_id,
    'task' AS result_type,
    t.title,
    COALESCE(LEFT(t.notes, 160), '') AS snippet,
    t.updated_at,
    GREATEST(
      similarity(t.title, q.term),
      similarity(COALESCE(t.notes, ''), q.term)
    ) AS score
  FROM tasks t, q
  WHERE t.owner_id = auth.uid()
    AND q.term <> ''
    AND (t.title % q.term OR COALESCE(t.notes, '') % q.term)

  UNION ALL

  SELECT
    p.id::text AS result_id,
    'project' AS result_type,
    p.title,
    COALESCE(LEFT(p.purpose, 160), LEFT(p.outcome, 160), '') AS snippet,
    p.updated_at,
    GREATEST(
      similarity(p.title, q.term),
      similarity(COALESCE(p.purpose, ''), q.term),
      similarity(COALESCE(p.outcome, ''), q.term)
    ) AS score
  FROM projects p, q
  WHERE p.owner_id = auth.uid()
    AND q.term <> ''
    AND (p.title % q.term OR COALESCE(p.purpose, '') % q.term OR COALESCE(p.outcome, '') % q.term)
) results
ORDER BY score DESC, updated_at DESC
LIMIT limit_count;
$$;
