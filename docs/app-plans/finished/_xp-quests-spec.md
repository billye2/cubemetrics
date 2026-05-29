# Spec — XP Quests module (`src/lib/xp/quests.ts` + claim flow)

Phase 3 of the XP layer (`_xp-layer-spec.md` §6). The levels/streaks/achievements layer shipped in
commit `af3880f`; the `xp_quests` table already exists (migration `020`). This specs the missing
piece: **three daily quests, chosen deterministically, auto-claimed when met, awarding bonus XP.**

Grounded in the shipped code:
- `rules.ts` → `DayActivity` (per-day counts), `scoreDay()`, `DayScore { points, breakdown }`.
- `compute.ts` → `ensureXp(supabase, userId, now)` already builds a `DayActivity` per day and
  upserts `xp_daily`; this is where quest logic hooks in.
- `xp_quests` table → PK `(user_id, day, quest_key)`, `completed_at`.

---

## 1. Design

- **Daily, deterministic, auto-claimed.** Each local day offers 3 quests picked by
  `hash(userId + day)` — stable across renders with nothing written ahead of time. A quest
  completes automatically the moment its metric crosses the target (no manual "claim" tap), matching
  the layer's *derive-don't-instrument* and *server-driven feedback* principles.
- **Claims persist (never punish).** Completion is recorded in `xp_quests`. Quest XP is then derived
  from the *claimed rows*, **not** from live metrics — so completing "close 5 todos" and later
  deleting one keeps the reward. The PK makes the insert idempotent.
- **Quest XP lives in the day's breakdown** under a synthetic `quests` source, so it flows through
  the existing `xp_daily` rollup, the 30-day chart, and the breakdown totals with no new plumbing.
