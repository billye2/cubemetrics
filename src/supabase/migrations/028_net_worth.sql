-- Net Worth. Accounts are named balances tagged asset or liability; net worth is
-- Sum(assets) - Sum(liabilities), computed live from the current account values.
-- A snapshot freezes the totals on a date so the trend line has history (account
-- values themselves are mutable and overwrite in place).
CREATE TABLE IF NOT EXISTS public.net_worth_accounts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'asset',
  value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.net_worth_snapshots (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assets NUMERIC NOT NULL DEFAULT 0,
  liabilities NUMERIC NOT NULL DEFAULT 0,
  net NUMERIC NOT NULL DEFAULT 0,
  captured_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.net_worth_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.net_worth_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own rows" ON public.net_worth_accounts FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users access own rows" ON public.net_worth_snapshots FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "SysOp read access" ON public.net_worth_accounts FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sysop'));
CREATE POLICY "SysOp read access" ON public.net_worth_snapshots FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sysop'));

CREATE INDEX IF NOT EXISTS net_worth_accounts_user_idx ON public.net_worth_accounts (user_id, kind);
CREATE INDEX IF NOT EXISTS net_worth_snapshots_user_idx ON public.net_worth_snapshots (user_id, captured_on);
