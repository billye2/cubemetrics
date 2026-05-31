-- OKRs P2 + P3 — KR types, end-of-cycle grading, and per-KR progress history.
--
-- P2:
--   * KR types — `kr_type` distinguishes metric (number→number), milestone
--     (done/not, current=0|1 target=1) and baseline (start→target, so % is
--     computed from `start_value`, not from 0). `start_value` backs the baseline
--     shape; existing metric/milestone rows keep start_value = 0 → identical math.
--   * End-of-cycle grading — `status` (active|graded) + `reflection` + `graded_at`
--     let a cycle be closed: snapshot a short retro and archive it out of the
--     active view, then start the next cycle fresh.
--
-- P3:
--   * `kr_progress` — append-only history of a KR's current value, drawn as a
--     sparkline. Standard owner + SysOp RLS, cascade on KR delete.
--
-- All additive: `ADD COLUMN IF NOT EXISTS` so re-running is safe and existing
-- objectives/key_results keep their behaviour.

ALTER TABLE public.key_results
  ADD COLUMN IF NOT EXISTS kr_type TEXT NOT NULL DEFAULT 'metric',
  ADD COLUMN IF NOT EXISTS start_value NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE public.objectives
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS reflection TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ;


CREATE TABLE IF NOT EXISTS public.kr_progress (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_result_id BIGINT NOT NULL REFERENCES public.key_results(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kr_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own rows" ON public.kr_progress FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "SysOp read access" ON public.kr_progress FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sysop'));

CREATE INDEX IF NOT EXISTS kr_progress_kr_idx
  ON public.kr_progress (key_result_id, created_at);
