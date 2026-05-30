# App Improvement Plans

This folder holds a per-app improvement plan — one markdown file per catalog entry
(`src/lib/modern/catalog/apps/<id>.json`). Each plan describes how to take that app from its current
state to a **complete, standalone, genuinely useful** experience.

## Why this exists

Three apps have been built out to a high bar — **Focus**, **Time Tracker**, and **Countdown**.
They are the reference for what "done" looks like. Most other apps are either:

- **Factory apps** — rendered by one of five generic templates (`tracker`, `checklist`,
  `logbook`, `goal`, `finance`). They work, but they're interchangeable: a mood tracker and a
  weight log look and behave identically. They lack the domain-specific affordances, stats, and
  visualizations that make an app feel purpose-built.
- **Custom apps** — todo, journal, notes, calendar, expenses, reading, habits, pomodoro. These
  have dedicated pages but vary in completeness; several are CRUD lists that could earn the same
  polish as the reference apps.

## The quality bar (what the 3 reference apps do)

Derived from `focus/`, `timetracker/`, and `countdown/`. A "complete" app generally has:

1. **A hero display** — the single most important number/state, big and immediate (today's
   total, the active timer, the next event, the outstanding balance).
2. **A stats strip** — 2–4 at-a-glance metrics (today, streak, this week, average).
3. **A visualization** — a 7-day bar chart, stacked chart, progress ring, or sparkline. Always
   show *trend*, not just the latest value.
4. **Streaks & momentum** — consecutive-day counts where it makes sense; gentle nudges.
5. **Smart quick-entry** — one-tap presets and recently-used values/categories instead of a bare
   number field. Minimize taps to log the common case.
6. **Categories with color** — consistent color-coding, recent-first chips, "+ New" affordance.
7. **Adaptive formatting** — show units that matter at the current scale ("3h 20m", "2 weeks",
   "in 5 min"), not raw numbers.
8. **Resilient in-progress state** — timers persist across reloads (`localStorage`); server is
   the source of truth on completion.
9. **Thoughtful empty states** — explain the app and prompt the first action.
10. **Clean history** — recent entries with date/time, inline delete, confirm on destructive ops.
11. **Encouraging copy** — short, human microcopy that frames the purpose.

## Design constraints (from CLAUDE.md + project memory)

- **Phone-first**, dark mode only, zinc + **cyan-500** accent, 44px+ tap targets, safe-area insets.
- **RSC + Server Actions.** Reads in `page.tsx` via `createServerSupabase()`; mutations in
  `actions.ts`; `revalidatePath()` after writes. All routes `export const dynamic = "force-dynamic"`.
- **RLS everywhere** — every table scopes rows to `auth.uid()`. New tables need the standard
  policy pair (owner FOR ALL + SysOp SELECT).
- **Catalog is the source of truth.** Graduating a factory app to a custom app means: change `ui`
  to `modern` in its `catalog/apps/<id>.json` (then `npm run build:catalog`), add
  `src/app/app/<id>/page.tsx` + `actions.ts`, keep the entry.

## Backing tables (factory apps)

| Template   | Table            | Key columns |
|------------|------------------|-------------|
| tracker    | `daily_trackers` | `tracker_type, value, note, created_at` |
| checklist  | `checklists`     | `list_type, title, completed, created_at` |
| logbook    | `logs`           | `log_type, title, body, created_at` |
| goal       | `goals`          | `goal_type, title, current_value, target_value, status` |
| finance    | `finance_items`  | `item_type, name, amount, category, paid, due_date` |

Custom apps have their own tables (see `docs/database.md`).

## Plan file format

Each `<id>.md` follows:

- **Purpose** — one line.
- **Current state** — what's there today (factory template or custom page).
- **Gaps** — why it doesn't yet stand alone.
- **Plan** — prioritized: **P1** (core, makes it usable/complete), **P2** (enhancements),
  **P3** (delight / nice-to-have).
- **Data** — schema additions, if any.
- **Verdict** — keep on factory template (+ shared improvements) vs. graduate to a custom app,
  and a rough effort sense.

## Shared template upgrades

Many factory apps benefit from the *same* upgrades to their shared template. Rather than repeat
them in every file, the cross-cutting template work is collected in:

- [`_tracker-template.md`](_tracker-template.md)
- [`_checklist-template.md`](_checklist-template.md)
- [`_logbook-template.md`](_logbook-template.md)
- [`_goal-template.md`](_goal-template.md)
- [`_finance-template.md`](_finance-template.md)
- [`_schedule-template.md`](_schedule-template.md) — recurring tasks (sixth family; added 2026-05-29)

Individual app files reference these and add only what's app-specific.

## Status & finished plans

- **[`_status.md`](_status.md)** is the at-a-glance completion tracker (✅ done / 🟢 at bar /
  🟡 partial / 🔴 graduate-pending) — start there to see what's shipped vs. open.
- **[`finished/`](finished/)** holds plans whose entire app-specific scope shipped (thin
  catalog-entry apps, fully-implemented specs) plus the consumed `_review-*.md` audits. Nothing
  there needs re-reviewing; it's kept for history.

## Catalog index

