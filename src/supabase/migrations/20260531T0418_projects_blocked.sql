-- Project tracker P2. Adds "blocked reason + since" so a blocked project can
-- capture WHY it stalled and surface "blocked N days". `blocked_at` is stamped
-- when a project moves into the `blocked` status and cleared when it leaves, so
-- the duration is honest; `blocked_reason` is free text.
--
-- Idempotent column adds on the existing `projects` table (RLS already enabled
-- in 20260530T0632_projects.sql; new columns inherit the table's policies).

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS blocked_reason TEXT DEFAULT '';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ;
