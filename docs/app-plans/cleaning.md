# Cleaning (`cleaning`)

**Purpose** — A recurring cleaning schedule by room and frequency, with a clear "what needs doing today" and a streak for staying on top.

**Current state** — Generic `ChecklistView` (`ui: "checklist"`, `itemLabel` "Task"). Flat list you check off once and delete. Cleaning is the definition of a *repeating routine*, so a one-shot list is the wrong shape — yesterday's checked-off chores should come back today/this week, not disappear.

**Gaps** — No recurrence (daily/weekly/monthly), so chores can't repeat. No "today's chores" view, so you can't tell at a glance what's due now versus this month. No grouping by room. And no momentum: a cleaning app lives or dies on the *habit*, but there's no streak or reset cadence to reward consistency.

**Plan**

**P1 — recurrence + today view (the key feature)**
- Cross-cutting due-date/recurrence upgrades: see `_checklist-template.md`.
- **Frequency per chore** (daily / weekly / monthly). On "done", stamp last-done and reset the chore's next-due by its cadence rather than deleting — chores cycle automatically.
- **"Today's chores" view.** A hero filter showing exactly what's due now (overdue + due-today), so the app answers one question fast.

**P2 — organize & momentum**
- **Group by room** (Kitchen, Bath, Bedrooms, Living) via `section TEXT`, with per-room "done today" counts.
- **Streak** of days/weeks you cleared the due chores — the motivator, in a stat strip.

**P3 — delight**
- **Reset cadence visualization** — a small weekly grid of which chores are due each day.
- **Seed schedules** (a starter daily/weekly/monthly set) and an "all clear today!" celebration.

**Data** — Add to `checklists`: `section TEXT`, `due_date DATE`, a recurrence field (`recurrence TEXT` daily/weekly/monthly) and `last_done_at DATE`. Streak derives from completion history; the cycle-on-complete logic lives in `actions.ts`. No new table.

**Verdict** — **Ride the upgraded template + recurrence. Effort S/M.** Closely mirrors `homemaint` but tuned for shorter cadences and habit-building — the recurrence columns plus a "today" filter and a streak. The cycling logic + streak are the S→M bump.
