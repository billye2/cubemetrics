-- The classic BBS feedback wall let any logged-in user read all feedback.
-- The modern UI uses an admin-only review flow (service-role client), so
-- the public-read policy is no longer wanted and would leak feedback bodies
-- between users.
DROP POLICY IF EXISTS "Public can read all feedback" ON public.user_feedback;
