-- Per-item scheduling for the checklist family. Daily Planner & Routines (and the
-- broader household checklist cluster) want a due date per item so the spine can
-- surface what's due today / overdue on /today. Nullable + additive, so every
-- existing checklist app (grocery, packing, cleaning, …) is unaffected.
ALTER TABLE public.checklists ADD COLUMN IF NOT EXISTS due_date DATE;

CREATE INDEX IF NOT EXISTS checklists_user_type_due_idx
  ON public.checklists (user_id, list_type, due_date);
