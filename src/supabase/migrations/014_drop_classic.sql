-- Classic BBS terminal removed. Drop the classic-only tables.
--   bbs_sessions  — per-user terminal session state (current_location, door_state)
--   activity_log  — sysop activity feed for the BBS
-- The modern UI never read or wrote these.
DROP TABLE IF EXISTS public.activity_log;
DROP TABLE IF EXISTS public.bbs_sessions;
