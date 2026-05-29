# Time Tracker (`timetracker`)

**Status:** Reference app — already built to the quality bar.

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
