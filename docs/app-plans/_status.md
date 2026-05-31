# App-plan status index

The at-a-glance tracker for **what's shipped vs. what's open**, so we don't re-audit the whole
folder every session. Updated as work lands (builder role: tick the plan's own checkboxes too).

**Last synced:** 2026-05-30 (against the code, not memory).

## Legend

| Mark | Meaning | Lives where |
|------|---------|-------------|
| ✅ **Done** | Entire app-specific scope shipped. Only *shared-template* upgrades (tracked in the `_*-template.md` files) remain. | `finished/` |
| 🟢 **At bar** | P1 (and usually P2) shipped; the app is complete and usable. Only its *own* P2/P3 polish is open. | here |
| 🟡 **Partial** | Works, but has notable open P1/P2 gaps worth a future pass. | here |
| 🔴 **Graduate** | Still rendered by a factory template; the plan calls for a custom app that isn't built yet. | here |

> Conservative archive rule: a plan only moves to `finished/` when **no app-specific work remains**.
> "At bar" apps with their own open P2/P3 stay here on purpose, so nothing gets hidden.

## Active claims

The interim claim ledger for **parallel builds** (Phase 1 of
[agent-orchestration.md](../agent-orchestration.md)). Before a builder writes any code for an app,
it adds a row here in a tiny commit — that's the tie-break so two lanes never build the same app.
Remove the row when the branch merges or is abandoned. **Empty = nothing claimed.**

> Scope: this ledger is sanctioned only for *attended* runs of ≤2 agents (the claim race is
> resolved at push time, not atomically). Unattended or larger fan-outs use GitHub issues — see
> [Decision 1](../agent-orchestration.md#decision-1--claim-mechanism).

| App | Branch | Claimed (UTC) | Notes |
|-----|--------|---------------|-------|

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
| countdown | 🟢 At bar | ✓ edit action; P3: pin, progress ring |
| reading | 🟡 Partial | P1: progress bars (page/total), edit; P2: stats strip, yearly goal |
| habits | 🟡 Partial | ✓ edit name (inline); P1: backfill missed day; P2: heatmap, archive UX |
| todo | 🟡 Partial | ✓ edit title (inline); P1: due dates; P2: stats, today filter |
| journal | 🟡 Partial | ✓ edit (title/body/mood) + Markdown + search; P2: streak, mood chart, prompts |
| notes | 🟡 Partial | ✓ edit (inline, fixes updated_at) + Markdown + search; P2: tags surface, sort |
| expenses | 🟡 Partial | P1: category breakdown, edit; P2: trend, filter, budget link |
| feedback | 🟡 Partial | P1: edit/withdraw while new; P2: changelog, upvote |
| weeklyreview | 🟢 At bar | graduated from logbook; structured wins/misses/lessons/next_focus, one per week |
| warranty | 🟢 At bar | graduated from checklist; computed expiry, archive, expiry warnings |
| vocabulary | 🟢 At bar | graduated from checklist; SM-2-lite spaced repetition, shares flashcards engine |
| skilltree | 🟢 At bar | graduated from goal; XP leveling curve, practice log, skill dependency tree (P1+P2); P3 shipped: global-XP wiring (skill_practice → daily rollup), Stats tab (account level + practice streak + 8-week XP chart), rust hints |
| savings | 🟢 At bar | graduated from goal; deposit log, currency, pace & projection; P3: multi-currency, chart |
| okr | 🟢 At bar | graduated from goal; objective→key-result hierarchy, cycle, confidence, mean roll-up (P1) |
| inventory | 🟢 At bar | graduated from checklist; quantity/value/location/category, total-worth roll-up (P1); P2/P3: photos, filters |
| mealplanner | 🟢 At bar | graduated from checklist; week grid (date×slot), recipe link, grocery-list generator (P1–P3) |
| fileindex | 🟢 At bar | graduated from checklist; searchable catalog (name/location/type/tags/desc), filters (P1 + partial P2/P3) |
| contacts | 🟢 At bar | graduated from checklist; mini-CRM on shared `contacts` table (address book + tags + birthday strip) — P1+P2+P3 |
| decisionmatrix | 🟢 At bar | graduated from logbook; weighted options×criteria matrix, computed winner, chosen/rationale/revisit (P1–P3) |
| debtpayoff | 🟢 At bar | graduated from goal; multi-debt with APR/min-payment, payment log, payoff projection + snowball/avalanche (P1+P2) |
| clienttracker | 🟢 At bar | graduated from checklist; mini-CRM pipeline (lead→active→done/lost), contact/value/next-action, due surfacing; P3 activity log (`client_events`) + won/lost conversion + Countdown link (P1–P3) |
| budget | 🟢 At bar | graduated from finance; per-category planned-vs-actual on `budget_targets`, actuals read from `expenses` join; P2/P3 month nav, rollover, bar chart, pace (P1–P3) |
| bookmarks | 🟢 At bar | graduated from checklist; link locker with tags/folder/favicon/last-opened on `bookmarks` table; P2/P3 read-it-later (`unread`), import/export, clipboard autofill (P1–P3) |

## Trackers (factory `tracker`)

| App | Status | Note |
|-----|--------|------|
| steps · caffeine · stress · productivity | ✅ Done | thin catalog entries — in `finished/` |
| mood | 🟡 Partial | ✓ dot/line chart; P2: emoji entry, day-of-week pattern |
| weight | 🟢 At bar | ✓ auto-fit line chart; P3: goal-weight line, 30/90-day toggle, BMI |
| water · meditation · writingtracker | 🟢 At bar | ✓ daily-goal ring + quick-add; P3: per-app chart polish |
| sleep | 🟢 At bar | ✓ daily goal + ideal-range band (7–9h); P2: sleep debt, bed/wake entry |
| energy | 🟡 Partial | ✓ dot/line chart; P2: time-of-day tagging, energy curve |
| screentime | 🟡 Partial | ✓ at-most cap ring + quick-add; P3: category split |
| stopwatch | 🟢 At bar | ✓ graduated to a real start/stop/lap timer (custom page); P3: keep-awake, sound |

## Checklists (factory `checklist`)

| App | Status | Note |
|-----|--------|------|
| grocery · wishlist · packing · bucketlist · backlog | 🟡 Partial | per-app fields (quantity, price/priority, sections, achieved, promote-to-todo) |
| homemaint · cleaning · petcare · routines · dailyplanner · travelplanner | 🟡 Partial | recurrence / daily-reset / date-scoping — candidates to re-point onto the `schedule` family |
| visionboard | 🔴 Graduate | checklist is the wrong model; needs a custom app |
| ~~warranty~~ · ~~vocabulary~~ · ~~plantcare~~ · ~~inventory~~ · ~~fileindex~~ · ~~mealplanner~~ · ~~contacts~~ · ~~bookmarks~~ · ~~clienttracker~~ | ✅ Graduated | now custom apps (see Custom apps table) |

> plantcare: 🟢 At bar — graduated from checklist; recurrence engine + computed next-due (P1); needs-water filter, light/notes, stats strip (P2); photo upload (`plant-photos` bucket), watering-history sparkline (`plant_waterings`), fertilizing as a 2nd recurrence track (P3). P1–P3 shipped.

## Logbooks (factory `logbook`)

| App | Status | Note |
|-----|--------|------|
| brag · interviews | ✅ Done | thin catalog entries — in `finished/` |
| gratitude · meeting · standup · brainstorm · learninglog · feedbacklog · oneononep · retro | 🟡 Partial | per-app structure (streak, attendees, person grouping, action items) |
| ~~weeklyreview~~ · ~~recipes~~ · ~~decisionmatrix~~ | ✅ Graduated | now custom apps (see Custom apps table) |

## Goals (factory `goal`)

| App | Status | Note |
|-----|--------|------|
| challenge | ✅ Done | thin catalog entry — in `finished/` |
| goals · milestones · courses | 🟡 Partial | categories, timeline, lesson checklist |
| streaks | 🔴 Graduate | a single progress bar is the wrong shape (streaks → merge with Habits) |
| ~~projecttracker~~ · ~~skilltree~~ · ~~savings~~ · ~~okr~~ · ~~debtpayoff~~ | ✅ Graduated | now custom apps (see Custom apps table) |

> projecttracker: 🟢 At bar — graduated from goal; status pipeline + task checklist + next action (P1); board view (tap-to-advance) + blocked reason/since (P2). P3 (activity history, milestones, hero strip) still open.

## Finance (factory `finance`)

| App | Status | Note |
|-----|--------|------|
| income | ✅ Done | thin catalog entry — in `finished/` |
| bills · invoices · subscriptions | 🟡 Partial | paid-date archive, status pipeline, recurring totals |
| ~~budget~~ | ✅ Graduated | now a custom app (see Custom apps table) |

## Shared templates & platform

| Plan | Status | Note |
|------|--------|------|
| _tracker-template | 🟢 At bar | P1 + P2 (goals/quick-add) + P3 chart styles (bars/band/line/dots) all shipped |
| _logbook-template | 🟡 Partial | P1 + ✓ Markdown rendering; open: tags, per-app structure |
| _checklist-template · _goal-template · _finance-template | 🟡 Partial | P1 shipped; P2/P3 open (template P2 lifts many apps at once) |
| _schedule-template | 🟢 At bar | P1 shipped (carcare, medication); P2 = re-point recurring checklist apps |
| _xp-layer-spec | 🟢 At bar | Phases 1–4 shipped (levels, achievements incl. early_bird/night_owl, quests, timezone). Follow-on: §6 per-app `*_date` write-time tz correctness |
| _xp-quests-spec · _xp-timezone-spec | ✅ Done | fully implemented — in `finished/` |
| _new-app-candidates | 🟡 Partial | shortlist shipped; a few Section-B extras (watchlist, cycle-tracker, body-measurements) unbuilt |

## Highest-leverage next work (cross-cutting)

These lift many apps at once and are the strongest remaining picks now the per-review punch-lists
are consumed:

- **Inline-edit sweep** — ✓ done. `<InlineEdit>` primitive (todo title, habit name) + tailored
  edit modes for notes, journal, and countdown (multi-field). Every custom CRUD app can now fix a
  typo without delete-and-recreate.
- **Tracker-template P2** — ✓ done. `dailyGoal` ring (+ `at-most` caps) and `quickAdd` steppers
  shipped across water/sleep/meditation/writing/steps/screentime/caffeine. Remaining tracker P2:
  inline value edit, backdate, 30-day view toggle.
- **`<DailyBarChart>` primitive** — Focus/TimeTracker/Countdown/Pomodoro/Workout all hand-roll the
  7-day bar; extract once to stop the drift.
- **Graduate the 🔴 apps** — biggest single backlog; each is a custom-page build.
