-- Schedule / Recurring template — the sixth factory family. One row is a
-- recurring task owned by a catalog app (schedule_type discriminator, like the
-- other factory tables). next due = last_done + interval_days; null last_done
-- means due now. Marking done stamps last_done = today and reschedules.
CREATE TABLE IF NOT EXISTS public.schedule_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schedule_type TEXT NOT NULL,
  title TEXT NOT NULL,
  interval_days INTEGER NOT NULL DEFAULT 30,
  last_done DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.schedule_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own rows" ON public.schedule_items FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "SysOp read access" ON public.schedule_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sysop'));

CREATE INDEX IF NOT EXISTS schedule_items_user_idx ON public.schedule_items (user_id, schedule_type);
