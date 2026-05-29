# Streaks (`streaks`)

**Purpose** — Keep daily streaks alive with check-ins, current + best counts, and a heatmap.

**Current state** — Generic `GoalView` (hasTarget **no**, `goalType: "streak"`). Add a title → "mark complete" / delete. There is literally no streak here: no daily check-in, no consecutive-day count, no calendar. A streak is a *recurring daily action with a running count*, which is the opposite mental model from "progress toward a number you finish once." This is the worst fit of the nine.

**Gaps** — Everything that makes a streak a streak: no per-day check-in, no current-streak / best-streak math, no calendar heatmap, no freeze/skip ("don't break the chain" grace day), no concept of "did I do it today?". The Habits app already implements *exactly* this loop (one-tap today check-in, consecutive-day streak, 7-day count, soft-delete) backed by `habits` + `habit_checkins` — see `habits.md`. Maintaining a second, weaker copy of the same loop is duplicate surface.

**Plan** — **Strongly prefer MERGE WITH HABITS.** A "streak" is a habit whose headline metric is the chain.

**Option A — MERGE (recommended).** Retire the `streaks` factory entry; point the catalog `streaks` id at the existing Habits experience (or drop it and let Habits own this job). Add to Habits a **best-streak record** and the **calendar heatmap** already planned in `habits.md` — that delivers everything Streaks promised with near-zero new code. Effort **near-zero** beyond the Habits work.

**Option B — GRADUATE (if kept standalone).** Build `src/app/app/streaks/` mirroring the Habits loop:
- **P1** — daily one-tap check-in per streak; compute **current streak** (consecutive days ending today/yesterday) and **best streak**; undo today's tap.
- **P2** — **calendar heatmap** (GitHub-style ~8 weeks) per streak; **freeze/skip day** that preserves the chain (a `skip` flag on a check-in row); per-streak target period (daily vs Nx/week).
- **P3** — best-streak badges, reminders, "chain at risk — check in today" nudge.

**Data** — Option A reuses `habits` + `habit_checkins` (already RLS-scoped); add `best_streak` there. Option B needs new `streaks` + `streak_checkins (streak_id, day DATE, skip BOOL)` tables with the standard RLS pair — essentially re-implementing `habit_checkins`.

**Verdict** — **GRADUATE — but really MERGE into Habits.** It is a daily check-in app, not a target goal, and Habits already nails the loop. Effort **near-zero merged / M standalone** (and standalone is mostly duplicated code).
