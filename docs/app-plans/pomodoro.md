# Pomodoro (`pomodoro`)

**Purpose** — Work in structured Pomodoro intervals: focused work split by short and long breaks.

**Current state** — Custom app (`PomodoroView.tsx`). A single timestamp-based timer: presets (15/25/45/60), an optional label, a big `MM:SS` countdown with a progress bar, "Finish early" and "Cancel" (with `confirm`). When the countdown hits zero it auto-completes the session on the server. A "Today" stat counts completed pomodoros, and a "Recent" list shows past sessions (date/time, label, minutes). `startSessionAction` deletes any existing incomplete session before inserting, so there's only ever one active timer. The active timer is **server-stored** (`pomodoro_sessions.started_at`), not `localStorage` — it survives reloads but is one-session-at-a-time. Backed by `pomodoro_sessions` (RLS-scoped).

**Gaps** — It's missing the *defining* Pomodoro feature: **automatic work/break cycles.** Today it's just a one-shot timer that overlaps the Focus app with no clear distinction. After a work session ends, nothing prompts a break; there's no short-break / long-break rhythm, no "long break every 4 pomodoros." No completion sound or notification — a backgrounded tab silently finishes. No daily goal, no chart (the quality bar wants a 7-day visualization — only a flat "Today" count exists). Durations aren't configurable beyond the four presets.

**Plan**

**P1 — makes it complete**
- **Automatic cycle** — a real Pomodoro loop: 25-min work → 5-min short break → repeat, with a 15-min long break every 4th pomodoro. The timer auto-advances phases (or one tap to start the next), with a clear "Work / Break" hero state and a 1–4 cycle-dot indicator.
- **Completion sound + browser notification** — a short chime on phase change plus a `Notification` (permission-gated) so a backgrounded tab still alerts. Pure client-side.

**P2 — enhancements**
- **Configurable durations & cycle settings** — work/short/long minutes and pomodoros-per-long-break, persisted in `localStorage` first.
- **Today / week chart** — a 7-day bar of completed pomodoros, the missing visualization, derived from `completed_at`.
- **Daily pomodoro goal** — set a target (e.g. 8/day) and show progress against it in the stats strip.

**P3 — delight**
- **Ambient sound** during work intervals (optional, off by default).
- **Auto-start next phase** toggle (vs. tap-to-start).
- **Task linkage** — carry the label across a cycle and roll up pomodoros per task.

**Positioning** — Pomodoro = *structured cycles* (work/break rhythm, counts); Focus = *one open-ended deep-work block* (intent + distraction parking). The break automation is what makes them distinct, not redundant. Note the implementation difference: Focus keeps its active session in `localStorage`; Pomodoro currently keeps it server-side — a multi-phase cycle is easier to drive client-side, so consider moving the active cycle to `localStorage` and only writing *completed* work sessions to the server (matching the Focus pattern).

**Data** — `pomodoro_sessions` is sufficient (`completed`, `completed_at`, `label`, `duration_minutes`). Consider a `kind` column (`work` / `short_break` / `long_break`) if breaks are also logged, but breaks can stay client-only. Settings + daily goal live in `localStorage` first. No required migration.

**Verdict** — **M.** A clean timer that isn't yet a Pomodoro. Highest-impact change: **real automatic work/break cycles** (with the long-break rule) — that's the whole point of the app and what separates it from Focus.
