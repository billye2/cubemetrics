-- Meal planner graduates off the shared `checklists` table (was a flat list with
-- list_type='meal') to a real week grid: one row per (date, slot) assignment.
-- A slot holds a free-text meal name and optionally links to a Recipes row so
-- the grocery generator (P2) can pull that recipe's ingredients.
--
-- RLS: owner-scoped directly. recipe_id is a nullable FK to public.recipes with
-- ON DELETE SET NULL so deleting a recipe leaves the planned meal name intact.

CREATE TABLE IF NOT EXISTS public.meal_plan (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  slot TEXT NOT NULL CHECK (slot IN ('breakfast', 'lunch', 'dinner')),
  meal TEXT NOT NULL,
  recipe_id BIGINT REFERENCES public.recipes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date, slot)
);

ALTER TABLE public.meal_plan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users access own meal plan" ON public.meal_plan;
CREATE POLICY "Users access own meal plan" ON public.meal_plan FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "SysOp read meal plan" ON public.meal_plan;
CREATE POLICY "SysOp read meal plan" ON public.meal_plan FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sysop'));

CREATE INDEX IF NOT EXISTS meal_plan_user_date_idx ON public.meal_plan (user_id, date);
