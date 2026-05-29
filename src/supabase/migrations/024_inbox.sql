-- Quick Capture / Inbox. One frictionless box to dump a thought; each row is an
-- un-triaged capture. Process-to-zero: triaging an item creates a row in the
-- destination app (todos / notes / checklists-backlog) and deletes the inbox
-- row, so an item is "in the inbox" iff it still exists here. No status column.
CREATE TABLE IF NOT EXISTS public.inbox_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inbox_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own rows" ON public.inbox_items FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "SysOp read access" ON public.inbox_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sysop'));

CREATE INDEX IF NOT EXISTS inbox_items_user_idx ON public.inbox_items (user_id, created_at);
