# Meditation (`meditation`)

**Purpose** — Log minutes meditated and keep a daily practice going.

**Current state** — Rides the generic `TrackerView`. Config: `trackerType: "meditation"`, `unit: "minutes"`, `min 0`, `max 240`, `aggregate: "sum"`. Sum is correct — multiple sessions sum to the day's minutes.

**Gaps (specific to meditation)**
- Entry is a bare number — but sessions are **fixed lengths** (5/10/20 min), so presets beat typing.
- More fundamentally, users want to **meditate inside the app**: a **guided timer** (start/stop) that logs the minutes on completion, like Focus/Pomodoro.
- No **daily goal**, no **lifetime total** (a meaningful badge for a long practice).

**Plan**
- **P1**
  - Rides shared upgrades — see [`_tracker-template.md`](_tracker-template.md) (chart, sum, stats, streak present).
  - **Session-length presets** via `config.quickAdd: [5, 10, 20]` — one tap logs that many minutes.
  - **Daily goal** (`config.dailyGoal: 10`) with progress ring + goal line on the chart.
- **P2**
  - **Lifetime total minutes** ("4,820 min · 80 hrs") in the stats strip — the long-practice payoff.
  - Meditation **streak** promoted to an amber pill (consistency is the point).
- **P3**
  - **Guided timer add-on**: a small start/stop timer (timestamp-based, persists across reload via `localStorage` like Focus); on stop it logs elapsed minutes to `daily_trackers`. This is the delightful version and the reason to consider graduating.
  - Optional ambient/bell at session end.

**Data** — None for tracking. The timer reuses the Focus pattern (client timestamp + localStorage), still writing to `daily_trackers`. Config: `quickAdd`, `dailyGoal`.

**Verdict** — **Ride the upgraded template for P1/P2**; the **timer add-on (P3) is worth a small graduation** to a custom page that mirrors Focus, then logs into `daily_trackers`. Effort **M**.
