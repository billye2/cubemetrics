-- Debt payoff graduates from a single-value goal into a finance-shaped app.
-- A debt is a balance you pay DOWN toward $0 (not a bar you fill toward a target),
-- carries an APR and a minimum payment, and keeps a payment history so progress is
-- preserved instead of overwriting a running number. Each payment is one row in
-- debt_payments; a debt's current_balance is original_balance - SUM(payments),
-- floored at 0. Per-debt payoff projection + snowball/avalanche strategy are
-- computed from these rows in page.tsx / lib.ts.
CREATE TABLE IF NOT EXISTS public.debts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  original_balance NUMERIC NOT NULL DEFAULT 0,
  current_balance NUMERIC NOT NULL DEFAULT 0,
  apr NUMERIC NOT NULL DEFAULT 0,         -- annual percentage rate, e.g. 19.99
  min_payment NUMERIC NOT NULL DEFAULT 0, -- monthly minimum
  status TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'paid'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own rows" ON public.debts FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "SysOp read access" ON public.debts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'sysop'));

CREATE INDEX IF NOT EXISTS debts_user_idx ON public.debts (user_id, created_at);

CREATE TABLE IF NOT EXISTS public.debt_payments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  debt_id BIGINT NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  paid_on DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own rows" ON public.debt_payments FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "SysOp read access" ON public.debt_payments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'sysop'));

CREATE INDEX IF NOT EXISTS debt_payments_debt_idx
  ON public.debt_payments (debt_id, paid_on);
CREATE INDEX IF NOT EXISTS debt_payments_user_idx
  ON public.debt_payments (user_id, paid_on);
