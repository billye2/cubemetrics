-- Flashcards graduated from the checklist template. A card has a front/back and
-- lives in a deck; the SM-2-lite fields (ease/interval/due_date/reps) drive a
-- spaced-repetition review session. The same engine is intended to back the
-- vocabulary app later (word = front, definition = back).
CREATE TABLE IF NOT EXISTS public.flashcards (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deck TEXT NOT NULL DEFAULT 'General',
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  ease REAL NOT NULL DEFAULT 2.5,
  interval INTEGER NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  due_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own rows" ON public.flashcards FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS flashcards_user_due_idx ON public.flashcards (user_id, due_date);
CREATE INDEX IF NOT EXISTS flashcards_user_deck_idx ON public.flashcards (user_id, deck);
