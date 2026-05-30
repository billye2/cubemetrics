-- Bookmarks graduate from the shared `checklists` table (checklist factory) to a
-- purpose-built link locker. A checkbox on a link is the wrong mental model:
-- bookmarks aren't *completed*, they're *opened*. The defining field — the URL —
-- has no home on a checklist row, and tags/search are essential past ~20 links.
--
-- New `bookmarks` table: url + derived/editable title, free-form tags, an
-- optional coarse folder, a cached favicon URL, and last_opened_at for P3
-- "stale link" surfacing. Standard RLS: owner FOR ALL + SysOp SELECT.

CREATE TABLE IF NOT EXISTS public.bookmarks (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  folder TEXT,
  favicon_url TEXT,
  last_opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users access own bookmarks" ON public.bookmarks;
CREATE POLICY "Users access own bookmarks" ON public.bookmarks FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "SysOp read bookmarks" ON public.bookmarks;
CREATE POLICY "SysOp read bookmarks" ON public.bookmarks FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sysop'));

CREATE INDEX IF NOT EXISTS bookmarks_user_idx ON public.bookmarks (user_id, created_at DESC);
