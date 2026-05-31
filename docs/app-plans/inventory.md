# Inventory (`inventory`)

**Purpose** — A catalog of things you own — for insurance, moving, or just knowing what's where and what it's worth.

**Current state** — Generic `ChecklistView` (`ui: "checklist"`, `itemLabel` "Item"). Each possession is a title you can "check off" and delete. Checkbox semantics make no sense for things you own — you don't *complete* a couch.

**Gaps** — Inventory is about *attributes*, not completion. There's no quantity, no value (so no total worth — the headline number for insurance), no location/room (so you can't answer "what's in the garage"), no category, and no photo (proof of ownership). The check-off and collapse-completed UI are dead weight, and with dozens of items there's no search.

**Plan**

**P1 — make possessions real (graduate)** — ✅ shipped (branch `claude/inventory-build`)
- [x] **Custom page + `actions.ts`** (`ui: "modern"`). An item with **name, quantity, value, location/room, category**, and optional **photo** (image URL). No checkbox. Inline edit + delete per row.
- [x] **Total value** hero (sum of value × quantity) — the single most useful number. Plus item/unit/location sub-stats.
- [x] **Search** across name/category/location.

**P2 — organize** — ✅ shipped (branch `claude/inventory-build`)
- [x] **Group by room/location** with per-room subtotals (value and item count), rooms ordered by subtotal desc; "Unassigned" bucket for items with no location.
- [x] **Category filter chips** (electronics, furniture, kitchen, …), recent-first, toggle to clear, plus an "All" chip.
- [x] **Sort by value / name / room** (value = total value desc; applied within each room group).

**P3 — delight** — ✅ shipped (branch `claude/inventory-build`)
- [x] **Photo grid view** for visual scanning (toggle between list and grid); **receipts/warranty links** per item (new `receipt_url` / `warranty_url` fields surfaced as link chips on rows and grid cards).
- [x] **Insurance export** — client-side **CSV** download (RFC-4180-escaped: name, qty, value each/total, location, category, photo/receipt/warranty URLs) of the current filtered+sorted view, plus a **Print** button (print-friendly: controls/edit buttons hidden via `print:hidden`).

**Data** — **GRADUATE.** New `inventory_items` table: `id, user_id, name TEXT NOT NULL, quantity INT DEFAULT 1, value NUMERIC, location TEXT, category TEXT, photo_url TEXT, created_at`, standard RLS (owner FOR ALL + SysOp SELECT). (Interim: `checklists` + `quantity`/`note`, but value math and grouping want real columns.)

**Schema delta shipped (P1)** — migration `src/supabase/migrations/20260530T0745_inventory_items.sql` creates `public.inventory_items` exactly as specced above (`value` is `NUMERIC`, nullable; `quantity` `INTEGER NOT NULL DEFAULT 1`), with RLS enabled, the owner `FOR ALL` policy, the SysOp `FOR SELECT` policy, and an index on `(user_id, created_at DESC)`. The legacy `checklists` rows for `listType: "inventory"` are left in place (not migrated). Integrator: fold this table into `docs/database.md`.

**Schema delta shipped (P3)** — migration `src/supabase/migrations/20260530T1900_inventory_items_receipt_warranty.sql` adds two nullable `TEXT` columns to `public.inventory_items`: `receipt_url` and `warranty_url` (both `add column if not exists`). No RLS change — they inherit the base table's owner-all + sysop-select policies. Integrator: add these two columns to the `inventory_items` row in `docs/database.md`.

**Verdict** — **GRADUATE to a custom app. Effort M.** Quantity, value, location, and photos don't fit a checkbox row, and "total worth grouped by room" is the whole point. A purpose-built table + a grouped/searchable page; medium effort.
