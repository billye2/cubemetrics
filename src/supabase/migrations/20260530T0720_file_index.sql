-- File Index graduates off the shared `checklists` table into its own catalog
-- model. A file-index entry is metadata for retrieval (where a file/document/disk
-- lives), never a task to "check off". The point is search + filter across
-- name / location / type / tags / description.
CREATE TABLE IF NOT EXISTS public.file_index (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  type TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  size_bytes BIGINT,
  file_date DATE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.file_index ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access own file_index" ON public.file_index;
CREATE POLICY "Users can access own file_index" ON public.file_index FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "SysOp read access" ON public.file_index;
CREATE POLICY "SysOp read access" ON public.file_index FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sysop'));

CREATE INDEX IF NOT EXISTS file_index_user_idx ON public.file_index (user_id, created_at DESC);
