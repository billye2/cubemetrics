-- Factory tables backing the five generic templates (tracker / checklist /
-- logbook / goal / finance). These were created directly on the remote during
-- earlier template work and never captured in a migration; this file documents
-- them and the P1 columns the upgraded views rely on. Written idempotently so
-- it is safe to (re)apply against the existing remote.

-- === tracker: daily_trackers ===
CREATE TABLE IF NOT EXISTS public.daily_trackers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tracker_type TEXT NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  value NUMERIC,
  label TEXT DEFAULT '',
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- === checklist: checklists (P1 adds note + sort_order) ===
CREATE TABLE IF NOT EXISTS public.checklists (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  list_type TEXT NOT NULL,
  title TEXT NOT NULL,
  note TEXT DEFAULT '',
  completed BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.checklists ADD COLUMN IF NOT EXISTS note TEXT DEFAULT '';
ALTER TABLE public.checklists ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- === logbook: logs (P1 uses editable title/body + backdated created_at; tags reserved for P2) ===
CREATE TABLE IF NOT EXISTS public.logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_type TEXT NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT DEFAULT '',
  body TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.logs ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- === goal: goals (P1 adds description, unit, due_date) ===
CREATE TABLE IF NOT EXISTS public.goals (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  unit TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT '';
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS due_date DATE;

-- === finance: finance_items (P1 adds frequency for recurrence + note) ===
CREATE TABLE IF NOT EXISTS public.finance_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  frequency TEXT DEFAULT 'monthly',
  category TEXT DEFAULT '',
  due_date DATE,
  paid BOOLEAN DEFAULT false,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.finance_items ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'monthly';
ALTER TABLE public.finance_items ADD COLUMN IF NOT EXISTS note TEXT DEFAULT '';

-- RLS: owner-only access + SysOp read, applied idempotently to every factory table.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['daily_trackers','checklists','logs','goals','finance_items'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users access own rows" ON public.%I;', t);
    EXECUTE format(
      'CREATE POLICY "Users access own rows" ON public.%I FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);',
      t);
    EXECUTE format('DROP POLICY IF EXISTS "SysOp read access" ON public.%I;', t);
    EXECUTE format(
      'CREATE POLICY "SysOp read access" ON public.%I FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''sysop''));',
      t);
  END LOOP;
END $$;

-- Lookups are always scoped by (user_id, type); index the hot paths.
CREATE INDEX IF NOT EXISTS daily_trackers_user_type_idx ON public.daily_trackers (user_id, tracker_type, created_at DESC);
CREATE INDEX IF NOT EXISTS checklists_user_type_idx ON public.checklists (user_id, list_type);
CREATE INDEX IF NOT EXISTS logs_user_type_idx ON public.logs (user_id, log_type, created_at DESC);
CREATE INDEX IF NOT EXISTS goals_user_type_idx ON public.goals (user_id, goal_type);
CREATE INDEX IF NOT EXISTS finance_items_user_type_idx ON public.finance_items (user_id, item_type);
