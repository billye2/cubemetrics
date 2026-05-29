-- Goal progress history: one row per progress update so a goal's trend (and
-- pace) can be shown, instead of only the latest current_value. goalUpdateProgress
-- inserts here then updates goals.current_value.
CREATE TABLE IF NOT EXISTS public.goal_progress (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id BIGINT NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.goal_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own rows" ON public.goal_progress FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS goal_progress_goal_idx ON public.goal_progress (goal_id, created_at);
