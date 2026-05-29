# Income (`income`)

**Purpose** — Track money *in* by source — the mirror of Bills/Subscriptions — so the finance
suite shows inflow, not just outflow.

**Current state** — Catalog-entry app on the **finance** template (`itemType: "income"`,
`hasAmount: true`) — inherits per-type totals, recurrence (monthly/annual normalization), category
breakdown, and `Intl` currency. From `_new-app-candidates.md` §A.

**Plan**
- **P1** — _shipped (rides the template)_
  - [x] Named income sources with amount + frequency; monthly/annual totals + category breakdown —
        all inherited from the finance-template P1 (`_finance-template.md`).
- **P2/P3** — finance-template upgrades (paid/received history for an actual-vs-expected trend).
  App-specific later: net cashflow by reading Bills/Subscriptions alongside Income; feeds a future
  **Net Worth** app.

**Data** — Shared `finance_items` table (`item_type = 'income'`). No migration.

**Verdict** — **KEEP on the finance template**; anchors a future Net Worth view.
