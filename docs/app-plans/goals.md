# Goals (`goals`)

**Purpose** — Track long-term SMART goals as progress toward a target.

**Current state** — Generic `GoalView` (hasTarget **yes**, `goalType: "smart"`). Add a title + numeric target → progress bar → "update progress" overwrites `current_value` (no history) / "mark complete" / delete → collapsed completed. Single level, no deadline, no notes. This is the *canonical* use of the goal template.

**Gaps** — The "S/M/A/R/T" of SMART is unsupported: no **deadline** (the Time-bound), no **why/notes** (Relevant), no record of *how* progress moved over time. Updating progress destroys the previous number, so there's no trend, no pace ("on track to hit it by …"), no momentum. No grouping by life area (health / career / money). A bare number field for every update is high-friction for the common "+1 / +a-bit" case. No hero summary across goals (how many active, how many on track, overall completion rate).

**Plan**

**P1 — makes it complete** (all cross-cutting — see `_goal-template.md`)
- **Deadlines** — optional `due_date`; show "12 days left", sort active goals by urgency, flag overdue red.
- **Progress history + sparkline** — log every update to `goal_progress`; render a small sparkline under the bar and a pace line ("on track for Jun 14" vs deadline).
- **Increment buttons** — "+1" and "+ custom" quick updates that append history instead of opening the edit field.
- **Why / next-action note** — a `note` field surfaced under the title.

**P2 — enhancements**
- **Categories / life areas** — group goals (health, career, money, learning) with a colored chip; filter/section by area. This is the most goals-specific lift — a personal goals list is naturally organized by area of life.
- **Hero strip** — active count, % on track (pace-based), completion rate this quarter.
- **Sort & filter** — by deadline, progress %, area.

**P3 — delight**
- **Celebration** on complete (confetti + completion date kept in archive).
- **Pace coaching** — "+N/week to finish on time" derived from history + deadline.
- **Quarterly / yearly review** view: completed vs abandoned.

**Data** — Add `due_date DATE`, `note TEXT`, `category TEXT` (nullable) to `goals`; new `goal_progress (id, goal_id, value, created_at)` history table with the standard RLS pair. All shared with the other riders.

**Verdict** — **RIDE the upgraded template** — this is the reference goal app and validates every shared upgrade. App-specific extra is categories/areas + the cross-goal hero strip. Effort **S** (P1 is pure template) **/ M** (with categories + hero).
