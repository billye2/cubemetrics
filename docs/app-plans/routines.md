# Routines (`routines`)

**Purpose** — Build morning/evening routines: ordered steps you run through, daily.

**Current state** — Generic ChecklistView, `listType: "routine"`, itemLabel "Routine". A flat list with no ordering, no grouping into named routines, and no daily reset — so a completed routine just stays checked forever.

**Gaps**
- No grouping into named routines (Morning / Evening / Workout).
- Steps aren't ordered, and there's no "run mode" to step through them.
- No daily reset — checks should clear each day so the routine is repeatable.
- No streak for completing the routine consistently.

**Plan**
- **P1 (graduate-ish)** — Ride the **upgraded template** as a base (sections = routine name, `position` = step order) but add the two things that make routines work: **ordered steps** and **daily reset**. Completion state is scoped to "today"; on a new day all steps show unchecked again. See `_checklist-template.md` for sections, reorder/`position`, and "uncheck all".
- **P2** — **Run mode**: a focused, full-screen flow that walks you through steps one at a time, advancing as you complete each, with a progress bar. A routine is "complete" when all its steps are done for the day.
- **P3** — **Streak** of consecutive days the routine was fully completed (the momentum mechanic from the reference apps); time-of-day grouping/labels (morning/evening); optional per-routine completion history chart.

**Data** — `checklists` + `section` (routine name) + `position` (step order). Daily reset needs a per-day completion record — add a small `routine_runs` table (`routine name, date, completed_steps`) or store last-completed date and compare to today. Streak derives from `routine_runs`.

**Verdict** — **GRADUATE-ish** — rides the upgraded template for structure but needs ordered steps, daily reset, run mode, and a streak. Effort **M**.
