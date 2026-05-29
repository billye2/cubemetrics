-- Keep in Touch revives the pre-existing public.contacts table (created ad-hoc
-- earlier, never wired to a UI — the catalog "Contacts" checklist stores its
-- rows in the shared checklists table, not here). This migration is idempotent:
-- it records the table's shape, adds the relationship-cadence fields, and adds
-- the conventional SysOp read policy (the owner policy already existed).
CREATE TABLE IF NOT EXISTS public.contacts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  note TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cadence: reach out every cadence_days; last_contacted drives "next due".
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS cadence_days INTEGER;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS last_contacted DATE;

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access own contacts" ON public.contacts;
CREATE POLICY "Users can access own contacts" ON public.contacts FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "SysOp read access" ON public.contacts;
CREATE POLICY "SysOp read access" ON public.contacts FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sysop'));

CREATE INDEX IF NOT EXISTS contacts_user_idx ON public.contacts (user_id, last_contacted);
