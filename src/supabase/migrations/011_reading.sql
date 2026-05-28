CREATE TABLE public.reading_list (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'to_read',
  rating INTEGER,
  notes TEXT DEFAULT '',
  started_at DATE,
  finished_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reading_list ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access own reading list" ON public.reading_list FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
