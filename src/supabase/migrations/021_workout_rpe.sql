-- Workout P1 follow-on: optional RPE (rate of perceived exertion, 1–10) per set.
ALTER TABLE public.workout_sets ADD COLUMN IF NOT EXISTS rpe SMALLINT;
