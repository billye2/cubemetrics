# Calendar (`calendar`)

**Purpose** — A personal calendar: schedule events with date/time and see what's coming up.

**Current state** — Custom page, agenda-style. A collapsible "+ New event" form captures title, date (defaults to today), optional time, and a description. Events render as an agenda grouped by day under **Upcoming**, with a collapsible **Past** section. Each row shows time (or "All day") + title + notes, with inline delete and confirm. Day headers use friendly labels and drop the year when it's the current year.

**Gaps** — Several. **No edit / reschedule** — a wrong date means delete and re-create. **The `end_date`, `end_time`, and `recurrence` columns all exist but are entirely unused** — so there are no durations, no multi-day events, and no repeating events. There's **only an agenda view, no month grid**, which is the canonical calendar affordance. No today highlight in the list, no visual distinction between all-day and timed events beyond a label, no reminders. It's a sorted event list, not yet a calendar.

**Plan**

**P1 — core / completeness**
- **Edit / reschedule an event** — open the form pre-filled on tap; `updateEventAction`. Removes the delete-and-recreate tax.
- **Use `end_time` for duration** — capture end time, show "2:00–3:30 PM" and compute duration; lay timed events visually below all-day ones within a day.
- **Today highlight** — mark today's day section distinctly and pin it to the top of Upcoming.

**P2 — enhancements**
- **Month grid view + toggle** — a segmented Agenda ⇄ Month switch; the month grid marks days with events (dots/counts) and taps through to that day's agenda. The missing core visualization.
- **Recurrence** — wire up the existing `recurrence` column (daily / weekly / monthly) with a picker on the form, and expand recurring events into occurrences across the visible range on read.
- **Multi-day events** — use the existing `end_date` so an event can span days, rendered across each day it covers in both views.

**P3 — delight**
- **Reminders / notifications** — browser Notification (with permission) for events within N minutes; optional lead-time per event.
- **Color categories** — a category + color per event, shown as the dot color in month view and an accent in agenda.
- **Week view** — a third view mode between agenda and month.
- **ICS import/export** + **cross-app surfacing** — pull due dates from Countdown and Bills (`finance_items.due_date`) onto the calendar as read-only markers.

**Data** — No new columns for the headline wins: `end_date`, `end_time`, and `recurrence` already exist and are unused — wiring them up is most of P1/P2. Color categories add `category TEXT` + `color TEXT`. Reminders add a `remind_minutes INT`. Recurrence expansion is read-time logic, not stored rows. All additions stay RLS-scoped.

**Verdict** — **L.** Highest-impact change: **add a month grid view plus edit, and light up the dormant `end_*`/`recurrence` columns** — that turns a flat agenda into something that actually feels like a calendar, with much of the data model already in place.
