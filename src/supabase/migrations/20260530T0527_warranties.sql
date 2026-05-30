-- Warranties graduate off the shared `checklists` table into their own
-- date-driven model. A warranty is not a task to check off — it's a coverage
-- window (purchase_date + warranty_months) we want to be warned about before it
-- closes. Expiry is COMPUTED at read time, never stored.
CREATE TABLE IF NOT EXISTS public.warranties (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  purchase_date DATE NOT NULL,
  warranty_months INTEGER NOT NULL DEFAULT 12,
  store TEXT,
  note TEXT,
  receipt_url TEXT,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.warranties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access own warranties" ON public.warranties;
CREATE POLICY "Users can access own warranties" ON public.warranties FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "SysOp read access" ON public.warranties;
CREATE POLICY "SysOp read access" ON public.warranties FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sysop'));

CREATE INDEX IF NOT EXISTS warranties_user_idx ON public.warranties (user_id, archived, purchase_date);
