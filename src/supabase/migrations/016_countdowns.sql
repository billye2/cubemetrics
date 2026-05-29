-- Custom Countdown app: dated targets a user wants to count down to.
-- Distinct from calendar_events (which is a calendar) and daily_trackers
-- (which logs values over time). recurring_yearly covers birthdays,
-- anniversaries, mother's day — the "next" date is computed client-side.
CREATE TABLE public.countdowns (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_date DATE NOT NULL,
  target_time TIME,
  category TEXT,
  recurring_yearly BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.countdowns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own countdowns" ON public.countdowns FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX countdowns_user_target_idx ON public.countdowns (user_id, target_date);
