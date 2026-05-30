-- Weekly Review graduates from the generic `logs` table to a dedicated table
-- keyed to a week (its Monday `week_start`), with four structured sections.
-- One review per week per user: UNIQUE (user_id, week_start) backs the upsert.
CREATE TABLE IF NOT EXISTS public.weekly_reviews (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,          -- Monday of the reviewed week (local)
  wins TEXT NOT NULL DEFAULT '',
  misses TEXT NOT NULL DEFAULT '',
  lessons TEXT NOT NULL DEFAULT '',
  next_focus TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

ALTER TABLE public.weekly_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access own weekly_reviews" ON public.weekly_reviews;
CREATE POLICY "Users can access own weekly_reviews" ON public.weekly_reviews FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "SysOp read access" ON public.weekly_reviews;
CREATE POLICY "SysOp read access" ON public.weekly_reviews FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sysop'));

CREATE INDEX IF NOT EXISTS weekly_reviews_user_week_idx
  ON public.weekly_reviews (user_id, week_start DESC);
