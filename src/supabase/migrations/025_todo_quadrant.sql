-- Priority Matrix (Eisenhower) reuses the todos table rather than a parallel
-- task store. A single quadrant column places each task in the urgent x important
-- grid: 0 = unsorted (still in the inbox to triage), 1 = Do (urgent + important),
-- 2 = Schedule (important, not urgent), 3 = Delegate (urgent, not important),
-- 4 = Drop (neither). Additive with a default, so the Todo app's existing
-- reads/writes are unaffected.
ALTER TABLE public.todos
  ADD COLUMN IF NOT EXISTS quadrant SMALLINT NOT NULL DEFAULT 0;
