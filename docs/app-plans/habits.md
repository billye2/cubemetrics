# Habits (`habits`)

**Purpose** — Build daily habits with one-tap check-ins and visible streaks.

**Current state** — Custom app (`HabitsView.tsx`). A "Today" grid of big (88px) tap targets — one per habit — that check in for today, filling cyan with a ✓ and a streak badge (amber pill) once checked. An add-habit input, and an "All habits" list showing each habit's streak ("⚡ N day streak") and "N/7 this week" with inline delete. `page.tsx` computes per-habit streak (consecutive days ending today/yesterday) and 7-day count from `habit_checkins`. `checkInAction` guards against double check-in; `deleteHabitAction` already **soft-deletes** via `active = false`, and `page.tsx` filters `active = true`. Backed by `habits` + `habit_checkins` (RLS-scoped).

**Gaps** — No per-habit *history* visualization — the quality bar wants a heatmap/calendar, and there's none; streaks are a number, not a picture. `frequency` exists but is ignored — every habit is implicitly daily, so "3x/week" habits look like they're failing 4 days a week, and "N/7" is the only cadence. `active` is used for soft-delete but there's no *archive* UX (no way to view or restore archived habits). Can't undo today's check-in (a mis-tap sticks until tomorrow). Can't edit a habit name. No reorder. No completion-rate %.

**Plan**

**P1 — makes it complete**
- [x] **Per-habit calendar heatmap** — a GitHub-style last-~8-weeks grid per habit (expandable section via the ▾ toggle on each row) showing check-in density. Built in `lib.ts::buildHeatmap` (pure, unit-tested) + `Heatmap` in `HabitsView.tsx`.
- [x] **Undo today's check-in** — `checkInAction` now *toggles*: tapping an already-checked tile deletes today's row, so mis-taps are fixable. The Today tile is no longer disabled once checked.
- [x] **Edit habit name** — inline rename via the shared `InlineEdit` component + `renameHabitAction`. (Already in place; verified.)

**P2 — enhancements**
- **Frequency targets using the `frequency` column** — let a habit be "Nx per week"; show progress against *its* target (e.g. "2/3 this week") and base the streak on weekly target met, not raw consecutive days. Fixes the daily-only assumption.
- **Completion-rate %** — over the last 30/90 days, per habit. (`lib.ts::completionRate` already implemented + tested; not yet surfaced in the UI.)
- **Archive / restore UX** — surface the existing `active` flag: an "Archived" section to restore or hard-delete, instead of soft-deletes vanishing silently.
- **Reorder** habits (drag or up/down) with a `sort_order`.

**P3 — delight**
- **Reminders / browser notifications** at a per-habit time.
- **Habit notes** per check-in ("ran 5k").
- **Stacking / pairing** ("after coffee, meditate").
- **Best-streak record** kept alongside the current streak.

**Data** — `habits.frequency` and `habits.active` already exist and should be *wired up* (frequency targets; archive UX) rather than added. Add `sort_order int` for reorder, optional `reminder_time` for notifications, and a `best_streak int` (or derive it). Per-check-in notes would add a `note` column to `habit_checkins`. All nullable/defaulted.

**Verdict** — **M.** Good check-in loop; missing the visualization and ignoring two columns it already has. Highest-impact change: **per-habit calendar heatmap + honoring the `frequency` column for weekly targets.**
