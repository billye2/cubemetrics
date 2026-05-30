# Savings (`savings`)

**Purpose** — Save toward money goals with a contribution log, pace math, and a projected finish date.

**Current state** — Generic `GoalView` (hasTarget **yes**, `goalType: "savings"`). A savings goal is a title + a target number with a bar you hand-overwrite. It half-works as "saved / target" but loses the finance specifics: no currency formatting, no record of each deposit, no deadline, no pace, no projection.

**Gaps** — No **currency formatting** ("$1,250 / $5,000", not "1250 / 5000"). No **contribution log** — updating progress overwrites the running total and erases the deposit history, so there's no "you added $200 on May 3" and no momentum. No **deadline / target date**. No **pace math** — the whole point of a savings goal is "I need to put away $X/month to hit it by then" and "at your current pace you'll finish in …". No **projected finish date** from recent contribution rate. No support for **multiple goals** with a combined total saved.

**Plan** — Graduate to a custom app at `src/app/app/savings/` — finance-flavored.

**P1 — makes it usable** ✅ shipped
- [x] **Contribution log** — "+ contribution" (amount, date, optional note) appends a deposit; `current_value` = sum of contributions, so history is preserved and each deposit is visible. Custom `SavingsView.tsx` + `actions.ts`.
- [x] **Currency formatting** everywhere (locale `$`, thousands separators) on hero, bar, and log.
- [x] **Target date** — optional `due_date`; show "N months left" (cross-cutting deadline; see `_goal-template.md`).

**P2** ✅ shipped
- [x] **Pace math** — given target + remaining + months left, show **"$X/month to hit it"**; compare to actual recent monthly pace (ahead / behind, colored).
- [x] **Projected finish date** — extrapolate from average monthly contributions; "on track for Oct 2026".
- [x] **Multiple goals dashboard** — total saved across all goals + combined monthly contribution.

**P3**
- **Contribution chart** — cumulative-savings line and monthly-deposit bars.
- **Recurring/auto reminder** — "you usually add ~$200 around the 1st".
- **Celebration** at 100% + completed archive with the date hit.

**Data** — Graduate from the single-value `goals` row. Keep `goals` (title, target_value, due_date, status) and add `savings_contributions (id, goal_id, amount, contributed_on DATE, note, created_at)`; `current_value` derives from the sum. Standard RLS pair. (Generalizes the `goal_progress` history into amounts.)

**Verdict** — **GRADUATE** — a deposit log + currency + pace/projection is genuinely finance-shaped, not a generic bar. Effort **M**.

---

**Schema delta (shipped)** — migration `src/supabase/migrations/20260530T0700_savings_contributions.sql`:
- New table `public.savings_contributions (id, user_id, goal_id → goals ON DELETE CASCADE, amount NUMERIC, contributed_on DATE, note TEXT, created_at)`.
- Standard RLS: "Users access own rows" (FOR ALL, `auth.uid() = user_id`) + "SysOp read access" (SELECT for sysop role).
- Indexes on `(goal_id, contributed_on)` and `(user_id, contributed_on)`.
- Reuses existing `public.goals` rows with `goal_type = 'savings'` (title / target_value / due_date / status). `goals.current_value` is kept in sync (= SUM of contributions) by the server actions so the bar matches the log.

**Build notes** — catalog entry flipped `ui: "goal"` → `ui: "modern"` (custom page at `src/app/app/savings/`). Pace/projection math lives in `src/app/app/savings/lib.ts` (pure, unit-tested in `tests/unit/savings-lib.test.ts`). P3 (charts, recurring reminder, celebration/archive) not yet built.
