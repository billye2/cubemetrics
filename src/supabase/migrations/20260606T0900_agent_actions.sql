-- Agent Layer: the audit + undo log for every write the +XP assistant applies
-- (Capability B). Each confirmed proposal that executes is recorded here with the
-- handle needed to revert it, so undo survives a page reload / new session (not just
-- the in-session chip). `undo` is the UndoHandle JSON ({kind:"row",table,id} or a
-- counter delta); `undone_at` is stamped when reverted (revert is then a no-op).
CREATE TABLE IF NOT EXISTS public.agent_actions (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool       TEXT NOT NULL,
  label      TEXT NOT NULL,
  undo       JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  undone_at  TIMESTAMPTZ
);

ALTER TABLE public.agent_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own agent_actions" ON public.agent_actions;
CREATE POLICY "own agent_actions" ON public.agent_actions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS agent_actions_user_recent_idx
  ON public.agent_actions (user_id, created_at DESC);
