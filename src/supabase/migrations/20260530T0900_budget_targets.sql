-- Per-category monthly planned spending (P1 of docs/app-plans/budget.md).
-- The Budget app graduates from the generic FinanceView (a flat payables list)
-- to a purpose-built planned-vs-actual model. The user sets a `planned` amount
-- per category per month; ACTUALS are read from the existing `expenses` table
-- (grouped by category + month) — no double entry. Categories are shared with
-- the Expenses app via `expense_categories` (matched by name), so the
-- planned-vs-actual join is reliable.
--
-- One row per (user, category, month). `month` is the first day of the month.
CREATE TABLE IF NOT EXISTS public.budget_targets (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  planned NUMERIC NOT NULL DEFAULT 0 CHECK (planned >= 0),
  month DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, category, month)
);

ALTER TABLE public.budget_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access own budget_targets" ON public.budget_targets;
CREATE POLICY "Users can access own budget_targets" ON public.budget_targets FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "SysOp read access" ON public.budget_targets;
CREATE POLICY "SysOp read access" ON public.budget_targets FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sysop'));

CREATE INDEX IF NOT EXISTS budget_targets_user_month_idx
  ON public.budget_targets (user_id, month);
