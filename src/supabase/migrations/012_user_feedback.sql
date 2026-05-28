CREATE TABLE public.user_feedback (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'other',
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own feedback" ON public.user_feedback FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
