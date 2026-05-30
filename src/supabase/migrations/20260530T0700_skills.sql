-- Skill Tree. Graduates the old single-`goals`-row "skill" checkbox into a real
-- leveling system: each skill accumulates XP (level is derived from a threshold
-- curve in app code), earns XP through a practice log, and can require other
-- skills at a minimum level — the literal dependency "tree".
--
-- Three tables with the standard owner + SysOp RLS pair:
--   skills          — one row per skill, holds the running xp total
--   skill_practice  — append-only log of practice sessions that grant xp
--   skill_deps      — edges: a skill requires another skill at >= min_level
-- Child rows cascade on skill delete so removing a skill cleans up its history
-- and any dependency edges pointing at or from it.

CREATE TABLE IF NOT EXISTS public.skills (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own rows" ON public.skills FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "SysOp read access" ON public.skills FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sysop'));

CREATE INDEX IF NOT EXISTS skills_user_idx ON public.skills (user_id, category);


CREATE TABLE IF NOT EXISTS public.skill_practice (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id BIGINT NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  xp INTEGER NOT NULL CHECK (xp > 0),
  minutes INTEGER,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.skill_practice ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own rows" ON public.skill_practice FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "SysOp read access" ON public.skill_practice FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sysop'));

CREATE INDEX IF NOT EXISTS skill_practice_skill_idx
  ON public.skill_practice (skill_id, created_at DESC);


CREATE TABLE IF NOT EXISTS public.skill_deps (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id BIGINT NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  requires_skill_id BIGINT NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  min_level INTEGER NOT NULL DEFAULT 1 CHECK (min_level >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (skill_id <> requires_skill_id),
  UNIQUE (skill_id, requires_skill_id)
);

ALTER TABLE public.skill_deps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own rows" ON public.skill_deps FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "SysOp read access" ON public.skill_deps FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sysop'));

CREATE INDEX IF NOT EXISTS skill_deps_skill_idx ON public.skill_deps (skill_id);
CREATE INDEX IF NOT EXISTS skill_deps_requires_idx ON public.skill_deps (requires_skill_id);
