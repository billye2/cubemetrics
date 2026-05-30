-- Vocabulary graduates off the checklist template. A word has a definition and an
-- optional example sentence, and "learning" means repeated recall — so it carries
-- the same SM-2-lite spaced-repetition fields as flashcards
-- (ease/interval/due_date/reps). word = front, definition = back: the same review
-- engine backs both apps.
CREATE TABLE IF NOT EXISTS public.vocab_words (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  definition TEXT NOT NULL,
  example TEXT,
  ease REAL NOT NULL DEFAULT 2.5,
  interval INTEGER NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  due_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vocab_words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own rows" ON public.vocab_words FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS vocab_words_user_due_idx ON public.vocab_words (user_id, due_date);
