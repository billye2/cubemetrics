-- Recipes P3 — photo per recipe via Supabase Storage.
--
-- The `recipes.photo_path` column was reserved at P1. It now holds the Storage
-- object path ("<user_id>/<recipe_id>-<ts>.<ext>"), NOT a full URL — the page
-- derives the public URL at read time. A public bucket keeps the detail <img>
-- a plain GET (no signed request); owner-only write/update/delete policies keep
-- uploads scoped to the uploader's user-id folder.
--
-- The other two P3 threads (per-step cook timers, deep-link from the meal
-- planner) are client-only / routing concerns and need no schema change. The
-- meal planner already carries `meals.recipe_id`; the recipes app now honors a
-- ?id=<n> query param to open that recipe's detail directly.

INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-photos', 'recipe-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Owner-only writes; objects live under "<user_id>/...". Reads are public
-- (bucket is public) so no SELECT policy is required for display.
DROP POLICY IF EXISTS "Users insert own recipe photos" ON storage.objects;
CREATE POLICY "Users insert own recipe photos" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'recipe-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users update own recipe photos" ON storage.objects;
CREATE POLICY "Users update own recipe photos" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'recipe-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users delete own recipe photos" ON storage.objects;
CREATE POLICY "Users delete own recipe photos" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'recipe-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
