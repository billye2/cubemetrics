# Packing (`packing`)

**Purpose** — A packing checklist per trip so nothing gets left behind, reusable trip after trip.

**Current state** — Generic `ChecklistView` (`ui: "checklist"`, `itemLabel` "Item"). Flat list you tick as you pack and delete after. No categories, no progress bar, and crucially no way to reuse the same list for the next trip — you rebuild it from scratch every time.

**Gaps** — Packing is *inherently recurring* and *inherently grouped*. Today it's neither. A 30-item list with no headings (clothes vs toiletries vs tech vs documents) is hard to scan while throwing things in a bag. There's no "almost done" signal as you pack. And the single biggest miss: after a trip the list is checked off and useless — you can't uncheck-all to reuse it, nor start from a "beach trip" vs "business trip" template.

**Plan**

**P1 — core**
- Cross-cutting progress header ("18 of 24 packed") + thin bar, and row/sort upgrades: see `_checklist-template.md`. The progress bar is the hero for this app.
- **Categories.** Group rows under headings (Clothes, Toiletries, Tech, Documents, Misc) via `section TEXT`, with a category picker on add.

**P2 — reuse (the key feature)**
- **"Uncheck all to reuse."** One tap resets `completed=false` across the list so the same packing list serves the next trip — no rebuild.
- **Trip-type templates.** Seed buttons (Beach / Business / Camping / Weekend) that populate a sensible starter set with categories, then you tweak. Templates can be hardcoded starter arrays.
- **Duplicate list** so a base list spawns a trip-specific copy you can edit without losing the master.

**P3 — delight**
- **Per-category progress** (e.g. "Toiletries 3/5") in each section header.
- **Quantity** for multi-day items ("5x socks") via the shared `quantity` column.
- **"All packed!" celebration** state when progress hits 100%.

**Data** — Add to `checklists`: `section TEXT`, optional `quantity INT`. "Uncheck all" and "duplicate" are bulk actions over existing rows. Templates are client-side starter arrays inserted as rows. No new table.

**Verdict** — **Ride the upgraded template. Effort S.** Packing is a poster child for the recurring-list upgrades — categories + progress bar + uncheck-all-to-reuse turn a throwaway list into a tool you keep, all on existing/template columns.
