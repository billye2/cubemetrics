-- Job Application tracker. Each row is a role you're pursuing, moving through a
-- pipeline stage: saved -> applied -> interview -> offer (or rejected).
-- applied_on is stamped the first time the stage advances past 'saved'.
CREATE TABLE IF NOT EXISTS public.job_applications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  role TEXT DEFAULT '',
  stage TEXT NOT NULL DEFAULT 'saved',
  applied_on DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own rows" ON public.job_applications FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "SysOp read access" ON public.job_applications FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sysop'));

CREATE INDEX IF NOT EXISTS job_applications_user_idx ON public.job_applications (user_id, stage);
