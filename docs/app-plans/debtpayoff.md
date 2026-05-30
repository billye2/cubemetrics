# Debt (`debtpayoff`)

**Purpose** — Pay off debts with balances, APR, a payment log, payoff projections, and snowball/avalanche ordering.

**Current state** — Generic `GoalView` (hasTarget **yes**, `goalType: "debt"`). A debt is a title + a target number with a bar — and the bar is even backwards for debt: progress should *fall toward zero*, not climb toward a target. None of what debt payoff requires exists: no APR, no minimum payment, no payment history, no payoff projection, no strategy across multiple debts.

**Gaps** — **Direction is wrong** — debt is "paying down a balance to $0", not "filling a bar to a target". No **APR** (interest is the whole reason payoff math matters). No **minimum payment**. No **payment log** — overwriting the number erases each payment and any sense of progress. No **payoff-date projection** (given balance, APR, monthly payment → months to zero and total interest). No **snowball vs avalanche** ordering across debts (smallest-balance-first vs highest-APR-first), the single most valuable feature of a payoff app. No **portfolio totals** (total owed, total interest paid, debt-free date).

**Plan** — Graduate to a custom app at `src/app/app/debtpayoff/` — finance-flavored, multi-debt.

**P1 — makes it usable** ✅ shipped
- [x] **Debt model** — each debt: name, **current balance**, **APR**, **minimum payment**. Bar shows balance *remaining vs original* (paid-down %). Custom `DebtView.tsx` + `actions.ts`.
- [x] **Payment log** — "+ payment" (amount, date, optional note) reduces the balance and is recorded; running paid-off total preserved (no overwrite).
- [x] **Per-debt payoff projection** — from balance + APR + planned monthly payment, compute **months to payoff** and **total interest**; show "debt-free Mar 2027".

**P2** ✅ shipped
- [x] **Snowball vs avalanche** — order debts smallest-balance-first vs highest-APR-first; recommend where to send the "extra" payment beyond minimums (focus debt highlighted), and show the projected portfolio debt-free date.
- [x] **Portfolio hero** — total balance across all debts, total paid to date, combined minimums, active/paid counts, projected debt-free date.

**P3** ✅ shipped
- [x] **Payoff chart** — portfolio total-owed-over-time line (solid real history + dashed forward projection), plus a per-debt burn-down chart on each card. Pure `portfolioTimeline` / `debtTimeline` / `projectionTimeline` / `portfolioProjectionTimeline` in `lib.ts`, rendered as a non-scaling SVG `BalanceChart`.
- [x] **Interest accrual** — an "interest: on/off" toggle on the portfolio chart; when on, the forward projection compounds APR/12 each month so the dashed burn-down tracks realistically (off = principal-only straight line). Stored balances are never mutated — accrual is projection-only.
- [x] **Celebration** — a 🎉 "You're debt-free!" banner when every debt is cleared, plus a dedicated **Paid off** archive section: each archived debt shows the amount cleared, the payoff date, and its payment log (`paidOffInfo` + `PaidOffArchive`/`ArchiveCard`). Active debts no longer mix with paid ones.

**Data** — Graduate from `goals` (new dedicated tables). `debts (id, user_id, name, original_balance, current_balance, apr, min_payment, status)` + `debt_payments (id, debt_id, amount, paid_on DATE, note, created_at)`. Standard RLS pair (own-rows + sysop read) on both; `current_balance` kept in sync = `original_balance − SUM(payments)` floored at 0; projections/strategy/totals computed in `lib.ts` (pure, unit-tested) and rendered in `DebtView`.

**Schema delta** — migration `src/supabase/migrations/20260530T0815_debts.sql` creates both tables above with RLS + indexes. No change to `goals`.

**Verdict** — **GRADUATE — DONE (P1+P2+P3)** — graduated to a custom finance app at `src/app/app/debtpayoff/` (`page.tsx` + `DebtView.tsx` + `actions.ts` + pure `lib.ts`). Paid-down bar (correct direction), APR + minimum payment, payment log, per-debt payoff projection (months + total interest + debt-free month), snowball/avalanche ordering with a highlighted focus debt, and a portfolio hero. **P3 shipped**: portfolio + per-debt balance-over-time charts (solid history + dashed projection), an interest-accrual toggle on the projection (projection-only — stored balances untouched), and a debt-free celebration banner + a "Paid off" archive (cleared amount, payoff date, payment log). No schema changes for P3 — all P3 features compute from existing `debts`/`debt_payments` rows in `lib.ts` (pure, unit-tested).
