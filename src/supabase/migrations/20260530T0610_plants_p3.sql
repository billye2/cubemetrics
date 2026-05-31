-- Plants P3 — photo, watering history, and a second (fertilizing) recurrence track.
--
-- 1. WATERING HISTORY (`plant_waterings`): every "Water" tap appends one row.
--    The card's sparkline reads the recent rows to show the rhythm of care
--    (intervals between waterings). `plants.last_watered` stays the fast path
--    for the next-due computation; this table is the durable log behind it.
-- 2. FERTILIZING (second recurrence track): two new nullable columns on
--    `plants` mirror the watering pair — `fertilize_days` (cadence, null = off)
--    and `last_fertilized` (DATE). Next fertilize-due is computed exactly like
--    watering: last_fertilized + fertilize_days, never stored.
-- 3. PHOTO (`plant-photos` Storage bucket): per-plant image. `plants.photo_url`
--    (reserved since P1) holds the public URL. Uploads are namespaced under the
--    owner's user-id folder; RLS keeps writes owner-only.

-- --- Fertilizing columns ---------------------------------------------------
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS fertilize_days INTEGER;
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS last_fertilized DATE;

-- --- Watering history -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plant_waterings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  plant_id BIGINT NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  watered_on DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plant_waterings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access own plant_waterings" ON public.plant_waterings;
CREATE POLICY "Users can access own plant_waterings" ON public.plant_waterings FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "SysOp read access" ON public.plant_waterings;
CREATE POLICY "SysOp read access" ON public.plant_waterings FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sysop'));

CREATE INDEX IF NOT EXISTS plant_waterings_plant_idx
  ON public.plant_waterings (plant_id, watered_on DESC);

-- --- Photo storage bucket ---------------------------------------------------
-- Public bucket so the card <img> can render the URL without a signed request.
INSERT INTO storage.buckets (id, name, public)
VALUES ('plant-photos', 'plant-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Owner-only writes; objects live under "<user_id>/...". Reads are public
-- (bucket is public) so no SELECT policy is required for display.
DROP POLICY IF EXISTS "Users insert own plant photos" ON storage.objects;
CREATE POLICY "Users insert own plant photos" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'plant-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users update own plant photos" ON storage.objects;
CREATE POLICY "Users update own plant photos" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'plant-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users delete own plant photos" ON storage.objects;
CREATE POLICY "Users delete own plant photos" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'plant-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
