# Caffeine (`caffeine`)

**Purpose** — Track caffeine intake (mg) per day to keep it under control.

**Current state** — Catalog-entry app on the **tracker** template (`trackerType: "caffeine"`,
`unit: "mg"`, `aggregate: "sum"`). From `_new-app-candidates.md` §A.

**Plan**
- **P1** — _shipped (rides the template)_: daily entry, today total, 7-day chart, streak — from the
  tracker-template P1 ([`_tracker-template.md`](_tracker-template.md)).
- **P2/P3** — quick-add steppers for common amounts (a coffee ≈ 95mg); a daily ceiling goal
  (treat the goal as a max, ~400mg) once the tracker `dailyGoal` upgrade lands.

**Data** — Shared `daily_trackers` table (`tracker_type = 'caffeine'`). No migration.

**Verdict** — **KEEP on the tracker template.**
