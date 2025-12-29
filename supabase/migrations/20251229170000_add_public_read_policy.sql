-- ============================================================================
-- ADD PUBLIC READ POLICY FOR DIGITAL GARDEN
-- Allows anonymous access to public, published documents
-- ============================================================================

-- Policy for public read access
CREATE POLICY "Public can view published public documents"
  ON documents FOR SELECT
  USING (
    visibility = 'public'
    AND status = 'published'
  );
