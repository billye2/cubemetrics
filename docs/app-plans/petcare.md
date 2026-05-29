# Pets (`petcare`)

**Purpose** — Stay on top of recurring pet care: feeding, walks, meds, vet visits.

**Current state** — Generic ChecklistView, `listType: "petcare"`, itemLabel "Task". A flat list of care tasks you check off once. Care is recurring (feed twice daily, walk daily, meds weekly), so a one-time checkbox doesn't fit.

**Gaps**
- No schedule/recurrence — tasks vanish when checked instead of resetting for the next cycle.
- No grouping by pet (multi-pet households).
- No "what's due today" view or last-done timestamp.

**Plan**
- **P1** — Ride the **upgraded template** plus a light recurrence layer. Use `section` to group rows by pet name. Add a recurrence field (daily / weekly / once) so checked recurring tasks reset on a new day rather than disappearing. Progress header "3 of 7 done today". See `_checklist-template.md` for sections, progress header, and "uncheck all / reset for next time".
- **P2** — "Today" as the default scope: only show tasks due today, with a last-done relative time ("fed 4h ago"). Per-pet sub-totals. Quick-add presets for common tasks (Feed, Walk, Meds, Vet).
- **P3** — If multi-pet + vet-appointment dates grow important, light graduate: a `pets` table for pet profiles (name, species, photo) referenced by tasks. Vet/appointment items can link to the Countdown app for the date.

**Data** — Stay on `checklists` for P1/P2: use `section` (pet name) + `note` (schedule/details) + `due_date`. Add a `recur TEXT` only if reset-on-schedule is built (could piggyback on `note` initially). Light-graduate option: new `pets` table for profiles.

**Verdict** — **RIDE the upgraded template** with recurrence + per-pet sections; graduate only if pet profiles/vet scheduling become central. Effort **S/M**.
