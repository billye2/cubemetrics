# Net Worth (`networth`)

**Purpose** — See assets minus liabilities as one number, and watch it trend over time.

**Current state** — Did not exist. Promoted from the new-app shortlist
([`_new-app-candidates.md`](_new-app-candidates.md) — ranked **#9**, "money management = life-admin
productivity; anchors the whole finance suite"). Built as a custom `modern` app.

**Gaps it fills**
- The finance apps track flows (bills, subscriptions, expenses, income) and individual goals
  (savings, debt) but nothing rolls them into the single number people actually care about — net
  worth — or shows whether it's going up.

**Plan**

- **P1** — _shipped_
  - [x] **Accounts** — named items tagged **asset** or **liability**, each with a current value you
        can edit inline.
  - [x] **Net worth hero** = Σ assets − Σ liabilities, live; **stats strip** (total assets, total
        liabilities, change since last snapshot).
  - [x] **Snapshots** — one tap records the current totals with a date; a **trend line** charts net
        worth across snapshots.
  - [x] Asset / liability sections with inline value edit + delete (confirm).
  - [x] Currency via the shared `Intl` formatter; thoughtful empty states.
- **P2** — not yet
  - [ ] Pull balances from **Savings** / **Debt** goals and account categories (cash / investment /
        property / loan) with a breakdown.
  - [ ] Auto-snapshot monthly; edit/backdate a snapshot; delete a snapshot.
  - [ ] Per-account history and change %, not just the portfolio total.
- **P3** — not yet
  - [ ] Goal line ("reach $X net worth"); allocation donut; multi-currency.

**Data** — New tables (migration `028_net_worth.sql`):
- `net_worth_accounts` (`id, user_id, name, kind, value, created_at`) — `kind TEXT` ∈
  `asset` / `liability`; `value NUMERIC` current balance.
- `net_worth_snapshots` (`id, user_id, assets, liabilities, net, captured_on, created_at`) — a
  point-in-time total for the trend line.

Standard RLS pair on both. Snapshots indexed on `(user_id, captured_on)`.

**Verdict** — **BUILD (custom).** The number the finance suite was missing, with a real trend.
Effort **M** — shipped to the P1 bar (manual accounts + snapshots; auto-pull from savings/debt is P2).
