-- Clients P3: per-client activity log. Records lifecycle events — chiefly
-- stage changes (lead -> active -> done/lost) and client creation — so the
-- pipeline can show a simple history and power a won-vs-lost conversion view.
--
-- Standard owner + SysOp RLS pair. Indexed by (user_id, client_id) so a
-- client's timeline reads cheaply, and rows cascade away when the parent
-- client (or user) is deleted.

CREATE TABLE IF NOT EXISTS public.client_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id BIGINT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'status',
  from_status TEXT DEFAULT '',
  to_status TEXT DEFAULT '',
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own rows" ON public.client_events FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "SysOp read access" ON public.client_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sysop'));

CREATE INDEX IF NOT EXISTS client_events_client_idx
  ON public.client_events (user_id, client_id, created_at DESC);
