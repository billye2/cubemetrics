-- Savings graduates from a single-value goal into a finance-shaped app.
-- Goals (goal_type = 'savings') keep title / target_value / due_date / status.
-- Each deposit is one row in savings_contributions; a goal's current_value is the
-- SUM(amount) of its contributions, so deposit history and momentum are preserved
-- instead of overwriting a running total. Generalizes goal_progress into amounts.
CREATE TABLE IF NOT EXISTS public.savings_contributions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id BIGINT NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  contributed_on DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.savings_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own rows" ON public.savings_contributions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "SysOp read access" ON public.savings_contributions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'sysop'));

CREATE INDEX IF NOT EXISTS savings_contributions_goal_idx
  ON public.savings_contributions (goal_id, contributed_on);
CREATE INDEX IF NOT EXISTS savings_contributions_user_idx
  ON public.savings_contributions (user_id, contributed_on);
