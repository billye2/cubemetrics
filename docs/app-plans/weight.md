# Weight (`weight`)

**Purpose** — Log body weight and watch the real trend, not daily noise.

**Current state** — Rides the generic `TrackerView`. Config: `unit: "lbs"`, `min 0`, `max 500`, `aggregate: "latest"`. Latest-per-day is correct, but it renders as **flat bars from zero** — actively misleading for weight.

**Gaps (specific to weight)**
- **Bars from zero are wrong.** Weight varies in a narrow band (e.g. 170–175); a bar chart starting at 0 makes every day look identical. Weight needs a **line chart with a zoomed y-axis** around the data.
- Daily weight is **noisy**; the signal is the **moving average**, which the template can't draw.
- No **goal weight**, no **delta from start**, no **delta this week** — the numbers that motivate.
- No optional **BMI**.

**Plan**
- **P1**
  - Rides shared upgrades — see [`_tracker-template.md`](_tracker-template.md) for stats/streak/aggregation/backdate plumbing.
  - **Line chart with auto-fit y-axis** (min/max around actual values, not 0) — the single most important fix. Add a **7-day moving-average line** over the raw points.
  - Stats strip reframed: **current**, **goal weight**, **Δ from start**, **Δ this week** (up/down arrow, green when moving toward goal).
- **P2**
  - **Goal weight** (`config.dailyGoal` repurposed as target) drawn as a reference line; show "X lbs to go."
  - 30/90-day range toggle — weight trends are slow.
- **P3**
  - Optional **BMI** from a stored height (height in `note` or a tiny settings value).
  - lbs↔kg display toggle.

**Data** — None required. `daily_trackers` latest aggregation. Config: target line, `chartStyle: "line"`, auto-y-axis.

**Verdict** — **Best graduate candidate among the trackers.** Flat bars are simply wrong for weight; the line + moving average + goal delta justify a small custom page (the auto-fit/line/moving-average chart is more than the shared template should carry). Effort **M**.
