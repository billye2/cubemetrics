# Spec — The XP Layer

A meta-layer that turns activity across every app into **points, levels, streaks, daily quests,
and achievements**. The product is called *XP Boost* but nothing currently awards XP; this is the
feature that makes 68 separate apps feel like one game-like product.

Status: design spec (research). Grounded in the real schema (`docs/database.md`) and the
RSC + Server Actions architecture (`docs/architecture.md`).

---

## 1. Design principles

1. **Derive, don't instrument.** Compute XP by reading the per-app tables that already exist —
   do **not** edit ~30 `actions.ts` files to emit events. This means historical activity counts
   retroactively and there's a single place to tune the economy.
2. **Lazy daily rollup, no cron.** Materialize one row of XP per user per day into `xp_daily`,
   computed on demand: when a dashboard loads, backfill any missing past days and always recompute
   *today* (today's source rows are still mutable). Bounded work, no scheduled jobs.
3. **Reward breadth and consistency, resist farming.** Per-source daily caps + first-use-of-an-app
   bonuses. Because a day's points are derived from the *current state* of source rows (not from
   toggle events), un-checking and re-checking a todo can't farm points.
4. **Never punish.** Past days freeze once computed; deleting old data doesn't claw back XP. Streak
   has a one-day grace check (matches the existing Focus/Habits streak logic).
5. **On-brand, not in-the-way.** A compact header strip everywhere + one rich dashboard. No modal
   spam.

---

## 2. Data model

All tables: `user_id UUID REFERENCES auth.users ON DELETE CASCADE`, RLS enabled, the standard
owner-`FOR ALL` + SysOp-`SELECT` policy pair (see `docs/database.md`). Rules/definitions live in
**code**, not the DB.

### `xp_daily` — the core rollup (cache)
| Column | Type | Notes |
|--------|------|-------|
| user_id | UUID | PK part |
| day | DATE | PK part — user-local day |
| points | INT | total XP earned that day |
| breakdown | JSONB | `{ "focus": 40, "habits": 24, "todos": 15, … }` per source |
| computed_at | TIMESTAMPTZ | when last recomputed |

PK `(user_id, day)`. This is a derived cache — safe to delete and rebuild.

### `xp_achievements` — unlock ledger
| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT IDENTITY | |
| user_id | UUID | |
| achievement_key | TEXT | matches a definition in code |
| unlocked_at | TIMESTAMPTZ | first time the threshold was crossed |

Unique `(user_id, achievement_key)`. Presence = unlocked; `unlocked_at` drives a "new!" badge.

### `xp_quests` — daily quest progress (optional; can be derived)
| Column | Type | Notes |
|--------|------|-------|
| user_id | UUID | PK part |
| day | DATE | PK part |
| quest_key | TEXT | PK part — the 3 quests chosen for that day |
| completed_at | TIMESTAMPTZ | null until done |

PK `(user_id, day, quest_key)`. Quests are *chosen* deterministically (§6) so this table only
records completion + the claimed bonus; progress itself is read from `xp_daily.breakdown`.

> **No `xp_state` table.** Level, total XP, and streak are cheap aggregates over `xp_daily`
> (`SUM(points)`, consecutive days) — compute on read, don't store a denormalized total that can
> drift. Add a snapshot only if profiling shows the aggregate is slow.

---

## 3. The XP economy (rules registry, in code)

A registry mirroring `catalog.ts`: `src/lib/xp/rules.ts`. Each rule knows how to count a source's
contribution for a given local day, with a cap.

```ts
interface XpRule {
  source: string;          // breakdown key, e.g. "focus"
  label: string;           // "Focus sessions"
  table: string;           // source table
  // returns points for THIS day from the day's rows of this source
  scoreDay(rows: SourceRow[]): number;
  dailyCap: number;        // max points/day from this source (anti-farm)
}
```

Starting economy (tune later — all in one file):

