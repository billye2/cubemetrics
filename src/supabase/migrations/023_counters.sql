-- Counter / Tally app. Several independent named counters, each with a current
-- value and a configurable step; every +/-/reset appends to counter_events so a
-- counter has history (today-net and a 7-day activity chart) rather than just a
-- single mutable number. `counters.value` is the denormalized running total,
-- kept in sync with the event sum for cheap reads and trivial reset.
CREATE TABLE IF NOT EXISTS public.counters (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value BIGINT NOT NULL DEFAULT 0,
  step INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.counter_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  counter_id BIGINT NOT NULL REFERENCES public.counters(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counter_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own rows" ON public.counters FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users access own rows" ON public.counter_events FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "SysOp read access" ON public.counters FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sysop'));
CREATE POLICY "SysOp read access" ON public.counter_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sysop'));

CREATE INDEX IF NOT EXISTS counters_user_idx ON public.counters (user_id, created_at);
CREATE INDEX IF NOT EXISTS counter_events_counter_idx ON public.counter_events (counter_id, created_at);
CREATE INDEX IF NOT EXISTS counter_events_user_idx ON public.counter_events (user_id, created_at);