One file per catalog entry. Grouped by how they're rendered today. (Fully-done thin entries —
brag, interviews, challenge, income, steps, caffeine, stress, productivity — now live in
[`finished/`](finished/).)

**Reference apps — already built to the bar:**
[focus](focus.md) · [timetracker](timetracker.md) · [countdown](countdown.md) ·
[pomodoro](pomodoro.md) *(work/break cycles)* · [workout](workout.md) *(sets×reps×weight)* ·
[flashcards](flashcards.md) *(SM-2-lite study)*

> **Status (2026-05-28):** All five factory templates have had their P1 upgrade. Workout and
> Flashcards graduated from the logbook/checklist templates to custom pages; Pomodoro gained its
> work/break cycle automation. The per-template P1 sections below are now largely shipped — treat
> their *Current state* notes as describing the pre-upgrade shell.
>
> **Status (2026-05-29) — the new-app shortlist is fully shipped.** Every item in
> [`_new-app-candidates.md`](_new-app-candidates.md) is live, plus a **sixth factory family**
> (`schedule`). New apps this round:
> - **Custom:** [counter](counter.md) · [inbox](inbox.md) *(Quick Capture)* ·
>   [prioritymatrix](prioritymatrix.md) *(Eisenhower)* · [kanban](kanban.md) ·
>   [jobtracker](jobtracker.md) *(Job Hunt)* · [networth](networth.md) · [keepintouch](keepintouch.md)
> - **Catalog-entry (template):** [brag](finished/brag.md) *(Wins)* · [interviews](finished/interviews.md) ·
>   [challenge](finished/challenge.md) · [income](finished/income.md) · [steps](finished/steps.md) · [caffeine](finished/caffeine.md) ·
>   [stress](finished/stress.md) · [productivity](finished/productivity.md) — *(now in `finished/`)*
> - **Schedule family** ([`_schedule-template.md`](_schedule-template.md)): **Car** (`carcare`) +
>   **Meds** (`medication`). Re-pointing the existing recurring apps
>   (cleaning/homemaint/plantcare/petcare/warranty/routines) onto it is a P2 per-app data migration.

**Custom pages:**
[todo](todo.md) · [journal](journal.md) · [notes](notes.md) · [calendar](calendar.md) ·
[expenses](expenses.md) · [reading](reading.md) · [habits](habits.md) ·
[feedback](feedback.md) *(system app)*

**Trackers** ([_tracker-template.md](_tracker-template.md)):
[mood](mood.md) · [water](water.md) · [sleep](sleep.md) · [energy](energy.md) ·
[weight](weight.md) · [screentime](screentime.md) · [writingtracker](writingtracker.md) ·
[meditation](meditation.md) · [stopwatch](stopwatch.md)

**Checklists** ([_checklist-template.md](_checklist-template.md)):
[grocery](grocery.md) · [wishlist](wishlist.md) · [packing](packing.md) · [bucketlist](bucketlist.md) ·
[bookmarks](bookmarks.md) · [backlog](backlog.md) · [contacts](contacts.md) · [inventory](inventory.md) ·
[fileindex](fileindex.md) · [homemaint](homemaint.md) · [cleaning](cleaning.md) · [plantcare](plantcare.md) ·
[petcare](petcare.md) · [warranty](warranty.md) · [travelplanner](travelplanner.md) · [vocabulary](vocabulary.md) ·
[routines](routines.md) · [dailyplanner](dailyplanner.md) · [visionboard](visionboard.md) ·
[mealplanner](mealplanner.md) · [clienttracker](clienttracker.md)
*(flashcards graduated to a custom page)*

**Logbooks** ([_logbook-template.md](_logbook-template.md)):
[gratitude](gratitude.md) · [meeting](meeting.md) · [standup](standup.md) · [brainstorm](brainstorm.md) ·
[decisionmatrix](decisionmatrix.md) · [learninglog](learninglog.md) ·
[weeklyreview](weeklyreview.md) · [feedbacklog](feedbacklog.md) · [oneononep](oneononep.md) ·
[retro](retro.md) · [recipes](recipes.md)
*(workout graduated to a custom page)*

**Goals** ([_goal-template.md](_goal-template.md)):
[goals](goals.md) · [okr](okr.md) · [milestones](milestones.md) · [streaks](streaks.md) ·
[courses](courses.md) · [skilltree](skilltree.md) · [projecttracker](projecttracker.md) ·
[savings](savings.md) · [debtpayoff](debtpayoff.md)

**Finance** ([_finance-template.md](_finance-template.md)):
[budget](budget.md) · [bills](bills.md) · [subscriptions](subscriptions.md) · [invoices](invoices.md)

### Apps recommended to "graduate" from a factory template to a custom page

The single biggest cross-cutting finding: a number of apps are forced through a template that's the
wrong model for them. Flagged for graduation in their files —
**stopwatch** (real start/stop timer), **bookmarks, contacts, inventory, fileindex, vocabulary,
flashcards, mealplanner, clienttracker, warranty, plantcare, visionboard** (checklists that aren't
checklists), **decisionmatrix, workout, recipes** (structured logbooks), **okr, skilltree,
projecttracker, savings, debtpayoff** (goals that aren't single progress bars), and **subscriptions,
budget** (finance beyond a payables list). **streaks** should likely merge into **habits**.
