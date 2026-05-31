-- Contacts P3: per-contact interaction history. A child of public.contacts that
-- records the notes you jot after talking to someone ("caught up over coffee",
-- "called re: the move"). Powers the recent-interactions list on each contact
-- card and the "draft a check-in" prompt. Logging an interaction is also how the
-- app stamps last_contacted, so the cadence/overdue layer stays in sync.
--
-- Standard owner + SysOp RLS pair. Indexed by (user_id, contact_id, created_at)
-- so a person's timeline reads cheaply, newest first. Rows cascade away when the
-- parent contact (or user) is deleted. Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.contact_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id BIGINT NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  note TEXT NOT NULL DEFAULT '',
  logged_on DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users access own rows" ON public.contact_log;
CREATE POLICY "Users access own rows" ON public.contact_log FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "SysOp read access" ON public.contact_log;
CREATE POLICY "SysOp read access" ON public.contact_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sysop'));

CREATE INDEX IF NOT EXISTS contact_log_contact_idx
  ON public.contact_log (user_id, contact_id, created_at DESC);
