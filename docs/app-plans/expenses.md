# Expenses (`expenses`)

**Purpose** — Log day-to-day spending and see where the money goes.

**Current state** — Custom app (`ExpensesView.tsx`). Two-stat summary card (this month / this week totals), an always-open add form with `$` amount field, date picker (defaults today), a fixed row of 8 category chips, and an optional description. History is grouped by day (newest first) with a per-day subtotal, each row showing currency-formatted amount + category tag + description, with inline delete + `confirm`. Currency formatting via `Intl.NumberFormat`. Backed by `expenses` (RLS-scoped), reads in `page.tsx` (last 200 rows), writes in `actions.ts` with a server-side category allowlist.

**Gaps** — No visualization at all: no category breakdown, no trend, no sparkline — you can't see *where* the money goes, only two totals. Categories are a hard-coded list in two places (`page.tsx` + `actions.ts` allowlist) — no custom categories, no per-category color. No edit (a typo means delete + retype). No search or filter by category/date range. No tie-in to a Budget app. No recurring expenses. `currency` column exists but the add form always inserts USD.

**Plan**

**P1 — makes it complete**
- **Spending-by-category chart for the month** — a horizontal bar (or donut) ranking categories by total, each with its color and a percent-of-month. This is the single biggest missing piece: turns two numbers into insight.
- **Edit an expense** — tap a row to edit amount, category, date, description in place (new `updateExpenseAction`). Avoids delete-and-retype.
- **Custom categories** — let the user add their own categories that persist, instead of the fixed 8. Wire a per-user category list (see Data) and assign each a color; recent-first chips with a "+ New" affordance, matching the catalog convention.

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

**Verdict** — **M.** Already the most complete of these apps; one chart away from feeling purpose-built. Highest-impact change: the **spending-by-category breakdown chart** for the current month.
