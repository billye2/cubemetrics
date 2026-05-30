-- Recipes graduate from the shared `logs` table (logbook factory) to a real
-- structured model: one recipe with metadata, an ordered ingredients list, and
-- ordered steps. Scaling servings and cook mode (P2) both need ingredients and
-- steps as first-class rows, not prose.
--
-- RLS: `recipes` is owner-scoped directly. The two child tables are scoped
-- *through* recipe_id -> recipes.user_id, so a user can only touch ingredients
-- and steps that hang off a recipe they own.

CREATE TABLE IF NOT EXISTS public.recipes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  servings NUMERIC,
  prep_min INTEGER,
  cook_min INTEGER,
  tags TEXT[] NOT NULL DEFAULT '{}',
  photo_path TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users access own recipes" ON public.recipes;
CREATE POLICY "Users access own recipes" ON public.recipes FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "SysOp read recipes" ON public.recipes;
CREATE POLICY "SysOp read recipes" ON public.recipes FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sysop'));

CREATE INDEX IF NOT EXISTS recipes_user_idx ON public.recipes (user_id, created_at DESC);

-- Ingredients: qty + unit + item, kept in a manual sort order.
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recipe_id BIGINT NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  qty NUMERIC,
  unit TEXT NOT NULL DEFAULT '',
  item TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users access own recipe ingredients" ON public.recipe_ingredients;
CREATE POLICY "Users access own recipe ingredients" ON public.recipe_ingredients FOR ALL
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS recipe_ingredients_recipe_idx ON public.recipe_ingredients (recipe_id, sort);

-- Steps: ordered method, one row per step.
CREATE TABLE IF NOT EXISTS public.recipe_steps (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recipe_id BIGINT NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  step_no INTEGER NOT NULL DEFAULT 0,
  text TEXT NOT NULL
);

ALTER TABLE public.recipe_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users access own recipe steps" ON public.recipe_steps;
CREATE POLICY "Users access own recipe steps" ON public.recipe_steps FOR ALL
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS recipe_steps_recipe_idx ON public.recipe_steps (recipe_id, step_no);
