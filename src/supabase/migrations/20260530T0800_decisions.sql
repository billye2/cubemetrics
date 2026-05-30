-- Decisions (weighted decision matrix). Graduates the old single-`logbook`-row
-- decision (a title + a text blob, which can't represent or compute a matrix)
-- into a real options × criteria grid.
--
-- A Decision asks one question and owns:
--   * options    (the choices being weighed — the rows)
--   * criteria   (what matters, each with a 1–5 weight — the columns)
--   * scores     (a raw 1–10 rating for each option × criterion cell)
-- The weighted score per option = Σ(score × weight); the winner is computed in
-- the app, not stored. P2 records the option the user *actually* chose
-- (chosen_option_id, may differ from the computed winner), a rationale, and a
-- revisit date.
--
-- Four tables, all with the standard owner + SysOp RLS pair. Children carry
-- user_id directly (for a simple RLS predicate) and cascade on decision delete.

CREATE TABLE IF NOT EXISTS public.decisions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  chosen_option_id BIGINT,
  rationale TEXT NOT NULL DEFAULT '',
  revisit_at DATE,
  outcome TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own rows" ON public.decisions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "SysOp read access" ON public.decisions FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sysop'));

CREATE INDEX IF NOT EXISTS decisions_user_idx ON public.decisions (user_id, created_at DESC);


CREATE TABLE IF NOT EXISTS public.decision_options (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  decision_id BIGINT NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.decision_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own rows" ON public.decision_options FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "SysOp read access" ON public.decision_options FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sysop'));

CREATE INDEX IF NOT EXISTS decision_options_decision_idx
  ON public.decision_options (decision_id, sort_order, created_at);


CREATE TABLE IF NOT EXISTS public.decision_criteria (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  decision_id BIGINT NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  weight INTEGER NOT NULL DEFAULT 3,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.decision_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own rows" ON public.decision_criteria FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "SysOp read access" ON public.decision_criteria FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sysop'));

CREATE INDEX IF NOT EXISTS decision_criteria_decision_idx
  ON public.decision_criteria (decision_id, sort_order, created_at);


CREATE TABLE IF NOT EXISTS public.decision_scores (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  decision_id BIGINT NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  option_id BIGINT NOT NULL REFERENCES public.decision_options(id) ON DELETE CASCADE,
  criterion_id BIGINT NOT NULL REFERENCES public.decision_criteria(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (option_id, criterion_id)
);

ALTER TABLE public.decision_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own rows" ON public.decision_scores FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "SysOp read access" ON public.decision_scores FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sysop'));

CREATE INDEX IF NOT EXISTS decision_scores_decision_idx
  ON public.decision_scores (decision_id, option_id, criterion_id);
