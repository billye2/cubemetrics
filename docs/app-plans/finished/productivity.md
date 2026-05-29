# Productivity (`productivity`)

**Purpose** — Rate how productive your day felt on a 0–5 scale, building a trend you can reflect on.

**Current state** — Catalog-entry app on the **tracker** template (`trackerType: "productivity"`,
6-point `labels` Wasted→Peak, `aggregate: "average"`). From `_new-app-candidates.md` §A
(productivity-native, promoted in the curation pass).

**Plan**
- **P1** — _shipped (rides the template)_: labelled daily rating, 7-day average, chart — from the
  tracker-template P1 ([`_tracker-template.md`](_tracker-template.md)).
- **P2/P3** — overlay against Focus minutes / Pomodoros / todos-closed to see what drives a good
  day (cross-app, template-level).

**Data** — Shared `daily_trackers` table (`tracker_type = 'productivity'`). No migration.

**Verdict** — **KEEP on the tracker template.**
