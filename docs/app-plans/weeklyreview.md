# Weekly Review (`weeklyreview`)

**Purpose** — A structured weekly retrospective: review wins, misses, and lessons, then set next week's focus.

**Current state** — Generic `LogbookView` (`hasTitle: true`, `entryLabel: "Review"`). Title + textarea. The review's four-part structure is lost, and the week it covers is implicit.

**Gaps**
- No structured sections — reviews come out inconsistent and shallow.
- No notion of *which week* a review covers (just a created date).
- The most valuable input — what actually happened this week across the other apps — isn't pulled in; the user reconstructs it from memory.

**Plan** — **GRADUATE-ish**: keep `logs` but build a custom structured page (or a dedicated table).
- [x] **P1** — A weekly-cadence entry keyed to a **week (date range)**, defaulting to the current ISO week, with **structured sections**: Wins / Misses / Lessons / Next-week focus (each its own textarea, rendered as headed blocks). One review per week; button flips to "Edit this week's review." *(Shipped: graduated to a `weekly_reviews` table; custom page at `/app/weeklyreview` with Mon→Sun week nav and an upsert keyed to `(user_id, week_start)`.)*
- [x] **P2** — **Pull stats from other apps** into the review header for the covered week: habits completed (`habit_checkins`), focus minutes (`daily_trackers` `focus`), todos done (`todos.completed_at`), time tracked (`daily_trackers` `timetracker`). Shown read-only at the top so the reflection is grounded in real data. *(Read-only queries; no writes to those tables.)*
- [~] **P3** — **Carry forward**: last week's "Next-week focus" appears at the top of this week's review ("did you do it?"). *(Shipped the carry-forward prompt.)* Streak of consecutive weeks reviewed + a "missed last week?" nudge are **still P3 / not yet built.**

**Data** — Graduated to a `weekly_reviews` table (preferred for clean section editing + cross-app joins). Stats are read-only queries against existing app tables; no writes there.

**Schema delta** (migration `20260530T0529_weekly_reviews.sql`, **not yet applied to the remote**):

```
weekly_reviews
  id          BIGINT IDENTITY PK
  user_id     UUID  → auth.users ON DELETE CASCADE
  week_start  DATE  NOT NULL          -- Monday of the reviewed week (local)
  wins        TEXT  NOT NULL DEFAULT ''
  misses      TEXT  NOT NULL DEFAULT ''
  lessons     TEXT  NOT NULL DEFAULT ''
  next_focus  TEXT  NOT NULL DEFAULT ''
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  UNIQUE (user_id, week_start)         -- backs the upsert (one review per week)
  INDEX (user_id, week_start DESC)
  RLS: owner FOR ALL + SysOp SELECT (standard pair)
```

Note for the integrator: tracker stats (`focus`/`timetracker`) are summed over `daily_trackers.created_at` (the factory/Focus actions don't populate `entry_date`), interpreted in the DB session timezone — a close-enough approximation for a weekly rollup, not a per-local-day exact match.

**Verdict** — **GRADUATE-ish** to a structured weekly template with cross-app stats. Effort **M**. **P1 + P2 shipped; P3 partial (carry-forward done, streak/nudge pending).**
