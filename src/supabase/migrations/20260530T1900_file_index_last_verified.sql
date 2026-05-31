-- File Index P3 "last verified" stamp for physical media: a date you last laid
-- eyes on / confirmed a disk, box, or drive still exists where the catalog says.
-- Nullable so existing rows (and digital files that never need re-verifying) are
-- simply "never verified". No RLS change — inherits the owner FOR ALL + SysOp
-- SELECT policies from the base file_index table.

ALTER TABLE public.file_index
  ADD COLUMN IF NOT EXISTS last_verified DATE;
