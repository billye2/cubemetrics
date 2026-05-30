-- Per-user custom expense categories (P1 of docs/app-plans/expenses.md).
-- Replaces the hard-coded 8-category allowlist with a user-owned list, each
-- carrying a color for the spending-by-category breakdown chart. Existing
-- expense rows keep their TEXT category as-is (no migration of old rows needed);
-- the app seeds the legacy 8 defaults for a user the first time they have none.
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#06b6d4',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access own expense_categories" ON public.expense_categories;
CREATE POLICY "Users can access own expense_categories" ON public.expense_categories FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "SysOp read access" ON public.expense_categories;
CREATE POLICY "SysOp read access" ON public.expense_categories FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sysop'));

CREATE INDEX IF NOT EXISTS expense_categories_user_idx
  ON public.expense_categories (user_id, sort_order);
