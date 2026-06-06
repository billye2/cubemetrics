-- Per-user rate limiting for the +XP assistant — the volume cap that input-size caps
-- can't provide. Fixed-window counters (hourly + daily) in a table, incremented
-- atomically by a SECURITY DEFINER function scoped to auth.uid() (same hardened
-- pattern as bump_app_usage). Abuse / runaway loops can't burn unbounded Anthropic
-- tokens. RLS-enabled-no-policy: only the definer function touches it (like notification_log).

CREATE TABLE IF NOT EXISTS public.agent_rate (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  window_key TEXT NOT NULL,                 -- 'h:YYYY-MM-DDTHH' (UTC) | 'd:YYYY-MM-DD'
  count      INT  NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, window_key)
);

ALTER TABLE public.agent_rate ENABLE ROW LEVEL SECURITY;
-- No policy: locked to the SECURITY DEFINER function / service role.

-- Atomic check-and-increment for the calling user. Returns TRUE if this turn is within
-- BOTH the hourly and daily limit, FALSE if either is exceeded. Increments regardless
-- (a blocked attempt still counts), so a spammer stays blocked until the window rolls.
CREATE OR REPLACE FUNCTION public.bump_agent_rate(p_hour_limit INT, p_day_limit INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  uid    UUID := auth.uid();
  hkey   TEXT := 'h:' || to_char(now(), 'YYYY-MM-DD"T"HH24');
  dkey   TEXT := 'd:' || to_char(now(), 'YYYY-MM-DD');
  hcount INT;
  dcount INT;
BEGIN
  IF uid IS NULL THEN
    RETURN FALSE; -- unauthenticated callers get nothing
  END IF;

  -- Self-clean this user's stale windows (keeps the row set tiny; no cron needed).
  DELETE FROM public.agent_rate WHERE user_id = uid AND created_at < now() - INTERVAL '2 days';

  INSERT INTO public.agent_rate (user_id, window_key, count) VALUES (uid, hkey, 1)
    ON CONFLICT (user_id, window_key) DO UPDATE SET count = public.agent_rate.count + 1
    RETURNING count INTO hcount;

  INSERT INTO public.agent_rate (user_id, window_key, count) VALUES (uid, dkey, 1)
    ON CONFLICT (user_id, window_key) DO UPDATE SET count = public.agent_rate.count + 1
    RETURNING count INTO dcount;

  RETURN hcount <= p_hour_limit AND dcount <= p_day_limit;
END;
$$;

-- Lock execution down to signed-in users (the function self-scopes to auth.uid()).
-- NB: revoking from PUBLIC is NOT enough on Supabase — its default privileges also
-- grant EXECUTE to `anon` on new public functions, so revoke that explicitly too
-- (else anon could call the rate limiter via /rest/v1/rpc).
REVOKE EXECUTE ON FUNCTION public.bump_agent_rate(INT, INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bump_agent_rate(INT, INT) FROM anon;
GRANT EXECUTE ON FUNCTION public.bump_agent_rate(INT, INT) TO authenticated;
