# Mood (`mood`)

**Purpose** — Log how you feel each day and see the emotional trend over weeks.

**Current state** — Rides the generic `TrackerView`. Config: `labels: ["Awful","Bad","Meh","Okay","Good","Great"]`, `min 0`, `max 5`, `aggregate: "average"`. Renders word buttons, a per-day average dot, and the shared 7-day bar chart.

**Gaps (specific to mood)**
- Word buttons are slow and unemotional; mood entry begs for **emoji faces**.
- A **bar** chart is the wrong shape — mood is a *position on a scale*, not a magnitude. You want a **line/dot chart** that reads "trending up/down."
- 7 days is too short to see mood patterns; mood wants **weeks/months**.
- No notion of *why* the mood was what it was, and no day-of-week pattern.

**Plan**
- **P1**
  - Rides all shared tracker upgrades — see [`_tracker-template.md`](_tracker-template.md) (stats strip, streak, aggregation already landed; backdate/edit still pending there).
  - Replace word buttons with a **5–6 emoji face row** (😣😕😐🙂😄), mapped to the same 0–5 scale/`labels` so data stays compatible. Selected face glows cyan, 44px taps.
  - Swap the bar chart for a **mood line/dot chart**: y = scale position, colored point per day, faint line connecting days. This is the whole point of mood tracking.
- **P2**
  - **30-day view** toggle and a **mood-by-day-of-week** mini bar ("you dip on Mondays").
  - **"What affected it" tags** (sleep, work, social, health) stored in `note` as light hashtags; surface most-common tags.
  - Average mood for the period in the stats strip (already averages — label it "avg mood: Okay").
- **P3**
  - Correlation with **sleep/energy** (cross-app, note only — out of scope here).
  - Subtle color of the hero face reflecting the score (red→green within the 8-color constraint).

**Data** — None. Stays on `daily_trackers`. Tags piggyback on `note`. No catalog config change beyond what exists.

**Verdict** — Strong **graduate** candidate: the emoji entry + line chart are enough that a small custom page is justified. If staying on the template, at minimum the chart must support a `chartStyle: "line"` config. Effort **M**.
