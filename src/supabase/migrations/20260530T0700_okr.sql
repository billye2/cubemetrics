-- OKRs. Graduates the old single-`goals`-row OKR (a flat title + one target
-- number, which mismodels OKRs) into a real objective→key-result hierarchy.
--
-- An Objective is qualitative (no number of its own), tagged with a cycle
-- (e.g. "Q2 2026") and a manually-set confidence (on_track / at_risk /
-- off_track). It owns 2–5 Key Results, each with its own current/target; the
-- objective's score is the mean of its KR %s (computed in the app, not stored).
--
-- Two tables with the standard owner + SysOp RLS pair. key_results cascade on
-- objective delete so removing an objective cleans up its KRs.

CREATE TABLE IF NOT EXISTS public.objectives (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  cycle TEXT NOT NULL DEFAULT '',
  confidence TEXT NOT NULL DEFAULT 'on_track',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own rows" ON public.objectives FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "SysOp read access" ON public.objectives FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sysop'));

CREATE INDEX IF NOT EXISTS objectives_user_idx ON public.objectives (user_id, cycle);


CREATE TABLE IF NOT EXISTS public.key_results (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  objective_id BIGINT NOT NULL REFERENCES public.objectives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  current_value NUMERIC NOT NULL DEFAULT 0,
  target_value NUMERIC NOT NULL DEFAULT 100,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.key_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own rows" ON public.key_results FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "SysOp read access" ON public.key_results FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sysop'));

CREATE INDEX IF NOT EXISTS key_results_objective_idx
  ON public.key_results (objective_id, sort_order, created_at);
