# Budget (`budget`)

**Purpose** — Set a planned spending amount per category each month and track actual spend against it.

**Current state** — Generic `FinanceView` (`itemType: "budget"`, `hasAmount` only, no due date). Add name/amount/category; mark "paid"; "Outstanding" total; collapsed Paid section; delete. Hardcodes `$`.

**Gaps** — A budget is **planned vs. actual per category** — the template's flat list of payables is the wrong shape entirely. There's no concept of a *planned* amount versus what you *actually spent*, so the core budget question ("am I over on groceries this month?") can't be asked. The "paid" checkbox and "Outstanding" total are meaningless for budgeting. Worst of all, actual spend already lives in the separate **Expenses** app (the `expenses` table, with month/week totals and categories), but Budget has no awareness of it — the user would have to double-enter every expense here. No remaining-per-category, no over-budget warning, no monthly reset, no visualization.

**Plan** — **Graduate.** Own view (`ui: "modern"`, `page.tsx` + `actions.ts`) and a purpose-built model. The headline is planned-vs-actual; actual should be *read from the Expenses app*, not re-entered.

**P1 — makes it complete**
- **Per-category planned amounts** — the user sets a monthly `planned` budget per category (groceries $400, dining $150). This is the only thing the user enters; it's the budget itself.
- **Actual pulled from Expenses** — for the current month, sum the `expenses` table grouped by category and match it against the planned amounts. No double entry: Budget consumes Expenses' data. (Requires sharing a category vocabulary — see Data.)
- **Remaining per category + overall** — each category shows planned / spent / remaining with a progress bar (cyan under budget); a hero "X left of $Y this month" overall number replaces "Outstanding".
- **Over-budget warning** — categories past their planned amount turn red ("$40 over"), and an overall over-budget banner when total spend exceeds total planned.

**P2 — enhancements**
- **Category bar chart** (see `_finance-template.md`) — planned-vs-actual bars per category, the at-a-glance budget visualization.
- **Monthly reset / rollover** — planned amounts carry forward to the next month automatically; optionally roll *unspent* remainder into next month's allowance per category.
- **Month navigation** — view prior months' planned-vs-actual using the historical `expenses` rows.

**P3 — delight**
- **Pace indicator** — "you're 60% through the month and have spent 80% of dining" using day-of-month vs. spend ratio.
- **Unified money model** — converge **expenses + budget + bills + subscriptions** on one shared category table so a category's planned (budget), actual (expenses), and committed (bills + subscriptions) all line up. Biggest long-term win; note as cross-cutting.

**Data** — Graduating the view. Budget targets are not payables, so model them in their own table: `budget_targets (id, user_id, category, planned NUMERIC, month DATE, created_at)` with the standard RLS pair — one row per category per month. Actuals come from the existing `expenses` table (read-only join by category + month); a **shared category list** (per-user `categories` table) is what makes the join reliable and unlocks the P3 unification. The `finance_items` `budget` rows are abandoned for this app; `planned` from the shared template migration is unnecessary if using `budget_targets`.

**Verdict** — **GRADUATE.** The payables list is the wrong model; planned-vs-actual driven off the Expenses table is the real app, and it's the natural anchor for unifying the money apps. Effort **M/L** (M alone; L if shared-category unification is in scope).
