# Inventory (`inventory`)

**Purpose** — A catalog of things you own — for insurance, moving, or just knowing what's where and what it's worth.

**Current state** — Generic `ChecklistView` (`ui: "checklist"`, `itemLabel` "Item"). Each possession is a title you can "check off" and delete. Checkbox semantics make no sense for things you own — you don't *complete* a couch.

**Gaps** — Inventory is about *attributes*, not completion. There's no quantity, no value (so no total worth — the headline number for insurance), no location/room (so you can't answer "what's in the garage"), no category, and no photo (proof of ownership). The check-off and collapse-completed UI are dead weight, and with dozens of items there's no search.

**Plan**

**P1 — make possessions real (graduate)**
- **Custom page + `actions.ts`** (`ui: "modern"`). An item with **name, quantity, value, location/room, category**, and optional **photo** (image URL). No checkbox.
- **Total value** hero (sum of value × quantity) — the single most useful number.
- **Search** across name/category/location.

**P2 — organize**
- **Group by room/location** with per-room subtotals (value and item count).
- **Category filter chips** (electronics, furniture, kitchen, …), recent-first.
- **Sort by value / name / room.**

**P3 — delight**
- **Photo grid view** for visual scanning; receipts/warranty links per item.
- **Insurance export** (CSV/printable) of items, values, and photos.

**Data** — **GRADUATE.** New `inventory_items` table: `id, user_id, name TEXT NOT NULL, quantity INT DEFAULT 1, value NUMERIC, location TEXT, category TEXT, photo_url TEXT, created_at`, standard RLS (owner FOR ALL + SysOp SELECT). (Interim: `checklists` + `quantity`/`note`, but value math and grouping want real columns.)

**Verdict** — **GRADUATE to a custom app. Effort M.** Quantity, value, location, and photos don't fit a checkbox row, and "total worth grouped by room" is the whole point. A purpose-built table + a grouped/searchable page; medium effort.
