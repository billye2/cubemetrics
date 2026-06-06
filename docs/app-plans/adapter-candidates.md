# Adapter Candidates — what's ready, and what needs a field

A grounded audit of which mini-apps can get a Spine `today()` adapter, backing the roadmap in
[the seed-archetype spec](agent-phase-d-seed-archetypes.md) §4 and the [Agent Layer](agent-layer.md).
**Update 2026-06-06: 39 apps now have adapters** (registry grew 6 → 39 over the 06-05/06 sessions).
Recently shipped: `steps`, `caffeine`, `stress`, `brag`, `productivity`, `screentime`,
`writingtracker`, `gratitude`, `grocery`, then the household-chore checklists `cleaning`,
`homemaint`, `petcare`, `packing`. `caffeine`/`screentime` use the `trackerLimitToday` "at-most"
builder. **Deliberately skipped** (Today-noise — always-on aspirational lists): `wishlist`,
`bucketlist`, `backlog`. **Logbooks skipped** for now too — episodic ones (`learninglog`, `standup`,
`retro`, `meeting`, …) would nag as daily presence cards. The list below remains the backlog.

## The bar (important: you don't need a numeric target)
A `SpineToday` card needs only to compute a **`severity`** (`overdue/due/upcoming/done`) and a
**`count`**. `progress` (the ring) and `items` deep-links are optional. Every adapter is one of three
patterns already shipped:

| Pattern | Exemplar | Needs | Produces |
|--------|----------|-------|----------|
| **Due** | `bills` | a date (`due_date`, or `last_done`+`interval`) + done flag | overdue/due/done — *most actionable* |
| **Progress** | `water` | a daily total + a target (from catalog `config`) | a ring (5/8) |
| **Presence** | `journal` | a daily date anchor (`entry_date`/`checkin_date`) | "did you do it today?" done/due |

So a "completion field" or a "target" is **not** required — presence of a dated row is completion;
the target is optional polish. That makes most apps Tier-1 ready with **no migration**.

---

## Tier 1 — Ready now, zero migration (build these first)
Each already carries everything its pattern needs. Grouped by pattern, with the table it reuses.

### Due / recurring — the highest-value cards (actionable, "this is overdue")
The `last_done + interval` → next-due computation is exactly the `bills` pattern; no status column is
needed (it's computed at read time).

| App | Table | Why ready |
|-----|-------|-----------|
| **medication** ⭐ | `schedule_items` (`last_done`, `interval_days`) | computed next-due; high-signal health nudge |
| **plantcare** ⭐ | `plants` (`last_watered`, `frequency_days`) | computed due; spine.md's literal example |
| **keepintouch** ⭐ | `contacts` (`last_contacted`, `cadence_days`) | computed due; spine.md explicitly wanted this nudge |
| **carcare** | `schedule_items` | same pattern as medication |
| **subscriptions**, **invoices** | `finance_items` (`due_date`, `paid`) | identical to the shipped `bills` adapter — near-copy |
| **flashcards** ⭐, **vocabulary** ⭐ | `flashcards`/`vocab_words` (`due_date` SRS) | "N cards due today" — anchors the Student archetype |

### Progress / goal
| App | Table | Why ready |
|-----|-------|-----------|
| **goals** ⭐ | `goals` (`target_value`, `current_value`, `status`, `due_date`) | the literal goal table — fully ready, ironically still has no adapter |
| **milestones**, **streaks**, **challenge** | `goals` | same table, same adapter shape |
| **courses** ⭐ | `goals` (goal_type) | progress toward completion — anchors Student |
| **savings** | `goals` + `savings_contributions` | progress to target |
| **debtpayoff** ⭐ | `debts` (`current_balance` vs `original_balance`, `status`) | full progress + status |
| **skilltree** | `skills`/`skill_practice` (`xp`) | progress vs level curve |

### Presence / daily tracker
All use `daily_trackers` (`entry_date`, `value`) — a logged row today = done; absent = due. Where a
`dailyGoal` already exists in `config` (e.g. `sleep`, `caffeine`), render a ring; otherwise a presence
toggle (like `journal`).

`mood` ⭐, `sleep` ⭐, `energy` ⭐, `weight`, `stress`, `caffeine`, `screentime`, `meditation`,
`productivity`, `writingtracker` — plus **workout** (`workout_sessions.performed_on`, presence).

### Open-count / informational
| App | Table | Card |
|-----|-------|------|
| **projecttracker** ⭐ | `projects`/`project_tasks` (`status`, `due_date`, task %) | active projects + task progress — anchors Sprint |
| **kanban** | `kanban_cards` (`column_name`) | "N in progress · M to do" (count card, no date needed) |
| **calendar** | `calendar_events` (`start_date`) | "what's on today" — informational, no done state |
| **countdown** | `countdowns` (`target_date`) | "X days until Y" — informational |
| **expenses** | `expenses` + `budget_targets` | today's / month's spend vs budget |

> That's **~30 apps** reachable with no schema change — 5× the current coverage. Prioritize the ⭐
> rows: they're the ones that light up the Phase-D seed archetypes (Money, Fitness, Health, Student,
> Sprint, Mindful) and the highest-value proactive nudges (medication, keepintouch, plants).

