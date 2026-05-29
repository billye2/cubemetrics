# Bills (`bills`)

**Purpose** — Track recurring and one-off bills so nothing goes unpaid or late.

**Current state** — Generic `FinanceView` (`itemType: "bill"`, `hasAmount` + `hasDueDate`). One "Outstanding" total of unpaid amounts; add name/amount/category/due-date; checkbox to mark paid (moves to a collapsed "Paid" section); delete. Due dates render as a faint amber `Mar 14` label with no urgency, no sorting, and no notion that a bill repeats every month. Hardcodes `$`.

**Gaps** — A bills app lives and dies on due-date urgency, and the template has almost none: overdue bills look identical to ones due next month, and nothing is sorted by when it's owed. No recurrence — the whole point of bills (rent, utilities, insurance) is that they come back every month, but here you re-add each one by hand. Marking paid just hides the row, so there's no payment history and no "did I already pay the electric bill this month?" Single "Outstanding" number with no breakdown of *this month's* due total vs. far-future. No reminders.

**Plan** — This is the closest fit for the upgraded finance template; ride it and lean on the due-date + recurrence work.

**P1 — makes it complete**
- **Due-date urgency** (see `_finance-template.md`) — sort unpaid by due date ascending; overdue in red with "3 days late", due-soon (≤3 days) in amber with "due in 2 days", later in zinc. This is the single most important change.
- **This-month total due** as the hero, replacing raw "Outstanding": sum of bills with a due date in the current month, plus a secondary "X overdue" badge. The all-unpaid total moves to the stats strip.
- **Recurring bills** (see template) — a `recurrence` of monthly/yearly on add; when a recurring bill is marked paid, auto-generate the next instance with `due_date` advanced one period and `next_charge` set. Rent that you set up once should reappear every month.

**P2 — enhancements**
- **Mark paid → archive with `paid_date`** (see template) rather than hide, so "Paid" becomes a dated payment history grouped by month — answers "when did I last pay this?".
- **Category breakdown** (see template) — small bar of monthly bill amount by category (utilities / housing / insurance).
- **Monthly trend** — total billed per month across the last ~6 months from `paid_date` history.

**P3 — delight**
- **Reminders** for bills due (cross-cutting — needs notifications; note as shared).
- **Autopay flag** per bill — a non-actionable marker so you don't chase a bill that's already on autopay, and a separate "needs manual payment" filter.

**Data** — Rides `finance_items`. Add `recurrence TEXT`, `paid_date DATE`, `next_charge DATE` (all from the shared template migration, all nullable). An optional `autopay BOOLEAN DEFAULT false` for the P3 flag. No new table.

**Verdict** — **RIDE the upgraded template.** Best-fit app for it; most value comes from urgency sorting + recurrence, which are shared template work. Effort **S/M** (urgency S, recurrence M).