| Source (table / filter) | Points | Daily cap | Rationale |
|---|---|---|---|
| Focus session (`daily_trackers` type=focus) | 10 + 1/10min | 60 | core deep-work |
| Pomodoro completed (`pomodoro_sessions.completed`) | 10 | 40 | core |
| Time Tracker entry (`daily_trackers` type=timetracker) | 5 | 25 | logging effort |
| Todo completed (`todos.completed_at` = day) | 5 | 50 | output |
| Habit check-in (`habit_checkins.checkin_date` = day) | 8 | 40 | consistency |
| Journal entry (`journal_entries.entry_date` = day) | 15 | 15 | reflection (1/day) |
| Any tracker logged (`daily_trackers`, per type) | 3/type | 30 | breadth, not spam |
| Workout log (`logs` type=workout) | 15 | 30 | |
| Goal progress update | 5 / completed 50 | 60 | progress + payoff |
| Reading → completed (`reading_list` finished that day) | 30 | 60 | milestone |
| Checklist item completed | 2 | 20 | small wins |
| Note / log entry created | 3 | 15 | |
| Expense / finance item logged | 2 | 10 | admin |
| **First action in an app today** | +5 bonus | — | rewards breadth |

Day total = `min(sum of capped per-source scores, optional global daily cap ~250)`.

---

## 4. Compute algorithm

`src/lib/xp/compute.ts`:

```
ensureDailyXp(userId, tz):
  days = localDaysFrom(firstActivityDate(userId), today(tz))
  missing = days where no xp_daily row  ∪  {today}     // today always recomputed
  for each day in missing (batched):
     rows = fetch source rows for that local day across all rule tables
     breakdown = { rule.source: min(rule.scoreDay(rows[rule]), rule.dailyCap) }
     upsert xp_daily(userId, day, points=sum(breakdown)+firstUseBonuses, breakdown)
```

- **One window query per source table** for the missing-day span (not per day) → a handful of
  queries total, then bucket in memory by local day using the same `localDateKey` helper trackers
  already use (`_factories/trackerLib.ts`).
- Idempotent: re-running yields the same rows (upsert by PK).
- First-load cost for a long-time user: O(active source rows) once; subsequent loads recompute only
  today.

Aggregates after `ensureDailyXp`:
- `totalXp = Σ xp_daily.points`
- `level`, `xpIntoLevel`, `xpForNextLevel` via the curve (§5)
- `streak` = consecutive days (ending today, or yesterday w/ 1-day grace) where `points > 0`;
  `longestStreak` = longest such run.

---

## 5. Levels

Smooth, ever-harder curve. Total XP required to *reach* level L:

```
xpToReach(L) = 50 * (L-1)^2          // L1=0, L2=50, L3=200, L4=450, L5=800, L10=4050 …
level(total)  = floor( sqrt(total / 50) ) + 1
```

Show: current level, a progress bar `(total - xpToReach(level)) / (xpToReach(level+1) - xpToReach(level))`,
and "X XP to level N+1". Optional level **titles** (Novice → Apprentice → Operator → … ) keyed off
level bands for flavor.

---

## 6. Daily Quests

Three quests per day, **deterministically chosen** from a pool so they're stable across renders
without needing to be written ahead of time:

```
seed = hash(userId + localDay)
todaysQuests = pick3(QUEST_POOL, seed)     // stable for the day
```

Quest pool examples (each maps to a `breakdown`/source check):
- "Complete one focus session"  • "Check in 3 habits"  • "Close 5 todos"
- "Log water 4×"  • "Write a journal entry"  • "Log time in 3 categories"
- "Make progress on a goal"  • "Read for 20 minutes"  • (weekly) "Do your weekly review"

Completion is read from today's `xp_daily.breakdown` / source counts; on first completion write
`xp_quests.completed_at` and award **+20 XP** (recorded as a `quests` source in the breakdown).
All three done → **+50 XP** bonus. Quests reset at local midnight (new seed).

---

## 7. Achievements

Definitions in `src/lib/xp/achievements.ts`; each is a predicate over cumulative stats:

| Key | Name | Condition |
|---|---|---|
| first_step | First Step | earn any XP |
| week_warrior | Week Warrior | 7-day streak |
| unstoppable | Unstoppable | 30-day streak |
| deep_worker | Deep Worker | 50 cumulative focus hours |
| task_master | Task Master | 1,000 todos completed |
| centurion | Centurion | reach level 10 |
| polymath | Polymath | earn XP from 10 different apps |
| early_bird / night_owl | … | activity before 7am / after 11pm |