- **Evaluate against counts, not points.** Quest progress reads `DayActivity` counts (e.g.
  `habits`, `todos`), never the capped `breakdown` points (which can't be inverted to a count).

---

## 2. Module API — `src/lib/xp/quests.ts` (pure, unit-tested)

```ts
/** Per-day metrics a quest can target. All derivable from rules.ts DayActivity. */
export interface QuestMetrics {
  focusSessions: number;     // a.focus.length
  focusMinutes: number;      // sum of a.focus[].minutes
  timetrackerEntries: number;// a.timetracker
  distinctTrackers: number;  // a.trackerTypes.length
  pomodoros: number;         // a.pomodoro
  todos: number;             // a.todos
  habits: number;            // a.habits
  journalEntries: number;    // a.journal
  workouts: number;          // a.workout
  booksFinished: number;     // a.reading
  notes: number;             // a.notes
  logEntries: number;        // a.logs
  activeSources: number;     // distinct sources scored that day (breadth)
}

/** Map a day's DayActivity (+ its DayScore for activeSources) to quest metrics. Pure. */
export function metricsFromActivity(a: DayActivity, score: DayScore): QuestMetrics;

export interface QuestDef {
  key: string;                 // stable id, matches xp_quests.quest_key
  label: string;               // "Deep work"
  description: string;         // "Complete a focus session"
  metric: keyof QuestMetrics;  // which metric this quest watches
  target: number;              // metric value needed to complete
  reward: number;              // XP awarded on completion
  icon: string;                // geometric unicode to match the catalog (NOT emoji)
}

export const QUEST_POOL: QuestDef[];      // ~10–14 defs (see §3)
export const DAILY_QUEST_COUNT = 3;
export const ALL_COMPLETE_BONUS = 50;     // bonus when all 3 are done

/** Deterministic 32-bit hash (FNV-1a) over a string. No Math.random. */
export function questSeed(userId: string, day: string): number;

/**
 * The 3 quests offered to a user on a given local day. Deterministic: same
 * (userId, day) always yields the same 3, in the same order, with no repeats
 * within the day. Stable across renders without persistence.
 */
export function pickDailyQuests(userId: string, day: string, count = DAILY_QUEST_COUNT): QuestDef[];

export interface QuestStatus {
  def: QuestDef;
  current: number;   // metrics[def.metric]
  target: number;
  done: boolean;     // current >= target
}

/** Progress of each of today's quests against the day's metrics. Pure. */
export function questStatuses(quests: QuestDef[], metrics: QuestMetrics): QuestStatus[];

/**
 * XP from quests for a day: sum of rewards for claimed keys that are in the
 * day's chosen set, plus ALL_COMPLETE_BONUS iff all chosen quests are claimed.
 * Derived from xp_quests rows (claimed), not from live metrics.
 */
export function questPointsForDay(chosen: QuestDef[], claimedKeys: Set<string>): number;
```

**Pick algorithm (deterministic shuffle, no repeats):**
sort the pool's indices by `questSeed(userId, `${day}:${i}`)`, take the first `count`. Well
distributed, stable, repeat-free. *(Optional polish: also derive yesterday's set and skip overlap
when the pool is large enough, so quests feel fresh day-to-day.)*

---

## 3. Quest pool (first cut — all expressible from `QuestMetrics`)

| key | label | metric | target | reward |
|-----|-------|--------|--------|--------|
| focus_one | Deep work | focusSessions | 1 | 20 |
| focus_hour | In the zone | focusMinutes | 60 | 25 |
| pomo_two | Two pomodoros | pomodoros | 2 | 20 |
| todos_five | Clear the deck | todos | 5 | 20 |
| habits_three | Habit hat-trick | habits | 3 | 20 |
| journal_one | Reflect | journalEntries | 1 | 20 |
| track_three | Check your stats | distinctTrackers | 3 | 20 |
| time_log | Account for it | timetrackerEntries | 3 | 20 |
| workout_one | Move | workouts | 1 | 20 |
| notes_one | Capture a thought | notes | 1 | 15 |
| breadth_four | Well-rounded | activeSources | 4 | 25 |

Tune in this one file. Rewards land in the `quests` breakdown source; a full 3/3 day ≈ 60 + 50 = 110
quest XP on top of activity XP, still under the 300/day `GLOBAL_DAILY_CAP`.

> **Water-specific quests** ("log water 4×") need a per-tracker-type count, which `DayActivity`
> doesn't carry (it only keeps `trackerTypes` distinct). Out of scope for v1; if wanted, add a
> `trackerCounts: Record<string, number>` to `DayActivity` and a metric for it.

---

## 4. Claim flow — changes to `compute.ts`

`ensureXp` already fetches all rows, builds a `DayActivity` per day, and scores each day. Add:

1. **Fetch claims once:** `select day, quest_key from xp_quests where user_id = userId`. Group into
   `Map<day, Set<quest_key>>`.
2. **Auto-claim today.** For `todayKey`:
   - `metrics = metricsFromActivity(todayActivity, todayScore)`
   - `chosen = pickDailyQuests(userId, todayKey)`
   - `newlyDone = questStatuses(chosen, metrics).filter(q => q.done && !claimedToday.has(q.def.key))`
   - if any, `upsert` them into `xp_quests` (`onConflict: "user_id,day,quest_key", ignoreDuplicates`)
     with `completed_at = now`; add their keys to `claimedToday`.
   - (Auto-claim runs for **today only** — quests are completable only on their own day. Past days'
     claims already exist in `xp_quests`.)
3. **Fold quest XP into every day's score.** When scoring day `D`, after `scoreDay(activity)`:
   - `qp = questPointsForDay(pickDailyQuests(userId, D), claimsByDay.get(D) ?? emptySet)`
   - if `qp > 0`, set `breakdown.quests = qp` and `points = min(points + qp, GLOBAL_DAILY_CAP)`.
   - Because `pickDailyQuests` is deterministic, the chosen set for any past day is recomputable, so
     historical quest XP is consistent.
4. **Surface in `XpSummary`.** Add:
   ```ts
   todayQuests: { key; label; description; icon; current; target; done; reward }[];
   questsCompletedToday: number;       // 0..3
   ```
   Populated from `questStatuses(chosen, metrics)` merged with `claimedToday`.

`SOURCE_LABELS.quests = "Quests"` already-style entry added to `rules.ts`.

No new server action is required for auto-claim. *If* a deliberate manual "Claim" tap is preferred
over auto-claim, add `claimQuestAction(questKey)` in an `actions.ts` that re-runs the eligibility
check server-side before inserting (never trust the client), then `revalidatePath("/app/xp")`.

---

## 5. UI — `src/app/app/xp/page.tsx` (+ its client island)

A "Today's quests" section above the chart: 3 cards, each with icon, label, a progress bar
(`current/target`), the reward, and a done state (cyan check + struck reward). When
`questsCompletedToday === 3`, show the `+50` all-complete flourish. Auto-claim means cards flip to
done on the next server render after the action that completed them — consistent with the layer's
server-driven feedback (no client toast in v1).

Reset is implicit: a new local day → new `questSeed` → new 3 quests, yesterday's claims frozen in
`xp_quests`.

---

## 6. Edge cases

- **Timezone.** Quests inherit whatever day boundary `ensureXp` uses. Note the layer currently uses
  server-local `now`/`dayKey`, not `profiles.timezone` — quests share that open issue (a late-night
  completion could land on the server's next day). Fixing it in `compute.ts` fixes quests too.
- **Idempotency.** Re-running `ensureXp` re-derives the same chosen sets and re-claims nothing new
  (PK + `ignoreDuplicates`); quest points are recomputed identically.
- **Metric regression.** Deleting source data after a claim leaves the claim (and its XP) intact —
  intended.
- **Pool changes.** Renaming/removing a `QuestDef.key` orphans old `xp_quests` rows; `questPointsForDay`
  ignores keys not in the day's chosen set, so stale rows simply stop contributing. Prefer adding new
  keys over reusing old ones.

---

## 7. Tests (Vitest, alongside the existing xp tests)

- `pickDailyQuests` — deterministic per `(user, day)`; returns exactly `DAILY_QUEST_COUNT` distinct
  defs; distribution across the pool is roughly uniform over many days.
- `questSeed` — stable and well-spread (no obvious collisions for nearby days).
- `metricsFromActivity` — maps each `DayActivity` field to the right metric.
- `questStatuses` — `done` exactly when `current >= target`.
- `questPointsForDay` — sums claimed rewards; adds `ALL_COMPLETE_BONUS` only when all chosen are
  claimed; ignores claimed keys outside the chosen set.
- **Claim idempotency** — two `ensureXp` runs produce one `xp_quests` row per quest and identical
  totals.
- **Never-punish** — claim survives a metric dropping below target on a later run.

---

## 8. Rollout

1. `quests.ts` (pool + pick + metrics + scoring helpers) — pure, fully testable in isolation.
2. Wire into `ensureXp` (fetch claims, auto-claim today, fold quest points, extend `XpSummary`).
3. Quests section on the dashboard.
4. (Optional) manual claim action; weekly quests (a `week:<isoweek>` keyed variant of the same
   table); avoid-yesterday polish.
