# Energy (`energy`)

**Purpose** — Rate your energy level through the day and spot your rhythm.

**Current state** — Rides the generic `TrackerView`. Config: `labels: ["Drained","Low","Okay","Good","High"]`, `min 0`, `max 4`, `aggregate: "average"`. Word buttons, per-day average dot, shared chart.

**Gaps (specific to energy)**
- Energy isn't a once-a-day value — it **swings morning vs afternoon vs evening**, but the tracker collapses the day to one average with no time context.
- No view of the **daily energy curve**, which is the insight people actually want.
- Like mood, word buttons are fine but a scale chart reads better than bars.

**Plan**
- **P1**
  - Rides shared upgrades — see [`_tracker-template.md`](_tracker-template.md). Aggregation `average` is correct for a 0–4 scale.
  - Keep the 5-button scale entry (it's quick), but **prompt time-of-day** lightly: log multiple times per day and tag the entry **morning / afternoon / evening** (stored in `note`).
- **P2**
  - **Energy curve**: instead of (or beside) the 7-day bars, show today's morning→afternoon→evening points connected, so the daily arc is visible.
  - Average energy **by time-of-day slot** across the week ("afternoons are your slump").
- **P3**
  - Correlate with **sleep & caffeine** (cross-app — note only, out of scope here).
  - Day-of-week energy mini-view.

**Data** — None. Time-of-day slot lives in `note`. No catalog change beyond existing config.

**Verdict** — **Ride the upgraded template.** The time-of-day slotting is a small enhancement layered on the shared chart; no custom page warranted. Effort **S**.
