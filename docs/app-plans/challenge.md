# Challenges (`challenge`)

**Purpose** — Run time-boxed challenges (75-hard, a 30-day habit, a reading challenge) with a
target to hit and a deadline to hit it by.

**Current state** — Catalog-entry app on the **goal** template (`goalType: "challenge"`,
`hasTarget: true`) — inherits deadlines, increment buttons, progress history + sparkline. From
`_new-app-candidates.md` §A (Goal-template quick win).

**Plan**
- **P1** — _shipped (rides the template)_
  - [x] Target + deadline + progress increments + trend sparkline — all inherited from the
        goal-template P1 (`_goal-template.md`).
- **P2/P3** — goal-template upgrades; app-specific later: a streak/days-remaining hero framing
  ("Day 12 of 30") distinct from open-ended goals.

**Data** — Shared `goals` table (`goal_type = 'challenge'`) + `goal_progress`. No migration.

**Verdict** — **KEEP on the goal template.**
