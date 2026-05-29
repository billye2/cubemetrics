# Daily Planner (`dailyplanner`)

**Purpose** — Plan today: a focused list of what you'll do, with progress and carry-over.

**Current state** — Generic ChecklistView, `listType: "dailyplan"`, itemLabel "Item". A flat list with no date scoping — yesterday's items pile up with today's, defeating the "today's plan" purpose.

**Gaps**
- Not date-scoped — every day's items accumulate in one list.
- No progress sense for today.
- No optional time-blocks; no carry-over of unfinished items.
- No way to plan tomorrow ahead.

**Plan**
- **P1** — Ride the **upgraded template**, date-scoped to **today**. Items get a `due_date`; the default view shows only today's. Progress header "4 of 9 done" + thin bar (the reference-app hero/stat pattern, scaled to a day). See `_checklist-template.md` for the progress header and sort.
- **P2** — Optional **time-blocks**: a time on each item (`note` or a time field), rendered as a simple ordered timeline. **Carry-over**: a one-tap "move unfinished to tomorrow" that re-dates incomplete items to tomorrow's plan.
- **P3** — **"Plan tomorrow"** view to pre-stage tomorrow's items; a small week strip showing completion per day; gentle end-of-day nudge to clear or carry over.

**Data** — Stay on `checklists`: `due_date` (the day the item belongs to), `note` (time-block / detail), `position` (manual ordering within the day). No new table.

**Verdict** — **RIDE the upgraded template**, date-scoped, with carry-over and a progress bar. Effort **S/M**.
