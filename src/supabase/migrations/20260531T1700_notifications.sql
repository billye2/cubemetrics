-- Spine Layer 4: proactive engine. Opt-in prefs + an idempotency/audit ledger.

-- Opt-in prefs. No row = no email (consent-first). RLS owner-only; the cron reads
-- via the service-role client. ai_insights_enabled is consumed by Phase 5.
create table if not exists public.notification_prefs (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  email_enabled       boolean not null default false,
  morning_enabled     boolean not null default true,
  evening_enabled     boolean not null default true,
  morning_time        time    not null default '08:00',
  evening_time        time    not null default '20:00',
  streak_save_enabled boolean not null default true,
  ai_insights_enabled boolean not null default true,
  created_at          timestamptz not null default now()
);
alter table public.notification_prefs enable row level security;
drop policy if exists "own notification_prefs" on public.notification_prefs;
create policy "own notification_prefs" on public.notification_prefs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Send ledger: idempotency (claim-before-send) + audit. One send per (user, kind,
-- local day). RLS enabled with no policy ⇒ users see nothing; only the service role
-- (cron / unsubscribe routes) touches it.
create table if not exists public.notification_log (
  id        bigint generated always as identity primary key,
  user_id   uuid not null references auth.users(id) on delete cascade,
  kind      text not null,        -- 'morning' | 'evening' | 'streak_save'
  local_day date not null,        -- the user's local calendar day (todayKey)
  sent_at   timestamptz not null default now()
);
create unique index if not exists notification_log_once
  on public.notification_log (user_id, kind, local_day);
alter table public.notification_log enable row level security;
