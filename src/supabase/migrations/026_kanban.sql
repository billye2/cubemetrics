-- Kanban board. Uses the pre-existing public.kanban_cards table (created ad-hoc
-- earlier, never wired to a UI until now — same story as the factory tables in
-- 017). This migration is idempotent and records the table's current shape.
--
-- A card lives on a board (board_type) in a lane (column_name): 'todo' / 'doing'
-- / 'done', ordered by sort_order then created_at. P1 uses a single 'default'
-- board with title only; description, multiple boards, and manual reorder are P2.
CREATE TABLE IF NOT EXISTS public.kanban_cards (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  board_type TEXT NOT NULL DEFAULT 'default',
  title TEXT NOT NULL,
  description TEXT,
  column_name TEXT NOT NULL DEFAULT 'todo',
  sort_order INTEGER NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kanban_cards ENABLE ROW LEVEL SECURITY;

-- Owner policy already exists as "Users can access own cards"; (re)assert it and
-- add the conventional SysOp read policy. Drop-then-create keeps this idempotent.
DROP POLICY IF EXISTS "Users can access own cards" ON public.kanban_cards;
CREATE POLICY "Users can access own cards" ON public.kanban_cards FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "SysOp read access" ON public.kanban_cards;
CREATE POLICY "SysOp read access" ON public.kanban_cards FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sysop'));

CREATE INDEX IF NOT EXISTS kanban_cards_user_idx
  ON public.kanban_cards (user_id, board_type, column_name, sort_order);
