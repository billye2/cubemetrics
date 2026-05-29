# Steps (`steps`)

**Purpose** — Log a daily step count and watch the 7-day trend.

**Current state** — Catalog-entry app on the **tracker** template (`trackerType: "steps"`,
`unit: "steps"`, `aggregate: "sum"`). From `_new-app-candidates.md` §A.

**Plan**
- **P1** — _shipped (rides the template)_: daily entry, today total, 7-day chart, streak — all from
  the tracker-template P1 ([`_tracker-template.md`](_tracker-template.md)).
- **P2/P3** — tracker-template upgrades (quick-add steppers, daily-goal ring/line — a step goal of
  ~8000 is the obvious config once `dailyGoal` lands).

**Data** — Shared `daily_trackers` table (`tracker_type = 'steps'`). No migration.

**Caveat** — **Manual entry only** — the web app can't read device step sensors (see
`_new-app-candidates.md` "Deliberately avoid"). Framed as a manual log.

**Verdict** — **KEEP on the tracker template.**
