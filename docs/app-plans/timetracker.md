# Time Tracker (`timetracker`)

**Status:** Reference app — **redesigned 2026-06-07 (PRs #187–#188)** to the "Time Budget" model.

> **2026-06-07 redesign (PRs #187–#188).** Rebuilt from the "Time Budget" design hand-off — time as a
> finite weekly resource allocated per category. New `TimeTrackerView.tsx` (zinc/cyan): hero (spent vs
> total budget + status sentence), per-category cards (pace bar + even-pace marker + status pill;
> view = spent/target + "+30m" quick-log, **Adjust mode** = ±30m target steppers), projection card,
> **FAB → log sheet**, compact Recent-entries list. **New persisted per-category weekly budgets** stored
> migration-free as `tracker_type:"timebudget"` rows in `daily_trackers` (config, not entries); a guard
> in `src/lib/xp/compute.ts` skips them so they never count toward XP/quests. PR #188 fixed card-jumping
> (stable sort), the FAB position (invalid `calc()`), and added the first **component test**
> (`tests/unit/timetracker-view.test.tsx`, happy-dom + RTL). See [[handoff-2026-06-07]]. Notes below
> describe the *pre-redesign* app.

**Purpose** — Log where your time went, bucketed by category, with a today breakdown and a weekly trend.

**What it already does well**
- Today card hero: total time + a proportional stacked bar and per-category list with percentages.
- Fast manual logging — recent categories as color chips, duration presets (15/30/45/60/90/120) + custom minutes, optional note.
- Stacked 7-day bar chart, each day segmented by category color.
- Consistent per-category color mapping shared across today card, chart, and history.
- "+ New" category affordance; recent-first chips; sensible defaults when empty.
- Clean recent-entries history with color dot, note, inline delete + confirm.
- Intro copy explicitly hands off to **Focus** for timer-driven single-tasking.
- Backed by `daily_trackers`, RLS-scoped.

**Optional polish**

_P2 — enhancements_
- **Live start/stop timer** — in addition to manual minute logging, a running timer that you start on a category and, on stop, writes the elapsed duration as a normal entry. Persist the running state in `localStorage` (same pattern as Focus) so it survives reloads. Manual logging stays the primary path.
- **Edit existing entries** — currently entries are add/delete only. Allow editing category, minutes, and note in place (new `updateTimeEntryAction`) for fixing a mistyped duration.
- **Weekly per-category totals + budgets** — roll the 7-day data into a per-category weekly total, and let the user set a budget/cap per category ("max 5h meetings/wk") with a progress/over-budget indicator.
- **CSV export** — download recent entries (date, category, minutes, note) as CSV for spreadsheets or invoicing.

_P3 — delight_
- **Tighter Focus hand-off** — surface completed Focus sessions inline (they already share `daily_trackers`), or a one-tap "log this as time" from a finished focus block, so the two apps feel like one ledger.

**Data** — none required. Edit/timer reuse existing `daily_trackers` columns; budgets can start client-side and, if persisted, live in a small per-user settings store rather than a new table.

**Verdict** — Complete; revisit only for the polish above.
