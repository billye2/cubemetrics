-- Savings P3: per-goal currency (multi-currency support).
-- Adds an ISO-4217 currency code to goals; existing rows default to USD.
-- No RLS change needed — goals already enforces "own rows" RLS.

alter table public.goals
  add column if not exists currency text not null default 'USD';

-- Keep it sane: 3-letter uppercase code.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'goals_currency_format_chk'
  ) then
    alter table public.goals
      add constraint goals_currency_format_chk
      check (currency ~ '^[A-Z]{3}$');
  end if;
end $$;
