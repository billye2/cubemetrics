# Shared upgrades — Checklist template

`src/app/app/_factories/ChecklistView.tsx` backs every `ui: "checklist"` app (22 of them: grocery,
wishlist, packing, bucketlist, bookmarks, backlog, contacts, inventory, fileindex, homemaint,
cleaning, plantcare, petcare, warranty, travelplanner, vocabulary, routines, dailyplanner,
visionboard, flashcards, mealplanner, clienttracker).

Today it's a single flat list: add a title, check it off, delete, collapse completed. That's fine
for "grocery" but far too thin for 22 distinct use cases — many of these aren't really checklists
(contacts, inventory, bookmarks, flashcards, recipes-ish) and are badly served by a title-only row.

These upgrades make the *template* richer; per-app files then either (a) ride the upgraded template
or (b) graduate to a purpose-built custom app where a flat checklist is the wrong model.

## P1 — structure the row

- **Notes / detail field.** A single title is too little for most lists. Add an optional secondary
  line (URL for bookmarks, quantity for inventory, phone/email for contacts, definition for vocab).
  Backed by a `note` column on `checklists`.
- **Progress header.** "7 of 12 done" + a thin progress bar — instant sense of completion. Trivial
  to add and meaningful for packing, dailyplanner, cleaning.
- **Reorder / sort.** Manual drag-reorder or at least a sort toggle (alpha / newest / done-last).
  A 30-item grocery or packing list needs ordering.

## P2 — grouping & reuse

- **Sections / categories.** Group items under headings (grocery by aisle, packing by bag,
  inventory by room). Add `section TEXT` to `checklists`; render grouped.
- **Templates / "reset for next time".** Packing, cleaning, routines, dailyplanner are *recurring*.
  Add "uncheck all" and "duplicate list" so a packing list can be reused per trip.
- **Quantity & check-count.** For grocery/inventory, a numeric quantity per row.

## P3 — delight

- **Bulk actions** (check all, clear completed).
- **Search/filter** for long lists (contacts, bookmarks, vocab).
- **Due dates** on actionable lists (homemaint, cleaning) with overdue highlighting.

## Data

Add nullable columns to `checklists`: `note TEXT`, `section TEXT`, `quantity INT`, `due_date DATE`.
All optional, all backward-compatible. Reorder needs a `position INT` (or sort client-side by
created_at as today).

## Verdict — split the 22

The checklist template is doing too much. Triage:

- **Genuinely checklists → ride the upgraded template:** grocery, packing, bucketlist, backlog,
  dailyplanner, homemaint, cleaning, travelplanner, routines, visionboard, mealplanner.
- **Want their own model → graduate to custom apps:** contacts (people fields), bookmarks (link
  previews/tags), inventory (qty/value/location), flashcards (spaced repetition), vocabulary
  (review mode), warranty (expiry dates + reminders), clienttracker (status pipeline), fileindex
  (metadata). These are flagged in their individual files.

The P1 row-structuring work is worth doing regardless, because it also benefits the graduated apps
as an interim step.
