# Screen Time (`screentime`)

**Purpose** — Log daily hours on screens and trend it **down**.

**Current state** — Rides the generic `TrackerView`. Config: `unit: "hours"`, `min 0`, `max 24`, `aggregate: "sum"`. Sum is fine if logging multiple sessions; treat the day's total as the metric.

**Gaps (specific to screentime)**
- The template assumes **more is better** — bigger bars are cyan/"good." For screen time, **lower is better**; the coloring and streak semantics are inverted.
- No **daily cap/ceiling** goal; "today: 6h" has no target to beat.
- No "trend is down = win" framing, which is the entire motivation.

**Plan**
- **P1**
  - Rides shared upgrades — see [`_tracker-template.md`](_tracker-template.md). Requires the template's proposed **"goal as ceiling" mode** (`config.goalDirection: "under"`).
  - **Invert the coloring**: days **under** the cap read cyan/"good," days **over** read amber/dim. Hero shows today vs cap.
  - **Daily cap goal** (`config.dailyGoal`, e.g. 4h) drawn as a ceiling line on the chart.
- **P2**
  - **Weekly average** with a downward-is-good arrow ("−1.2h vs last week 🎉").
  - **Streak of under-cap days** (consecutive days at or below the ceiling), not "any entry."
- **P3**
  - Optional category split (social / work / entertainment) via `note` tags.
  - Best (lowest) day callout instead of highest.

**Data** — None. `daily_trackers` sum. Config additions: `dailyGoal` (cap) + `goalDirection: "under"` (new field proposed in template).

**Verdict** — **Ride the upgraded template** once it supports a ceiling/"lower-is-better" goal mode. No custom page. Effort **S**.
