# App-plan status index

The at-a-glance tracker for **what's shipped vs. what's open**, so we don't re-audit the whole
folder every session. Updated as work lands (builder role: tick the plan's own checkboxes too).

**Last synced:** 2026-05-29 (against the code, not memory).

## Legend

| Mark | Meaning | Lives where |
|------|---------|-------------|
| ✅ **Done** | Entire app-specific scope shipped. Only *shared-template* upgrades (tracked in the `_*-template.md` files) remain. | `finished/` |
| 🟢 **At bar** | P1 (and usually P2) shipped; the app is complete and usable. Only its *own* P2/P3 polish is open. | here |
| 🟡 **Partial** | Works, but has notable open P1/P2 gaps worth a future pass. | here |
| 🔴 **Graduate** | Still rendered by a factory template; the plan calls for a custom app that isn't built yet. | here |

> Conservative archive rule: a plan only moves to `finished/` when **no app-specific work remains**.
> "At bar" apps with their own open P2/P3 stay here on purpose, so nothing gets hidden.

## Custom apps

| App | Status | Open (own) work |
|-----|--------|-----------------|
| calendar | 🟢 At bar | P3: reminders, color categories, week view, ICS |
| focus | 🟢 At bar | P2: completion cues, pause/resume, daily goal |
| timetracker | 🟢 At bar | P2: live timer, edit, budgets, CSV |
| pomodoro | 🟢 At bar | P3: ambient sound, task linkage |
| workout | 🟢 At bar | P3: rest timer, last-time inline, body-part filter |
| flashcards | 🟢 At bar | P3: cram mode, per-deck retention chart, vocab reuse |
| counter | 🟢 At bar | P2/P3: sparkline, target ring, reorder, undo |
| inbox | 🟢 At bar | P2: triage→Calendar, edit-before-triage, undo, history |
| prioritymatrix | 🟢 At bar | P2: drag, due-date suggest, focus mode |
| kanban | 🟢 At bar | P2: card notes/edit, multiple boards, WIP limits |
| jobtracker | 🟢 At bar | P2: next action, URL/salary/notes |
| networth | 🟢 At bar | P2: pull from Savings/Debt, auto-snapshot |
| keepintouch | 🟢 At bar | P2: touch log, notes, snooze |
| countdown | 🟢 At bar | P2: edit action; P3: pin, progress ring |
| reading | 🟡 Partial | P1: progress bars (page/total), edit; P2: stats strip, yearly goal |
| habits | 🟡 Partial | P1: edit name, backfill missed day; P2: heatmap, archive UX |
| todo | 🟡 Partial | P1: inline edit (in progress), due dates; P2: stats, today filter |
| journal | 🟡 Partial | P1: edit, search; P2: streak, mood chart, prompts |
| notes | 🟡 Partial | P1: edit (in progress), search; P2: tags surface, sort |
| expenses | 🟡 Partial | P1: category breakdown, edit; P2: trend, filter, budget link |
| feedback | 🟡 Partial | P1: edit/withdraw while new; P2: changelog, upvote |

## Trackers (factory `tracker`)

| App | Status | Note |
|-----|--------|------|
| steps · caffeine · stress · productivity | ✅ Done | thin catalog entries — in `finished/` |
| mood | 🟡 Partial | emoji entry + line/dot chart open (graduate candidate) |
| weight | 🟡 Partial | line chart + moving-avg open (graduate candidate) |
| water · meditation · writingtracker | 🟡 Partial | need `quickAdd` + `dailyGoal` (tracker-template P2) |
| sleep | 🟡 Partial | ideal-range band + weekly avg |
| energy | 🟡 Partial | time-of-day tagging, energy curve |
| screentime | 🟡 Partial | "under is good" inversion + daily ceiling |
| stopwatch | 🔴 Graduate | needs a real start/stop timer, not a number field |

## Checklists (factory `checklist`)

| App | Status | Note |
|-----|--------|------|
| grocery · wishlist · packing · bucketlist · backlog | 🟡 Partial | per-app fields (quantity, price/priority, sections, achieved, promote-to-todo) |
| homemaint · cleaning · petcare · routines · dailyplanner · travelplanner | 🟡 Partial | recurrence / daily-reset / date-scoping — candidates to re-point onto the `schedule` family |
| bookmarks · contacts · inventory · fileindex · plantcare · warranty · vocabulary · visionboard · mealplanner · clienttracker | 🔴 Graduate | checklist is the wrong model; each needs a custom app |

## Logbooks (factory `logbook`)

| App | Status | Note |
|-----|--------|------|
| brag · interviews | ✅ Done | thin catalog entries — in `finished/` |
| gratitude · meeting · standup · brainstorm · learninglog · feedbacklog · oneononep · retro | 🟡 Partial | per-app structure (streak, attendees, person grouping, action items) |
| decisionmatrix · recipes · weeklyreview | 🔴 Graduate | structured models the logbook can't express |

## Goals (factory `goal`)

| App | Status | Note |
|-----|--------|------|
| challenge | ✅ Done | thin catalog entry — in `finished/` |
| goals · milestones · courses | 🟡 Partial | categories, timeline, lesson checklist |
| okr · streaks · skilltree · projecttracker · savings · debtpayoff | 🔴 Graduate | a single progress bar is the wrong shape (streaks → merge with Habits) |

## Finance (factory `finance`)

| App | Status | Note |
|-----|--------|------|
| income | ✅ Done | thin catalog entry — in `finished/` |
| bills · invoices · subscriptions | 🟡 Partial | paid-date archive, status pipeline, recurring totals |
| budget | 🔴 Graduate | planned-vs-actual needs an Expenses join |

## Shared templates & platform

| Plan | Status | Note |
|------|--------|------|
| _tracker-template · _checklist-template · _logbook-template · _goal-template · _finance-template | 🟡 Partial | P1 shipped across all five; P2/P3 open (template P2 lifts many apps at once) |
| _schedule-template | 🟢 At bar | P1 shipped (carcare, medication); P2 = re-point recurring checklist apps |
| _xp-layer-spec | 🟢 At bar | Phases 1–4 shipped (levels, achievements incl. early_bird/night_owl, quests, timezone). Follow-on: §6 per-app `*_date` write-time tz correctness |
| _xp-quests-spec · _xp-timezone-spec | ✅ Done | fully implemented — in `finished/` |
| _new-app-candidates | 🟡 Partial | shortlist shipped; a few Section-B extras (watchlist, cycle-tracker, body-measurements) unbuilt |

## Highest-leverage next work (cross-cutting)

These lift many apps at once and are the strongest remaining picks now the per-review punch-lists
are consumed:

- **Inline-edit sweep** (`<InlineEdit>` primitive) — add the missing edit action to todo, notes,
  habits, journal, countdown. *In progress.*
- **Tracker-template P2** — `dailyGoal` ring + `quickAdd` steppers — lights up water, steps,
  meditation, writingtracker, sleep, screentime in one change.
- **`<DailyBarChart>` primitive** — Focus/TimeTracker/Countdown/Pomodoro/Workout all hand-roll the
  7-day bar; extract once to stop the drift.
- **Graduate the 🔴 apps** — biggest single backlog; each is a custom-page build.
