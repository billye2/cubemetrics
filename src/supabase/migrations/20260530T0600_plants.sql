-- Plants graduate off the shared `checklists` table into their own recurring,
-- date-driven model. Watering is not a one-time check that disappears once done
-- — it is a recurrence: each plant is due every `frequency_days` after it was
-- last watered. The NEXT-due date is COMPUTED at read time
-- (last_watered + frequency_days), never stored, so "due today / overdue" is
-- always current. The "Water" action stamps last_watered = today, which
-- advances the next-due date — the recurrence engine.
CREATE TABLE IF NOT EXISTS public.plants (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  frequency_days INTEGER NOT NULL DEFAULT 7,
  last_watered DATE,                       -- null = never watered (due now)
  light TEXT,                              -- 'low' | 'medium' | 'bright' (P2)
  note TEXT,                               -- free-text care notes (P2)
  photo_url TEXT,                          -- Supabase Storage (P3)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access own plants" ON public.plants;
CREATE POLICY "Users can access own plants" ON public.plants FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "SysOp read access" ON public.plants;
CREATE POLICY "SysOp read access" ON public.plants FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sysop'));

CREATE INDEX IF NOT EXISTS plants_user_idx ON public.plants (user_id, last_watered);
