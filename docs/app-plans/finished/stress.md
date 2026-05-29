# Stress (`stress`)

**Purpose** — Rate daily stress on a 0–5 scale and see the trend — a sibling of Mood and Energy.

**Current state** — Catalog-entry app on the **tracker** template (`trackerType: "stress"`,
6-point `labels` None→Severe, `aggregate: "average"`). From `_new-app-candidates.md` §A.

**Plan**
- **P1** — _shipped (rides the template)_: labelled scale entry, 7-day average, chart — from the
  tracker-template P1 ([`_tracker-template.md`](_tracker-template.md)).
- **P2/P3** — correlate against Sleep/Energy/Mood on a shared timeline (cross-tracker view is a
  template-level idea, not app-specific).

**Data** — Shared `daily_trackers` table (`tracker_type = 'stress'`). No migration.

**Verdict** — **KEEP on the tracker template.**
