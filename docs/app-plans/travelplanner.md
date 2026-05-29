# Travel (`travelplanner`)

**Purpose** — Plan trips: itinerary by day, bookings, docs, and packing in one place.

**Current state** — Generic ChecklistView, `listType: "travel"`, itemLabel "Item". A single flat list across all trips with no dates or structure — far too thin for trip planning.

**Gaps**
- No concept of a trip — everything is one undifferentiated list.
- No itinerary grouped by day/date, no times.
- No categories (flights / lodging / activities / docs).
- No reusable trip template; no link to the trip's countdown.

**Plan**
- **P1** — Ride the **upgraded template**, leaning hard on sections + dates. Use `section` for either trip name or day ("Day 1 — Mon"), `due_date` for the date, `note` for time + details (confirmation #, address). Category chips (flights/lodging/activities/docs/packing) via `note` prefix or a small enum. Progress header per trip. See `_checklist-template.md` for sections, sort, and "duplicate list" (reusable trip templates).
- **P2** — Itinerary view grouped by date, sorted chronologically, with times rendered inline. "Duplicate trip" to reuse a template. Surface the trip start date and **link to the Countdown app** for the live countdown.
- **P3** — If multi-trip management gets heavy, light graduate to a `trips` parent table (name, start/end date, destination) with items as children — enables a trip picker and per-trip dashboards.

**Data** — Stay on `checklists` for P1/P2: `section` (trip or day), `due_date`, `note` (time/details/category). Graduate option: `trips` table as a parent; items reference `trip_id`.

**Verdict** — **RIDE the upgraded template** (graduate-ish) with sections-as-trips/days + dates; promote to a `trips` parent table only if needed. Effort **M**.
