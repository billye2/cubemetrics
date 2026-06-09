-- Custom per-event emoji for the Countdown app. The "Calm Color" redesign shows
-- an emoji in each progress ring; without this column the glyph could only be
-- derived from the category. Additive + nullable, so existing reads/writes and
-- the category-derived fallback are unaffected (NULL ⇒ use the category emoji).
ALTER TABLE public.countdowns
  ADD COLUMN IF NOT EXISTS emoji TEXT;
