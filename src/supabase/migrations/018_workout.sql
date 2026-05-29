-- Workout app graduated from the logbook template. A workout is a session
-- (a training day) that owns a list of sets, each set being exercise × reps ×
-- weight. This replaces the single free-text body the logbook gave it, enabling
-- per-exercise volume, history, and personal-record tracking.
CREATE TABLE IF NOT EXISTS public.workout_sessions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  performed_on DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workout_sets (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id BIGINT NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise TEXT NOT NULL,
  reps INTEGER,
  weight NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own rows" ON public.workout_sessions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users access own rows" ON public.workout_sets FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS workout_sessions_user_idx ON public.workout_sessions (user_id, performed_on DESC);
CREATE INDEX IF NOT EXISTS workout_sets_session_idx ON public.workout_sets (session_id);
CREATE INDEX IF NOT EXISTS workout_sets_user_exercise_idx ON public.workout_sets (user_id, exercise);
