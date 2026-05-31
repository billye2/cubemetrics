-- Spine Layer 1: per-user app usage signal (recency + frequency + pins). Powers
-- "the few apps you actually use" on the Today dashboard and a usage-ordered grid.
-- One row per (user, app). RLS owner-only; the cron never touches this table.

create table if not exists public.app_usage (
  user_id      uuid        not null references auth.users(id) on delete cascade,
  app_id       text        not null,
  last_used_at timestamptz not null default now(),
  use_count    integer     not null default 0,
  pinned       boolean     not null default false,
  primary key (user_id, app_id)
);

alter table public.app_usage enable row level security;

drop policy if exists "own app_usage" on public.app_usage;
create policy "own app_usage" on public.app_usage for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- "most recently used" lookups for dashboard / grid ordering.
create index if not exists app_usage_recent_idx
  on public.app_usage (user_id, last_used_at desc);

-- Atomic insert-or-increment in one round trip. SECURITY DEFINER but scoped to
-- auth.uid(), so a user can only ever touch their own row; set search_path to
-- prevent search-path hijacking.
create or replace function public.bump_app_usage(p_app text)
returns void language sql security definer set search_path = public as $$
  insert into public.app_usage (user_id, app_id, last_used_at, use_count)
  values (auth.uid(), p_app, now(), 1)
  on conflict (user_id, app_id)
  do update set last_used_at = now(), use_count = public.app_usage.use_count + 1;
$$;

revoke all on function public.bump_app_usage(text) from public;
grant execute on function public.bump_app_usage(text) to authenticated;
