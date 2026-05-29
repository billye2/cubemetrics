# Shared upgrades — Tracker template

`src/app/app/_factories/TrackerView.tsx` (+ `_factories/trackerLib.ts`) backs every
`ui: "tracker"` app (mood, water, sleep, energy, weight, screentime, writing, meditation,
stopwatch).

## ✓ Shipped — P1 (commit #10)

The original P1 from this doc has **landed** for all nine trackers at once
(`f359f4b`, "Tracker template P1"):

- **Per-tracker aggregation.** `FactoryConfig.aggregate: "sum" | "latest" | "average"`. Water /
  writing / meditation / stopwatch / screentime **sum** a day's entries; weight takes the
  **latest**; mood / energy / sleep **average**. The hero "today" number now reduces correctly
  (previously it always showed the first row of the day — silently broken for additive trackers).
- **Stats strip.** Today / 7-day average / streak cards, mirroring Focus & Time Tracker. The
  average label becomes "7d avg/day" for sum-mode trackers.
- **7-day chart.** Cyan bar per day, today highlighted, empty days as thin neutral bars, hover
  shows exact day + value.
- Dispatcher now fetches a wider window (not just the last 60 rows) to feed the chart.

Helpers live in `trackerLib.ts`: `aggregateDay`, `bucketByDay`, `todayAggregate`, `averageOver`,
`bestDay`, `computeStreak`, `formatValue`. Per-app plans build on top of this.

## P2 — faster entry & goals (next)

- **Goal line.** Optional `config.dailyGoal`; draw a target line on the chart and a ring/percent
  for today. Hydration, sleep, meditation, writing, screentime (as a cap) all have natural targets.
- **Quick-add steppers** for additive trackers: big `+1` / `+` buttons (water +1 glass,
  meditation +5 min) instead of typing. Drive from `config.quickAdd: number[]`.
- **Edit, not just delete.** Inline value correction for fat-finger fixes.
- **Backdate.** A date picker on entry (write an explicit `created_at`) to fill a missed day.
- **30-day view** toggle alongside the 7-day chart.

## P3 — insight & delight

- **Specialized chart styles** (per-app, see individual files): a true line + moving average for
  weight; a dot/line for mood & energy scales; an ideal-range band for sleep (7–9h); an inverted
  "lower is better" / ceiling treatment for screen time.
- **Goal-met streak** (consecutive days hitting `dailyGoal`) distinct from the log streak.
- **Notes timeline** — surface entry notes inline in history (stored, lightly shown today).
- **Cross-app correlations** (e.g., sleep vs. mood) — out of scope per-app; note only.

## Data

`daily_trackers` (`value, note, created_at`) needs no schema change for P2 either — `dailyGoal`
and `quickAdd` are catalog `config` additions; backdating just writes `created_at`.

## Verdict

P1 is done and was the highest-leverage change in the catalog — every tracker now shows trend +
streak + a correct today number. Remaining work is P2 (goals + quick-add) plus a few graduations
called out in individual files: **weight** and **mood** want richer chart styles; **stopwatch** is
mislabeled and should become a real start/stop timer (see `stopwatch.md`).
