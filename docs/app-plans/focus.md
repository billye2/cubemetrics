# Focus (`focus`)

**Status:** Reference app — **redesigned 2026-06-07 (PR #184)** to the "Intent" model.

> **2026-06-07 redesign (PRs #184–#185).** Rebuilt from the "Intent" design hand-off as a four-stage flow
> **home (journal) → setup → run → reflect**, restyled in the suite's zinc/cyan theme (owner chose
> adapt-to-suite over the warm-paper original). Distraction parking was **dropped**, replaced by a
> post-session reflection (one-line "what got done" + 1–5 focus rating). Data stays in `daily_trackers`
> (`tracker_type:"focus"`, `value`=minutes); reflection/rating/done-criteria pack into `note` as JSON
> (legacy distraction notes degrade gracefully). Added a read-only spine adapter
> (`src/lib/spine/adapters/focus.ts`, "N/60 min" today card). See [[handoff-2026-06-07]]. Notes below
> describe the *pre-redesign* app.

**Purpose** — A single-task focus timer with intent, distraction parking, and a daily focus habit.

**What it already does well**
- Hero countdown timer with progress bar; presets (25/45/60/90) + custom duration.
- Intent capture ("what are you focusing on?") that becomes the session label.
- Distraction parking lot — jot intrusions without breaking focus, saved with the session.
- Stats strip (today total, streak) + 7-day bar chart with today highlighted.
- Resilient in-progress state: active session persists in `localStorage` across reloads; server is the source of truth on completion.
- "Finish early" (saves elapsed minutes) and "Cancel" (discards), with confirm on destructive ops.
- Clean history with date/time, distraction count, inline delete. Encouraging empty state and microcopy.
- Backed by `daily_trackers` (`tracker_type = 'focus'`), RLS-scoped.

**Optional polish**

_P2 — enhancements_
- **Completion cues** — a short chime on finish + a browser Notification (with permission ask) so a backgrounded tab still alerts. Pure client-side; no schema change.
- **Pause / resume** — today the timer only runs straight through. Add a pause that freezes the countdown (store accumulated paused-ms alongside `startedAt` in the `localStorage` session) so a real interruption doesn't force a cancel.
- **Daily focus goal** — let the user set a target (e.g. 120 min/day); show a ring or "84 / 120 min" against today's total in the stats strip. Goal can live client-side first, then graduate to a per-user setting.
- **Longer-range insight** — beyond the 7-day chart, surface weekly total and "best time of day" (which hour blocks you actually complete sessions), derived from existing `created_at` data — no new writes.

_P3 — delight_
- **Per-session ambient sound** — optional looping brown-noise / rain track during a session, muted by default.
- **Project tags on intent** — let the intent carry a `#project` tag and roll up focused minutes per project over time. Cheap to parse from the existing label; only needs a small grouping view.

**Data** — none required for P2/P3 client-side pieces. A daily goal and project rollups can stay client-side or, if persisted, reuse `daily_trackers` notes/labels rather than a new table.

**Verdict** — Complete; revisit only for the polish above.
