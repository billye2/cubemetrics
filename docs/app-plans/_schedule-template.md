# Schedule / Recurring template (factory family #6)

The sixth factory family, from [`_new-app-candidates.md`](_new-app-candidates.md) §D. A recurring
pattern keeps recurring across the suite — **bills, subscriptions, cleaning, homemaint, plantcare,
petcare, routines, medication, warranty, car service** all want the same thing: *"this repeats
every N days/weeks/months; show me what's **due**; let me mark it **done**; it reschedules."* Today
each would reinvent it. This template captures it once.

## The model

One row = one recurring task. `next due = last_done + interval`; if never done, it's **due now**.
Marking done stamps `last_done = today`, which reschedules it. No per-occurrence rows in P1 — the
single `last_done` date drives everything (history of completions is a P2 addition).

## Backing table

`schedule_items` (migration `030_schedule.sql`):

| Column | Notes |
|--------|-------|
| id, user_id | standard |
| `schedule_type` | discriminator selecting which catalog app owns the row (`carcare`, `medication`, …) |
| `title` | the task ("Oil change", "Vitamin D") |
| `interval_days` | recurrence in days (UI offers Daily/Weekly/Monthly/Quarterly/6-monthly/Yearly + custom) |
| `last_done` | DATE, nullable — drives next-due; null = due now |
| `note` | optional detail |
| created_at | |

Standard RLS pair + SysOp read. Indexed `(user_id, schedule_type)`.

## Catalog wiring

`ui: "schedule"`, `config: { scheduleType, itemLabel }`. The `[id]` dispatch fetches
`schedule_items` by `schedule_type` and renders `ScheduleView` — so a new recurring app is a
**catalog entry only**, exactly like the other five families.

## The view (`ScheduleView`)

- **Due hero** — count due/overdue today (the actionable number); "All caught up ✓" when zero.
- **Due-first list** — most overdue on top, then upcoming, then no-interval; relative labels
  ("3d overdue", "due today", "in 2w", "done 5d ago").
- **Mark done** (one tap → `last_done = today`, reschedules), inline **interval** change, delete.
- Add form (title + interval preset + optional note).

## P1 status — _shipped_

- [x] `schedule_items` table + RLS + index (migration `030`).
- [x] `ui: "schedule"` added to the catalog union + `scheduleType` config; `[id]` dispatch branch.
- [x] `ScheduleView` factory + `schedule*` server actions in `_factories/actions.ts`.
- [x] Two new apps prove the family: **Car** (`carcare`) and **Medication** (`medication`).

## P2 / follow-ups (not done — deliberately)

- [ ] **Re-point existing apps** onto the family where the recurring model is the right one
      (cleaning, homemaint, plantcare, petcare, warranty, routines). This is a data migration per
      app (move rows from `checklists` → `schedule_items`) and a catalog `ui` change — done one at a
      time, with care, **not** bundled into the template's first ship.
- [ ] Completion **history** (a `schedule_done` log) for streaks / adherence %.
- [ ] Per-occurrence **snooze**; "due this week" grouping; overdue badge on the home grid.
- [ ] Fold bills/subscriptions' recurrence into the same engine (they currently model recurrence in
      `finance_items.frequency`).

**Why additive-only for P1:** the template's value is real, but re-pointing live apps risks the
working lifestyle/finance apps. Shipping the family + two *new* apps proves it end-to-end with zero
risk to existing data; the migrations come later, individually.
