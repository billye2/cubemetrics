# Debt (`debtpayoff`)

**Purpose** — Pay off debts with balances, APR, a payment log, payoff projections, and snowball/avalanche ordering.

**Current state** — Generic `GoalView` (hasTarget **yes**, `goalType: "debt"`). A debt is a title + a target number with a bar — and the bar is even backwards for debt: progress should *fall toward zero*, not climb toward a target. None of what debt payoff requires exists: no APR, no minimum payment, no payment history, no payoff projection, no strategy across multiple debts.

**Gaps** — **Direction is wrong** — debt is "paying down a balance to $0", not "filling a bar to a target". No **APR** (interest is the whole reason payoff math matters). No **minimum payment**. No **payment log** — overwriting the number erases each payment and any sense of progress. No **payoff-date projection** (given balance, APR, monthly payment → months to zero and total interest). No **snowball vs avalanche** ordering across debts (smallest-balance-first vs highest-APR-first), the single most valuable feature of a payoff app. No **portfolio totals** (total owed, total interest paid, debt-free date).

**Plan** — Graduate to a custom app at `src/app/app/debtpayoff/` — finance-flavored, multi-debt.

**P1 — makes it usable**
- **Debt model** — each debt: name, **current balance**, **APR**, **minimum payment**. Bar shows balance *remaining vs original* (paid-down %). Custom `DebtView.tsx` + `actions.ts`.
- **Payment log** — "+ payment" (amount, date, optional note) reduces the balance and is recorded; running paid-off total preserved (no overwrite).
- **Per-debt payoff projection** — from balance + APR + planned monthly payment, compute **months to payoff** and **total interest**; show "debt-free Mar 2027".

**P2**
- **Snowball vs avalanche** — order debts smallest-balance-first vs highest-APR-first; recommend where to send the "extra" payment beyond minimums, and show how the chosen strategy changes the overall debt-free date / interest paid.
- **Portfolio hero** — total balance across all debts, total interest paid to date, combined minimums, projected debt-free date.

**P3**
- **Payoff chart** — total-balance-over-time line; per-debt burn-down.
- **Interest accrual** — optionally accrue monthly interest so balances track realistically.
- **Celebration** when a debt hits $0 + "paid off" archive with the date and total interest.

**Data** — Graduate from `goals`. New `debts (id, user_id, name, original_balance, current_balance, apr, min_payment, status)` + `debt_payments (id, debt_id, amount, paid_on DATE, note, created_at)`. Standard RLS pair on both; projections/strategy computed in `page.tsx`.

**Verdict** — **GRADUATE** — wrong-direction bar, interest math, a payment log, and cross-debt strategy put this firmly outside the template. Effort **M** (per-debt model + payments + projection) **/ L** (with snowball/avalanche strategy + portfolio math).
