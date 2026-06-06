-- Capability A (Agent Layer): the agent-writable /today layout override. The +XP
-- assistant can reshape Today from natural language ("focus on fitness, hide
-- journaling") by writing this row. Empty/absent ⇒ /today falls back to the existing
-- usage-based selection (resolveTodayApps is back-compatible), so this is additive and
-- every user without a row is unaffected.
CREATE TABLE IF NOT EXISTS public.today_prefs (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  focus           TEXT,                                  -- the user's stated "what matters most"
  ordered_app_ids TEXT[] NOT NULL DEFAULT '{}',          -- explicit order; empty ⇒ usage fallback
  hidden_app_ids  TEXT[] NOT NULL DEFAULT '{}',
  updated_by      TEXT   NOT NULL DEFAULT 'user',        -- 'user' | 'agent' (provenance)
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.today_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own today_prefs" ON public.today_prefs;
CREATE POLICY "own today_prefs" ON public.today_prefs FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
