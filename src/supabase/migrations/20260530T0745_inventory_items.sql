-- Inventory graduates off the shared `checklists` table into its own
-- attribute-driven model. A possession is not a task to check off — it has a
-- quantity, a value, a location, a category, and (optionally) a photo. The
-- headline number is total worth (sum of value x quantity) for insurance.
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  value NUMERIC,
  location TEXT,
  category TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access own inventory items" ON public.inventory_items;
CREATE POLICY "Users can access own inventory items" ON public.inventory_items FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "SysOp read access" ON public.inventory_items;
CREATE POLICY "SysOp read access" ON public.inventory_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sysop'));

CREATE INDEX IF NOT EXISTS inventory_items_user_idx ON public.inventory_items (user_id, created_at DESC);
