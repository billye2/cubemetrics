-- Bookmarks P3 "read-it-later" flag: an unread boolean so a saved link can be
-- triaged later (filter chip + per-row toggle in the UI). Defaults to false so
-- existing rows are treated as already-read. No RLS change — inherits the
-- owner FOR ALL + SysOp SELECT policies from the base bookmarks table.

ALTER TABLE public.bookmarks
  ADD COLUMN IF NOT EXISTS unread BOOLEAN NOT NULL DEFAULT false;
