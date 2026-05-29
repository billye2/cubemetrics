# Grocery (`grocery`)

**Purpose** — A fast shopping list you build at home and check off in the store aisle by aisle.

**Current state** — Generic `ChecklistView` (`ui: "checklist"`, `itemLabel` "Item"). Flat list: add a title, tap to check off, delete, collapse completed. No quantity, no aisle grouping, no way to reuse a weekly staple list.

**Gaps** — Grocery is the *canonical* checklist, but the flat list still falls short of a real shopping run. You can't note "2x" of anything. Items appear in entry order, not store order, so you backtrack across the aisle. After a shop there's no clean way to clear what you bought while keeping the recurring staples (milk, eggs, bread) for next week. Typing the same 15 staples every week is the core friction.

**Plan**

**P1 — core**
- Cross-cutting row/progress/sort upgrades: see `_checklist-template.md` (note line, "n of m", sort toggle).
- **Quantity per item.** A small numeric chip ("2", "500g" as free text in `note` or `quantity INT`) shown on the row, editable inline. The most-requested grocery affordance.
- **"Clear bought."** One bulk action that deletes all checked items at end of shop, leaving unchecked ones for next time. Faster than deleting one by one.

**P2 — sections & reuse**
- **Aisle/store sections.** Group rows under headings (Produce, Dairy, Frozen, Pantry) via `section TEXT`, rendered grouped so you shop top-to-bottom. A small section picker on add; remember last-used section per item name.
- **Staples list / reuse.** Mark items as staples; a "Add staples" button repopulates the recurring set in one tap so the weekly list starts 80% done.

**P3 — delight**
- **Recently-bought suggestions.** As you type, suggest names you've added before (distinct titles from this list_type), with their last section/quantity prefilled — near-zero-typing entry.
- **Check-all per section** and a running item count in each section header.

**Data** — Add to `checklists`: `quantity INT` (or reuse `note` for "500g"), `section TEXT`. Staples can be a boolean folded into `note`/a `position` convention, or a `staple BOOLEAN` if it grows. No new table.

**Verdict** — **Ride the upgraded template. Effort S.** Grocery is exactly what the checklist template is for; the wins (quantity, sections, clear-bought, staples reuse) all land via the shared P1/P2 columns plus a thin grocery-specific staples action.
