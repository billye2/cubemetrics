# Expenses (`expenses`)

**Purpose** — Log day-to-day spending and see where the money goes.

**Current state** — Custom app (`ExpensesView.tsx`). Two-stat summary card (this month / this week totals), an always-open add form with `$` amount field, date picker (defaults today), a fixed row of 8 category chips, and an optional description. History is grouped by day (newest first) with a per-day subtotal, each row showing currency-formatted amount + category tag + description, with inline delete + `confirm`. Currency formatting via `Intl.NumberFormat`. Backed by `expenses` (RLS-scoped), reads in `page.tsx` (last 200 rows), writes in `actions.ts` with a server-side category allowlist.

**Gaps** — No visualization at all: no category breakdown, no trend, no sparkline — you can't see *where* the money goes, only two totals. Categories are a hard-coded list in two places (`page.tsx` + `actions.ts` allowlist) — no custom categories, no per-category color. No edit (a typo means delete + retype). No search or filter by category/date range. No tie-in to a Budget app. No recurring expenses. `currency` column exists but the add form always inserts USD.

**Plan**

**P1 — makes it complete** ✅ shipped (branch `claude/expenses-build`)
- [x] **Spending-by-category chart for the month** — horizontal bars ranking the current month's categories by total, each rendered in its own color with a percent-of-month label. Only shown when there's month spend.
- [x] **Edit an expense** — tap a row to edit amount, category (select), date, description in place via a new `updateExpenseAction`. Cancel restores the original values; a tagged category that was since deleted stays selectable.
- [x] **Custom categories** — per-user `expense_categories` table (see Data) with name + color + sort_order, seeded with the legacy 8 on first open. Collapsible "Categories" panel with a color picker and "+ New"; chips show their color. The server allowlist is gone — `addExpenseAction`/`updateExpenseAction` validate against the user's own list (unknown → "Other").

**P2 — enhancements**
- **Month-over-month trend** — a small bar chart of total spend per month (last ~6 months) so the current month has context.
- **Filter + search** — filter the history by category and a date range; search descriptions. Useful once there are >50 rows.
- **Budget integration** — share the category list with the Budget/finance app and show "spent vs. budget" per category on the breakdown bar.

**P3 — delight**
- **Recurring expenses** — mark an expense as recurring (monthly/weekly) and auto-suggest/insert it.
- **CSV export** of the filtered view.
- **Receipt photo** attached to an expense (Supabase Storage).
- **Multi-currency** — honor the `currency` column in the add form and show a converted home-currency total.

**Data** — `expenses` already has `currency` (unused by the form — wire it for P3). Custom categories need a new per-user table, e.g. `expense_categories (id, user_id, name, color, sort_order, created_at)` with the standard RLS pair; drop the hard-coded allowlist in favor of validating against it. Per-category color can live there too. No migration of existing rows needed.

**Schema delta shipped** (migration `src/supabase/migrations/20260530T0508_expense_categories.sql`, applied to remote `aennreackkegaqwwbowg`):
```sql
CREATE TABLE public.expense_categories (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#06b6d4',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
-- RLS: owner-only ALL policy (auth.uid() = user_id) + SysOp SELECT, index on (user_id, sort_order).
```
Integrator: fold this table into `docs/database.md` during fan-in.

**Verdict** — **M.** Already the most complete of these apps; one chart away from feeling purpose-built. Highest-impact change: the **spending-by-category breakdown chart** for the current month.
