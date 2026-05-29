# Home Maintenance (`homemaint`)

**Purpose** — Stay ahead of recurring home upkeep — filters, gutters, smoke detectors — so nothing gets forgotten until it breaks.

**Current state** — Generic `ChecklistView` (`ui: "checklist"`, `itemLabel` "Task"). A flat list you check off once and delete. Home maintenance is fundamentally *recurring and scheduled*, and the template captures neither — checking off a task loses it forever, so next quarter you've forgotten it existed.

**Gaps** — The whole app hinges on **recurrence and due dates**, both absent. There's no interval ("every 3 months", "yearly"), no last-done date, no overdue highlighting (the one thing that should jump out), and no grouping by room/system. As a one-shot checklist it can't do its job: tell you *what's due now* and *what's coming up*.

**Plan**

**P1 — due dates + recurrence (the key feature)**
- Cross-cutting due-date/overdue upgrades: see `_checklist-template.md`.
- **Recurring intervals.** Each task carries a frequency (monthly / quarterly / biannual / yearly). On "mark done", stamp last-done and auto-advance `due_date` by the interval instead of deleting — the task lives forever and re-surfaces on schedule.
- **Overdue highlighting.** Sort/color: **Overdue (red) → Due soon → Upcoming**, with relative dates ("3 weeks overdue", "due in 10 days").

**P2 — organize**
- **Group by room/system** (HVAC, Plumbing, Exterior, Safety) via `section TEXT`.
- **Last-done history** shown on the row ("last done Feb 2026"); a filter for "due in next 30 days".

**P3 — delight**
- **Seed list** of common home tasks with sensible default intervals (furnace filter q3mo, gutters yearly, smoke-detector batteries yearly).
- **Cost/notes** per task and a yearly upkeep calendar view.

**Data** — Add to `checklists`: `due_date DATE`, `section TEXT`, and a recurrence field (`recurrence TEXT` / `interval_days INT`) plus a `last_done_at DATE`. The auto-advance-on-complete lives in `actions.ts`. No new table.

**Verdict** — **Ride the upgraded template + recurrence. Effort S/M.** It's a list, but the defining behavior is **recurring due dates with auto-advance and overdue highlighting** — the shared due-date columns plus a small recurrence column and a smarter toggle action. The recurrence logic is the S→M bump.
