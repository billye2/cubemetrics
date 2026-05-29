# Shared upgrades — Tracker template

`src/app/app/_factories/TrackerView.tsx` backs every `ui: "tracker"` app (mood, water, sleep,
energy, weight, screentime, writing, meditation, stopwatch). Today it's a big "today" number, a
label/number entry, and a flat history list. **No trend, no streak, no goal, no chart.** Every
tracker looks identical regardless of what it measures.

These upgrades lift *all* trackers at once; per-app files add only domain specifics (goals,
quick-add presets, scale labels).

## P1 — make trends visible

- **7-day (and 30-day) chart.** Port the bar chart from Focus/Time Tracker. For numeric trackers
  show daily value; for scale trackers (mood/energy) show the average as a colored dot/line.
  Most trackers are useless without "is this going up or down?"
- **Stats strip.** Today, 7-day average, best/streak. Reuse the `Stat` component pattern.
- **Aggregation mode per tracker.** Some trackers sum within a day (water glasses, words written,
  meditation minutes); others take the *latest* or *average* (weight, mood, energy, sleep). Add a
  `config.aggregate: "sum" | "latest" | "average"` and compute "today" + chart accordingly. Right
  now `TrackerView` shows only `todays[0]` (the first of the day), which is wrong for additive
  trackers like water.

## P2 — faster entry

- **Quick-add steppers** for additive numeric trackers: big `+1` / `+` buttons (water +1 glass,
  meditation +5 min) instead of typing. Drive from `config.quickAdd: number[]`.
- **Goal line.** Optional `config.dailyGoal`; draw a target line on the chart and a ring/percent
  for today. Hydration, sleep, meditation, writing all have natural daily targets.
- **Edit, not just delete.** Let a row's value be corrected inline (fat-finger fixes).
- **Backdate.** A date picker on entry so a missed day can be filled in.

## P3 — insight & delight

- **Streaks** (consecutive days with any entry / meeting goal) with the amber pill used in Habits.
- **Per-tracker units & icons** already in catalog — surface the icon in the hero.
- **Correlations** (cross-app, later): e.g., sleep vs. mood. Out of scope per-app but worth a note.
- **Notes timeline** — show notes inline in history (already stored, lightly surfaced).

## Data

`daily_trackers` already has `value, note, created_at`. No schema change needed for P1/P2.
Backdating needs writing an explicit `created_at`; aggregation/goal/quickAdd are catalog `config`
additions (`FactoryConfig`), not DB changes.

## Verdict

Upgrade the shared template — it's the highest-leverage change in the whole catalog. A few
trackers (weight, sleep, mood) may still warrant graduation to custom apps for richer charts;
those are called out in their own files. Everything else becomes "complete" the moment the
template gains a chart + correct aggregation + a goal.
