// Pure, testable inventory math. An inventory item is a possession with a
// quantity and a (per-unit) value; its worth is value x quantity. The headline
// number is the sum of every item's worth — the figure you hand your insurer.

export interface InventoryRow {
  id: number;
  name: string;
  quantity: number;
  value: number | null; // per-unit value, may be string from PG NUMERIC
  location: string | null;
  category: string | null;
  photo_url: string | null;
  receipt_url: string | null;
  warranty_url: string | null;
  created_at: string;
}

export interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
  value: number | null; // per-unit
  worth: number; // value x quantity (0 when value unknown)
  location: string | null;
  category: string | null;
  photoUrl: string | null;
  receiptUrl: string | null;
  warrantyUrl: string | null;
  createdAt: string;
}

/** PG NUMERIC arrives as a string; coerce to a finite number or null. */
function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function toItem(row: InventoryRow): InventoryItem {
  const value = toNumber(row.value);
  const quantity = Number.isFinite(row.quantity) && row.quantity > 0 ? Math.floor(row.quantity) : 1;
  return {
    id: row.id,
    name: row.name,
    quantity,
    value,
    worth: value === null ? 0 : value * quantity,
    location: row.location,
    category: row.category,
    photoUrl: row.photo_url,
    receiptUrl: row.receipt_url,
    warrantyUrl: row.warranty_url,
    createdAt: row.created_at,
  };
}

/** Total worth across a list (sum of value x quantity). */
export function totalWorth(items: InventoryItem[]): number {
  return items.reduce((sum, i) => sum + i.worth, 0);
}

/** Format a dollar amount for display. Whole dollars when round, else 2dp. */
export function formatMoney(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  const fractional = rounded % 1 !== 0;
  return rounded.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: fractional ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

/** Case-insensitive search across name, category and location. */
export function searchItems(items: InventoryItem[], query: string): InventoryItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((i) => {
    const hay = `${i.name} ${i.category ?? ""} ${i.location ?? ""}`.toLowerCase();
    return hay.includes(q);
  });
}

export interface InventoryStats {
  count: number; // distinct line items
  units: number; // sum of quantities
  worth: number; // total value
  locations: number; // distinct non-empty locations
}

export function statsFor(items: InventoryItem[]): InventoryStats {
  const locs = new Set<string>();
  let units = 0;
  for (const i of items) {
    units += i.quantity;
    if (i.location) locs.add(i.location.toLowerCase());
  }
  return {
    count: items.length,
    units,
    worth: totalWorth(items),
    locations: locs.size,
  };
}
