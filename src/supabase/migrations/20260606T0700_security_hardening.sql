-- Security hardening from the 2026-06-06 audit (Supabase advisors).
--
-- 1) _seed_baseline (dummy-seed teardown watermark) was PostgREST-exposed with
--    RLS disabled → any anon could GET it. Enable RLS with no policy → locks it
--    to the service role only (the seed tooling). No app code reads it.
ALTER TABLE IF EXISTS public._seed_baseline ENABLE ROW LEVEL SECURITY;

-- 2) _audit_columns() is a SECURITY DEFINER helper for the health script that
--    returns every public table+column name. It was anon/authenticated-executable
--    via /rpc → schema disclosure. Postgres grants EXECUTE to PUBLIC by default,
--    so we must revoke from PUBLIC (revoking from anon/authenticated alone leaves
--    the PUBLIC grant intact). Only the service role needs it.
REVOKE EXECUTE ON FUNCTION public._audit_columns() FROM PUBLIC, anon, authenticated;

-- 3) bump_app_usage(text) is the usage beacon — authenticated users must keep it
--    (it derives user_id from auth.uid()), but anon has no reason to call it.
--    Revoke the blanket PUBLIC grant, then re-grant only to authenticated.
REVOKE EXECUTE ON FUNCTION public.bump_app_usage(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bump_app_usage(text) TO authenticated;
