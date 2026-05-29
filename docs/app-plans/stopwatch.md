# Stopwatch (`stopwatch`)

**Purpose** — Actually time something live, then log the elapsed duration.

**Current state** — Rides the generic `TrackerView`. Config: `trackerType: "stopwatch"`, `unit: "minutes"`, `min 0`, `max 1440`, `aggregate: "sum"`. **This is mislabeled.** The catalog calls it "Stopwatch" and the icon is ⏲, but the app only lets you **type a number of minutes** — there is no running stopwatch. Users tapping "Stopwatch" expect a clock that counts up.

**Gaps (specific to stopwatch)**
- **The core feature is missing entirely**: no start, no stop, no live elapsed display.
- No lap support, no label for "what am I timing."
- Logging a remembered number of minutes defeats the purpose of a stopwatch.

> **Status (2026-05-29):** ✅ P1 shipped — graduated to a custom app (`ui: "modern"`,
> `src/app/app/stopwatch/`). Timestamp-based start/pause/resume/lap/reset in `localStorage`, live
> hh:mm:ss, optional label, Stop & log → `daily_trackers`, today total + 7-day chart + history.
> Remaining: P3 keep-awake / sound / mid-reset resume.

**Plan**
- **P1 — build a real stopwatch (the whole point).** ✅ shipped
  - **Graduate to a custom app** (`ui: "modern"`, add `src/app/app/stopwatch/page.tsx` + `actions.ts`).
  - **Start / stop / reset** stopwatch using a **timestamp-based** clock (store `startedAt` in `localStorage` so it survives reloads — same pattern as Focus/Pomodoro), with a large live mm:ss / hh:mm:ss display.
  - Optional **label** ("what are you timing?") and **laps** (split list while running).
  - On **stop**, log the elapsed **minutes** to `daily_trackers` (`tracker_type: "stopwatch"`) with the label as `note` — keeps history compatible with existing data.
- **P2**
  - History of timed sessions (label + duration + date) with delete, reusing the tracker history shape.
  - Today's total time + 7-day chart of time logged (the shared tracker visuals still apply to the logged values).
- **P3**
  - Keep-screen-awake while running; haptic/sound on lap; resume a session interrupted by reload.

**Data** — None new. Still `daily_trackers` (`stopwatch`, value = elapsed minutes, `note` = label). Catalog entry stays; change `ui` from `tracker` to `modern`.

**Verdict** — **Must graduate to a custom app.** The current tracker is the wrong app for the name; a timestamp-based stopwatch (like Focus) that logs minutes is required. Effort **M**.
