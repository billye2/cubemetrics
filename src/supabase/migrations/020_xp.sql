-- The XP layer: turns activity across every app into points, levels, streaks,
-- daily quests, and achievements. See docs/app-plans/_xp-layer-spec.md.
--
-- Design: XP is DERIVED from the existing per-app tables, not emitted by each
-- action. The only persisted state is a per-user-per-day rollup cache
-- (xp_daily), the achievement-unlock ledger (xp_achievements), and daily-quest
-- completion (xp_quests). Level / total XP / streak are aggregates over
-- xp_daily and are NOT stored (no denormalized total to drift).
--
-- Written idempotently so it is safe to (re)apply against the remote.

-- === xp_daily: the rollup cache (one row per user per local day) ===
-- points = that day's total XP; breakdown = per-source map e.g.
-- {"focus":40,"habits":24,"todos":15,"quests":20}. Past days freeze once
-- computed; "today" is recomputed on each dashboard load (its source rows are
-- still mutable). Safe to delete and rebuild — it is a cache.
CREATE TABLE IF NOT EXISTS public.xp_daily (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);

-- === xp_achievements: unlock ledger ===
-- Presence of a row = unlocked; unlocked_at drives the "new!" celebration.
-- achievement_key matches a definition in src/lib/xp/achievements.ts.
CREATE TABLE IF NOT EXISTS public.xp_achievements (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_key)
);

-- === xp_quests: daily-quest completion ===
-- The day's 3 quests are chosen deterministically in code (hash(user+day)), so
-- this table only records which quest_keys were completed and when (progress
-- itself is read from xp_daily.breakdown). quest_key matches the quest pool in
-- src/lib/xp/quests.ts.
CREATE TABLE IF NOT EXISTS public.xp_quests (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  quest_key TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day, quest_key)
);

-- Server-side day boundaries must use the user's LOCAL day (apps bucket locally
-- on the client). Store the browser's IANA zone, set at login / first visit.
-- Nullable; compute falls back to a client-passed tz, then UTC.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone TEXT;

-- RLS: owner-only access + SysOp read, applied idempotently to every xp_* table.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['xp_daily','xp_achievements','xp_quests'] LOOP
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

-- Hot paths: the dashboard reads a user's recent daily rows (chart + streak),
-- their unlocked achievements, and today's quest completions.
CREATE INDEX IF NOT EXISTS xp_daily_user_day_idx ON public.xp_daily (user_id, day DESC);
CREATE INDEX IF NOT EXISTS xp_achievements_user_idx ON public.xp_achievements (user_id, unlocked_at DESC);
CREATE INDEX IF NOT EXISTS xp_quests_user_day_idx ON public.xp_quests (user_id, day DESC);
