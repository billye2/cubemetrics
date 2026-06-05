# Phase D — Seed Archetype Set

The starter library for the [Dashboard Archive](agent-phase-d-dashboard-archive.md): a handful of
curated `dashboard_presets` rows (`source='curated'`) that give a new user a **fitted Today layout
instantly, zero model call**, and that the agent's generate-on-miss path can later add to.

> Companion to Phase D. These are the concrete seed rows — composition, tags, focus copy, and the
> adapter-coverage they imply.

---

## 1. The hard constraint, and the elegant way around it
A preset can only **render** apps that have a Spine adapter. **Today that's 6:** `bills, budget,
habits, journal, todo, water`. The catalog has **94 apps**, so an honest "Fitness focus" or "Money
month" wants ~7 apps that mostly don't have adapters yet.

**Resolution — store the ideal, render the covered subset, self-upgrade as adapters land:**
- Seed each archetype with its **full ideal `app_ids`** (7-ish apps).
- At load, `resolveTodayApps` (Phase A) **already drops ids without an adapter** (the stale-filter).
  So a preset renders only its covered apps today and **automatically enriches the day an adapter
  ships — no data migration, no preset edit.**
- The seed set therefore doubles as a **prioritized adapter-coverage roadmap** (§4): the apps that
  recur across archetypes are exactly the adapters worth building next. New breadth → richer presets
  by construction (the spine governance flywheel, pointed at the archive).

**Implication for scheduling:** the presets are differentiated and compelling once ~15–20 adapters
exist. With 6, several archetypes collapse to overlapping 1–2-app sets (§3 "shippable today"). Ship
the seed rows whenever Phase D lands, but expect them to feel thin until the §4 adapters are built.

## 2. Archetype design rules
- **`tags` = the distinct `category` ids of the app_ids** (the match vector; derived, not invented),
  optionally plus 1–2 explicit mood labels. Vocabulary is the catalog's stable `CATEGORIES`
  (`time, tasks, goals, habits, notes, finance, learning, org, work, lifestyle`).
- **`app_ids` ≤ 8** (the Today cap), listed **in priority order** — order decides selection when more
  than the cap are covered; final on-screen grouping is still severity-sorted by `groupBySeverity`.
- **`focus`** = one generic, non-personal line (it's shared, so never user-specific text — §8 of Phase D).
- `source='curated'`, `slug` set, `created_by=null`.

Legend below: ✅ = adapter exists today · ⬜ = needs an adapter (renders once built).

## 3. The eight archetypes

### 1. `deep-work` — Deep Work
For people protecting focus time and a short list of priorities.
- **tags:** `time, tasks, notes`
- **app_ids (ideal):** `todo`✅, `focus`⬜, `pomodoro`⬜, `prioritymatrix`⬜, `dailyplanner`⬜, `timetracker`⬜, `notes`⬜
- **focus:** *"Protect deep work — one priority at a time."*
- **shippable today (covered):** `todo`

### 2. `money-month` — Money Month
For getting on top of bills, budget, and spending this month.
- **tags:** `finance`
- **app_ids (ideal):** `budget`✅, `bills`✅, `expenses`⬜, `subscriptions`⬜, `savings`⬜, `income`⬜, `networth`⬜
- **focus:** *"Stay on top of every dollar this month."*
- **shippable today:** `budget`, `bills` ← strongest current preset

### 3. `fitness-body` — Fitness & Body
For training consistency, hydration, and recovery.
- **tags:** `habits`
- **app_ids (ideal):** `workout`⬜, `water`✅, `weight`⬜, `sleep`⬜, `energy`⬜, `habits`✅, `mealplanner`⬜
- **focus:** *"Show up for your body — move, hydrate, rest."*
- **shippable today:** `water`, `habits`

### 4. `health-reset` — Health Reset
A gentle recovery mode: meds, sleep, mood, light reflection.
- **tags:** `habits, lifestyle, notes`
- **app_ids (ideal):** `medication`⬜, `sleep`⬜, `mood`⬜, `stress`⬜, `water`✅, `journal`✅, `energy`⬜
- **focus:** *"Gentle and consistent — rest, meds, check in."*
- **shippable today:** `water`, `journal`

### 5. `student-semester` — Student / Semester
For keeping up with classes and steady study.
- **tags:** `learning, tasks, notes`
- **app_ids (ideal):** `todo`✅, `reading`⬜, `courses`⬜, `flashcards`⬜, `learninglog`⬜, `dailyplanner`⬜, `habits`✅
- **focus:** *"Keep up with classes — study a little every day."*
- **shippable today:** `todo`, `habits`

### 6. `project-sprint` — Side-Project Sprint
For shipping a project with daily small wins.
- **tags:** `work, goals, tasks`
- **app_ids (ideal):** `todo`✅, `projecttracker`⬜, `kanban`⬜, `goals`⬜, `milestones`⬜, `timetracker`⬜, `brag`⬜
- **focus:** *"Ship the project — small wins, logged daily."*
- **shippable today:** `todo`

### 7. `home-household` — Home & Household
For running the home: chores, supplies, bills, dependents.
- **tags:** `lifestyle, org, finance`
- **app_ids (ideal):** `todo`✅, `grocery`⬜, `cleaning`⬜, `homemaint`⬜, `bills`✅, `plantcare`⬜, `petcare`⬜
- **focus:** *"Keep the home running — chores, supplies, bills."*
- **shippable today:** `todo`, `bills`

### 8. `mindful-reflect` — Mindful & Reflect
A slow, reflective mode: journaling, mood, meditation.
- **tags:** `notes, habits, time`
- **app_ids (ideal):** `journal`✅, `mood`⬜, `meditation`⬜, `sleep`⬜, `habits`✅, `notes`⬜
- **focus:** *"Slow down — reflect, breathe, notice."*
- **shippable today:** `journal`, `habits`

> **Category coverage check:** the eight archetypes' tags span all ten categories
> (time, tasks, goals, habits, notes, finance, learning, org, work, lifestyle), so the onboarding
> picker's category chips always route to at least one archetype.

## 4. Adapter build-priority (the roadmap the seed set implies)
> Full schema-grounded audit (what's ready zero-migration vs. what needs a field) in
> **[adapter-candidates.md](adapter-candidates.md)**. Headline: ~30 apps are adapter-ready with no
> schema change; the one high-leverage migration is adding a nullable `due_date` to `checklists`.

Non-adapter apps ranked by how many archetypes they'd enrich — **build these adapters next, in this
order, to make the presets pay off:**

| Priority | App | Appears in | Why |
|:---:|------|:--:|------|
| 1 | `sleep` | 3 (Fitness, Health, Mindful) | highest cross-archetype leverage |
| 2 | `mood` | 2 (Health, Mindful) | wellness signal; cheap tracker |
| 3 | `energy` | 2 (Fitness, Health) | tracker |
| 4 | `dailyplanner` | 2 (Deep Work, Student) | tasks |
| 5 | `notes` | 2 (Deep Work, Mindful) | notes |
| 6 | `expenses` | 1 (Money) | completes the strongest preset |
| 7 | `workout` | 1 (Fitness) | central to Fitness despite single use |
| 8 | `medication` | 1 (Health) | already a `schedule` app → adapter is easy + high-signal |
| 9 | `projecttracker` | 1 (Sprint) | anchors the work archetype |
| 10 | `reading` / `courses` | 1 (Student) | anchors the learning archetype |

Many of these are **template apps** (trackers/schedule), so their adapters are small `today()`
read-only wrappers over existing tables — low cost, and writes already exist via the factory actions.

## 5. Seed rows (drop-in shape for `dashboard_presets`)
Store the **ideal** `app_ids`; the loader filters to covered apps automatically (§1).

```jsonc
// scripts/seed-presets.mjs  (or an INSERT in the dashboard_presets migration)
[
  { "slug":"deep-work",       "title":"Deep Work",            "tags":["time","tasks","notes"],
    "app_ids":["todo","focus","pomodoro","prioritymatrix","dailyplanner","timetracker","notes"],
    "focus":"Protect deep work — one priority at a time.",      "source":"curated" },
  { "slug":"money-month",     "title":"Money Month",          "tags":["finance"],
    "app_ids":["budget","bills","expenses","subscriptions","savings","income","networth"],
    "focus":"Stay on top of every dollar this month.",          "source":"curated" },
  { "slug":"fitness-body",    "title":"Fitness & Body",       "tags":["habits"],
    "app_ids":["workout","water","weight","sleep","energy","habits","mealplanner"],
    "focus":"Show up for your body — move, hydrate, rest.",     "source":"curated" },
  { "slug":"health-reset",    "title":"Health Reset",         "tags":["habits","lifestyle","notes"],
    "app_ids":["medication","sleep","mood","stress","water","journal","energy"],
    "focus":"Gentle and consistent — rest, meds, check in.",    "source":"curated" },
  { "slug":"student-semester","title":"Student / Semester",   "tags":["learning","tasks","notes"],
    "app_ids":["todo","reading","courses","flashcards","learninglog","dailyplanner","habits"],
    "focus":"Keep up with classes — study a little every day.", "source":"curated" },
  { "slug":"project-sprint",  "title":"Side-Project Sprint",  "tags":["work","goals","tasks"],
    "app_ids":["todo","projecttracker","kanban","goals","milestones","timetracker","brag"],
    "focus":"Ship the project — small wins, logged daily.",     "source":"curated" },
  { "slug":"home-household",  "title":"Home & Household",     "tags":["lifestyle","org","finance"],
    "app_ids":["todo","grocery","cleaning","homemaint","bills","plantcare","petcare"],
    "focus":"Keep the home running — chores, supplies, bills.", "source":"curated" },
  { "slug":"mindful-reflect", "title":"Mindful & Reflect",    "tags":["notes","habits","time"],
    "app_ids":["journal","mood","meditation","sleep","habits","notes"],
    "focus":"Slow down — reflect, breathe, notice.",            "source":"curated" }
]
```

## 6. How matching uses these (ties back to Phase D §5)
- The onboarding picker offers the ten category chips ("What do you want to stay on top of?"). The
  selected chips = the user's `need` tag set.
- `matchPreset(need, presets, T)` scores each row by tag overlap (weighted Jaccard) and returns the
  best ≥ T, else null → agent generates. A user picking *finance* lands on `money-month`; *habits +
  notes* lands on `mindful-reflect` or `health-reset` (tie broken deterministically, later by
  adoption — Phase D §9).
- On a hit, write the preset's (filtered) `app_ids` + `focus` into `today_prefs`
  (`updated_by='preset'`); `resolveTodayApps` renders it; offer "Tune this" → Phase-A agent.

## 7. Open questions
1. **Validate the eight** against the owner's real usage — are these the right life-modes, or should
   one be swapped (e.g. a `job-hunt` archetype using `jobtracker`/`interviews`, or `travel`)?
2. **Tag weighting** — should the *primary* category (the one most app_ids share) score higher than
   incidental ones, so `money-month` isn't diluted by its lone non-finance app? (Recommend yes.)
3. **Multiple matches** — if two archetypes tie, offer the user a **choice of 2** rather than
   auto-picking? Low-friction and avoids a wrong auto-load.
4. **Focus copy ownership** — owner-write the eight focus lines for voice, or accept these as drafts?

## 8. Test notes (extends Phase D §13)
- Tag-derivation: each seed row's `tags` equals the distinct categories of its (full) `app_ids`.
- Coverage: the union of all archetype tags = all ten `CATEGORIES` (guards against an unreachable chip).
- Load-filter: a preset with ideal app_ids renders only the adapter-backed subset; adding an adapter
  (mock) enriches it with no row change.
- `matchPreset`: each single-category need maps to a sensible archetype; below-T need → null.
