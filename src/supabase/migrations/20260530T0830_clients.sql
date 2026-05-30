-- Clients mini-CRM. Graduates the old `checklists` "client" list into a real
-- pipeline: each client carries a status (lead -> active -> done/lost), contact
-- info (email/phone), a project value, a next-action note + date, and free
-- notes. Replaces a binary done/not-done checkbox with a status pipeline.
--
-- Standard owner + SysOp RLS pair. Indexed by (user_id, status) for the
-- grouped pipeline view and by next_action_date for due/overdue surfacing.

CREATE TABLE IF NOT EXISTS public.clients (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'lead',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  value NUMERIC NOT NULL DEFAULT 0,
  next_action TEXT DEFAULT '',
  next_action_date DATE,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own rows" ON public.clients FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "SysOp read access" ON public.clients FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sysop'));

CREATE INDEX IF NOT EXISTS clients_user_status_idx ON public.clients (user_id, status);
CREATE INDEX IF NOT EXISTS clients_next_action_idx ON public.clients (user_id, next_action_date);