On dashboard load, after aggregates: evaluate each not-yet-unlocked achievement; insert
`xp_achievements` (unique key prevents dupes). `unlocked_at` within the last day → show a "new!"
celebration on the grid.

---

## 8. UI surfaces

1. **Home header strip** — `src/app/page.tsx` (RSC). Above the app grid: avatar/level chip, XP
   progress bar, streak flame with count, today's XP. Links to the dashboard. Zinc + cyan, 44px tap.
2. **XP dashboard** — new custom app `src/app/app/xp/page.tsx` (+ a `XpView` client island for any
   interactivity like claiming a quest). Add a catalog entry `{ id: "xp", name: "Level", category:
   "time"/"goals", ui: "modern" }`. Sections:
   - Hero: big level + progress ring + streak.
   - **Today's quests** (3 cards, check/claim).
   - **XP over time** — reuse the 7/30-day bar chart pattern from Focus/TimeTracker, fed by
     `xp_daily`.
   - **Breakdown by app** — where your XP came from (stacked, like Time Tracker).
   - **Achievements grid** — unlocked vs. locked (silhouette), newest first.
3. **Optional micro-feedback** — since Server Actions re-render via `revalidatePath`, show a small
   "+15 XP" line on the next render rather than a client toast (keeps it server-driven). A real
   toast can come later with a client event bus.

---

## 9. Edge cases & decisions

- **Timezone.** Day boundaries must be the user's local day (the trackers bucket locally on the
  client). Server-side compute needs a tz: **add `timezone TEXT` to `profiles`** (set from
  `Intl.DateTimeFormat().resolvedOptions().timeZone` at login/first visit). v1 fallback: pass the
  client tz into `ensureDailyXp`, default UTC. Flagged as the one real wrinkle.
- **Mutable today.** Today's row is recomputed every visit, so same-day deletes/edits are reflected;
  past days are frozen (friendly, and keeps cost bounded).
- **Backfill cost.** First dashboard load for an existing heavy user computes all historical days
  once. If that's slow, cap backfill to the last 90 days for the chart and lazily extend.
- **No double counting.** Per-day derivation from current rows + per-source caps means re-toggling
  state can't inflate points.
- **Privacy.** All `xp_*` tables are RLS owner-only; XP is personal, no leaderboards in v1 (could be
  an opt-in later).

---

## 10. Rollout phases

- **Phase 1 — Economy + levels (M).** `xp_daily`, rules registry, `ensureDailyXp`, level/streak
  aggregates, the home header strip. Ship the core loop: activity → XP → level → streak.
- **Phase 2 — Dashboard + achievements (M).** `/app/xp` page with charts + breakdown,
  `xp_achievements` + definitions, catalog entry.
- **Phase 3 — Daily quests (S/M).** `xp_quests`, deterministic quest pool, claim flow + bonuses.
- **Phase 4 — Polish (S).** Level titles, "+XP" micro-feedback, new-achievement celebration,
  `profiles.timezone`.

---

## 11. Testing

- **Pure functions first** (Vitest, matches the existing test setup): `level()`/`xpToReach()`
  monotonic & inverse-consistent; `scoreDay` honors caps; streak with gaps/grace; `pick3` stable
  per seed and well-distributed.
- **Compute idempotency**: running `ensureDailyXp` twice yields identical `xp_daily`.
- **Anti-farm**: toggling a todo complete/incomplete/complete nets the same day points as completing
  once.
- **Timezone**: an action at 11pm local lands on the right local day, not UTC's.

---

## 12. Open questions (your call)

- **Scope of v1** — ship Phase 1 alone (header + levels + streak) to validate the loop, or bundle
  Phases 1–2?
- **Leaderboards / social** — keep XP purely personal, or plan an opt-in friends comparison?
- **Economy tuning** — the §3 numbers are a first guess; worth a quick pass on what you want to
  reward most (deep work? consistency? breadth?).
- **Where it lives** — a top-level header strip + `/app/xp`, or fold the dashboard into the
  existing home page?
