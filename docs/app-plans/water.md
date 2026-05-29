# Water (`water`)

**Purpose** — Track glasses of water per day and hit a daily hydration goal.

**Current state** — Rides the generic `TrackerView`. Config: `unit: "glasses"`, `min 0`, `max 16`, `aggregate: "sum"`. Sum aggregation is already correct (each entry adds a glass; today shows the day's total, not the first entry).

**Gaps (specific to water)**
- Entry is a bare number field — wrong for an additive counter you tap many times a day.
- No **daily goal** (default 8), so "today" is a number with no target.
- No visual for *progress toward today's goal* — the natural display is a **ring**.
- Streak exists but isn't tied to *hitting the goal*, which is what matters for hydration.

**Plan**
- **P1**
  - Rides shared upgrades — see [`_tracker-template.md`](_tracker-template.md). Water is the **strongest case for quick-add steppers and goal line** described there; this app should be the first consumer.
  - **Big `+1` / `+2` quick-add buttons** (`config.quickAdd: [1, 2]`), each one tap = one logged entry. Minimize typing entirely.
  - **Daily goal** via `config.dailyGoal: 8`; show a **hydration ring** for today (filled cyan to goal %), with the count in the center.
- **P2**
  - **Streak of goal-met days** (consecutive days reaching `dailyGoal`), amber pill — not just "any entry."
  - Goal line drawn on the 7-day chart so you see which days you hit 8.
  - Quick **undo** for an accidental tap (delete last entry button).
- **P3**
  - Editable goal (some people target ounces/liters); optional unit switch glasses↔oz (display only).
  - Gentle full-ring celebration state when today's goal is met.

**Data** — None. `daily_trackers` with sum aggregation. Config additions: `quickAdd: [1,2]`, `dailyGoal: 8` (new `FactoryConfig` fields proposed in the template).

**Verdict** — **Ride the upgraded template** once sum (done) + quickAdd + goal/ring land. No custom page needed. Effort **S**.
