# App Improvement Plans

This folder holds a per-app improvement plan — one markdown file per catalog entry
(`src/lib/modern/catalog.ts`). Each plan describes how to take that app from its current
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
- **Catalog is the source of truth.** Graduating a factory app to a custom app means: change its
  `ui` to `modern`, add `src/app/app/<id>/page.tsx` + `actions.ts`, keep the catalog entry.

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

Individual app files reference these and add only what's app-specific.
