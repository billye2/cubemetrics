# Sleep (`sleep`)

**Purpose** — Log hours slept per night and stay in a healthy range.

**Current state** — Rides the generic `TrackerView`. Config: `unit: "hours"`, `min 0`, `max 14`, `aggregate: "latest"`. One value per night; latest aggregation is correct.

**Gaps (specific to sleep)**
- No notion of an **ideal range** — 7.5h and 5h render the same way; the point of sleep tracking is "am I in the 7–9h band?"
- No **weekly average** framed against the target.
- No concept of **sleep debt** accumulating when you undershoot.
- Entry is raw hours; many people think in **bedtime → wake time**.

**Plan**
- **P1**
  - Rides shared upgrades — see [`_tracker-template.md`](_tracker-template.md) (stats strip, chart, streak landed; backdate is valuable here since people log this morning-after).
  - **Ideal-range band (7–9h)** drawn behind the chart bars; bars inside the band read cyan/"good," outside read dim/amber. This is the headline feature.
  - **7-day average hours** in the stats strip, with the band target shown.
- **P2**
  - Running **sleep debt** vs a per-night goal (`config.dailyGoal: 8`): sum of (goal − actual) over the last 7 nights, shown as "−4.5h this week."
  - Quick presets for common durations (6 / 7 / 8 / 9 h) for fast nightly entry.
- **P3**
  - Optional **bedtime + wake-time** entry that computes hours automatically (handles crossing midnight); store times in `note`.
  - Note that **lower variance is good** — a small consistency indicator ("±0.5h, steady").

**Data** — None for P1/P2. Bedtime/wake-time can live in `note` (or graduate). Config additions: `dailyGoal`, an `idealRange: [7, 9]` band concept.

**Verdict** — Could **graduate** for the banded chart + bedtime entry, but the band + debt are achievable on the template with an `idealRange` config. Ride template if that lands; otherwise small custom page. Effort **M**.