---

## Tier 2 — One small field unlocks a much better adapter
This is the heart of your question. A handful of apps are usable-but-weak today and become genuinely
good with a tiny addition.

### 1. `checklists` → add a nullable `due_date` — **highest leverage single change**
`checklists` has `completed` + `sort_order` but **no date anchor**. So an adapter can only say "N open
items" — it can't distinguish *today's plan* from an evergreen someday-list, and can't do due/overdue.
Adding one nullable column unlocks **dailyplanner, routines, grocery, cleaning, homemaint, packing,
travelplanner, bucketlist, wishlist, backlog** (~10 apps) as real Due-pattern cards — and makes
**dailyplanner** (a daily-scoped planner) actually work.
```sql
alter table public.checklists add column if not exists due_date date;  -- nullable
```
*Ships usable without it (count card); the field upgrades count → due/overdue + day-scoping.*

### 2. Trackers that want a ring → add `dailyGoal` to **catalog config** (no DB change)
Trackers without a target render as presence toggles. Where a daily number is meaningful (e.g.
`steps`, `screentime` as an at-most cap), add `dailyGoal`/`goalDirection` to the app's
`catalog/apps/<id>.json` `config` — the `water` adapter already reads exactly this. JSON-only, no
migration.

### 3. `workout` → add a **weekly target** (catalog config) for a progress card
Presence works today ("worked out ✓"). For the Fitness archetype's "2 / 3 workouts this week" ring,
add a `weeklyTarget` to config and have the adapter count `workout_sessions` in the local week. Config
only.

### 4. `reading` → add a reading goal to be *actionable*
`reading_list` is a status pipeline (`to_read/reading/finished`) with no cadence, so an adapter can
only show "currently reading: N" (informational). To make it a daily nudge, add a
`pages_per_day`/`books_per_month` goal (config or a small column). Lower priority — informational is
fine for v1.

---

## Tier 3 — Skip (not daily-actionable; no field fixes that)
`notes`, `recipes`, `visionboard`, `inventory`, `bookmarks`, `fileindex`, `warranty`, and the passive
logbooks (`meeting`, `standup`, `brainstorm`, `retro`, `oneononep`, `interviews`, `brag`,
`feedbacklog`, `learninglog`) are libraries or append-only journals with no per-day "should I act"
signal. `decisionmatrix` (`revisit_at`) and `jobtracker`/`clienttracker` (`stage`/`next_action_date`)
are *marginal* — they have a date+status and could surface "1 decision to revisit" / "2 clients need a
next action," but the daily value is low. Build them only if a user pins them.

---

## Recommended build order (ties to the seed archetypes)
1. **Zero-migration ⭐ batch**, in archetype-impact order: `goals`, `sleep`, `mood`, `medication`,
   `keepintouch`, `plantcare`, `courses`, `flashcards`, `projecttracker`, `debtpayoff`,
   `subscriptions`, `energy`, `workout`. → immediately enriches Money / Fitness / Health / Student /
   Sprint / Mindful presets.
2. **`checklists` `due_date` migration** → unlocks the dailyplanner/routines/household cluster
   (Deep-Work, Home, Student archetypes).
3. **Config targets** for trackers + `workout` weekly goal → rings where they add motivation.
4. Revisit Tier-3 marginals only on demand.

Each adapter is a small read-only `today()` over an existing table (the writes already exist via the
factory actions), so these are low-risk, parallelizable, one-file-per-app additions — exactly the
collision-free shape the spine registry was built for. Per spine governance, each new adapter is a
`src/lib/spine/adapters/<id>.ts` + `npm run build:spine`.

> **Worked example:** a complete, drop-in reference adapter (builder + adapter + registry + tests) for
> `medication` — the `schedule_items` due/recurring pattern, shared with `carcare` (the only other
> `ui: "schedule"` app) — is in **[adapter-reference-medication.md](adapter-reference-medication.md)**.
> **Shipped:** `medication`, `carcare`, `goals`, `keepintouch`, `plantcare`, `mood`, `energy`, `sleep`,
> `invoices`, `flashcards`, `vocabulary`, `projecttracker`. (`subscriptions` skipped — no `due_date`.
> `expenses` skipped — the `budget` adapter already surfaces spend-vs-budget from the same table.)
