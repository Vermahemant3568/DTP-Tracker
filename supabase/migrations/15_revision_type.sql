-- ================================================================
-- 15. Add revision_type to task_revisions
-- Run in Supabase SQL Editor
-- ================================================================

ALTER TABLE task_revisions
  ADD COLUMN IF NOT EXISTS revision_type TEXT NOT NULL DEFAULT 'General'
    CHECK (revision_type IN ('General', 'Client', 'QA', 'Proofreading', 'Internal'));

CREATE INDEX IF NOT EXISTS idx_task_revisions_type ON task_revisions(revision_type);
