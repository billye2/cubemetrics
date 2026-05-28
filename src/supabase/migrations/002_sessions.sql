CREATE TABLE public.bbs_sessions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_location TEXT NOT NULL DEFAULT 'main_menu',
  door_state JSONB NOT NULL DEFAULT '{}',
  last_activity TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bbs_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own session"
  ON public.bbs_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
