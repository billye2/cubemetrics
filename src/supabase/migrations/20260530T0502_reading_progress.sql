-- Reading P1: per-book progress. current_page / total_pages let "reading" books
-- show a thin progress bar (momentum). Both nullable; no row migration needed.
ALTER TABLE public.reading_list
  ADD COLUMN IF NOT EXISTS current_page INTEGER,
  ADD COLUMN IF NOT EXISTS total_pages INTEGER;
