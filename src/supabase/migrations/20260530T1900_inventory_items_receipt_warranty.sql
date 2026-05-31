-- Inventory P3: add receipt and warranty reference links per item.
-- These power the "receipts/warranty links per item" delight feature and the
-- insurance export. Both are optional URLs; no RLS change (inherits the
-- inventory_items owner-all + sysop-select policies from the base table).
alter table public.inventory_items
  add column if not exists receipt_url text;

alter table public.inventory_items
  add column if not exists warranty_url text;
