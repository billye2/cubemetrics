-- Extend user_feedback for the per-app feedback button and the
-- review -> GitHub issue ("@claude") workflow.
--
-- status now flows:
--   'new'      -> awaiting admin review (default)
--   'approved' -> a GitHub issue was opened (github_issue_* populated)
--   'rejected' -> dismissed by admin
ALTER TABLE public.user_feedback
  ADD COLUMN IF NOT EXISTS app_id TEXT,
  ADD COLUMN IF NOT EXISTS github_issue_number INTEGER,
  ADD COLUMN IF NOT EXISTS github_issue_url TEXT;

COMMENT ON COLUMN public.user_feedback.app_id IS 'Catalog app/door id this feedback is about (null = general)';
COMMENT ON COLUMN public.user_feedback.status IS 'new | approved | rejected';

-- Admin review reads/writes go through the service-role client (which
-- bypasses RLS), so the existing "manage own feedback" policy is unchanged.
