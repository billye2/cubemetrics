# Calendar (`calendar`)

**Purpose** — A personal calendar: schedule events with date/time and see what's coming up.

**Current state** — Custom page with a **Month grid ⇄ Agenda toggle**. A collapsible "+ Event" form captures title, date (defaults to the selected/ today), start + end time, an optional multi-day end date, a **repeat cadence** (none / daily / weekly / monthly), and a description. Month view marks days with event dots and taps through to that day's list; Agenda groups by day under **Upcoming** with a collapsible **Past** section. Rows show the time range (e.g. "2:00 – 3:30 PM") or "All day", a `↻` repeat badge for recurring series, inline edit (pre-filled, series-aware) and delete-with-confirm. Today is highlighted in both views.

**Gaps** — Mostly closed. P1 (edit/reschedule, `end_time` durations, today highlight) and most of P2 (month grid + toggle, multi-day via `end_date`, recurrence) are shipped. Recurring events expand into occurrences at read-time across the visible window; editing/deleting acts on the whole series (no per-occurrence overrides — that's a P3). Still missing: reminders/notifications, color categories, a week view, and ICS/cross-app surfacing (all P3).

**Plan**

**P1 — core / completeness** — ✅ shipped
- [x] **Edit / reschedule an event** — form pre-filled on tap; `updateEventAction`. Removes the delete-and-recreate tax.
- [x] **Use `end_time` for duration** — captures end time, shows "2:00 – 3:30 PM" via `timeRange()`.
- [x] **Today highlight** — cyan circle in the month grid + a "Today" badge in the agenda.

**P2 — enhancements**
- [x] **Month grid view + toggle** — segmented Agenda ⇄ Month switch; the grid marks days with event dots and taps through to that day's list.
- [x] **Recurrence** — `recurrence` column (daily / weekly / monthly) wired with a picker on the add + edit forms; recurring events expand into occurrences across the visible range on read (`lib.ts` `expandEvents`, unit-tested). Edit/delete act on the whole series.
- [x] **Multi-day events** — `end_date` spans days, rendered across each covered day in both views; recurring multi-day spans carry their duration onto every occurrence.

**P3 — delight**
- **Reminders / notifications** — browser Notification (with permission) for events within N minutes; optional lead-time per event.
- **Color categories** — a category + color per event, shown as the dot color in month view and an accent in agenda.
- **Week view** — a third view mode between agenda and month.
- **ICS import/export** + **cross-app surfacing** — pull due dates from Countdown and Bills (`finance_items.due_date`) onto the calendar as read-only markers.

**Data** — No new columns for the headline wins: `end_date`, `end_time`, and `recurrence` already exist and are unused — wiring them up is most of P1/P2. Color categories add `category TEXT` + `color TEXT`. Reminders add a `remind_minutes INT`. Recurrence expansion is read-time logic, not stored rows. All additions stay RLS-scoped.

**Verdict** — **L.** Highest-impact change: **add a month grid view plus edit, and light up the dormant `end_*`/`recurrence` columns** — that turns a flat agenda into something that actually feels like a calendar, with much of the data model already in place.
