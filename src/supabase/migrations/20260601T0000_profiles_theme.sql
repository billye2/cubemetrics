-- Theme preference per user (cross-device sync for the Settings theme control).
-- 'auto' follows the OS via prefers-color-scheme; 'light'/'dark' force a theme.
-- Cached in localStorage client-side for no-flash; this column is the source of
-- truth across devices. Additive, defaulted — no RLS change (profiles already
-- enforces owner RLS).

alter table public.profiles
  add column if not exists theme text not null default 'auto';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_theme_chk') then
    alter table public.profiles
      add constraint profiles_theme_chk check (theme in ('light', 'dark', 'auto'));
  end if;
end $$;
