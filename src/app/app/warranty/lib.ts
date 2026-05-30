// Pure, testable warranty math. A warranty is a coverage window:
// expiry = purchase_date + warranty_months. We never store the expiry — we
// compute it relative to "today" so the status badge is always current.

export type WarrantyStatus = "expired" | "soon" | "active";

export interface WarrantyRow {
  id: number;
  name: string;
  purchase_date: string; // YYYY-MM-DD
  warranty_months: number;
  store: string | null;
  note: string | null;
  receipt_url: string | null;
  archived: boolean;
  created_at: string;
}

export interface Warranty {
  id: number;
  name: string;
  purchaseDate: string;
  warrantyMonths: number;
  store: string | null;
  note: string | null;
  receiptUrl: string | null;
  archived: boolean;
  expiry: string; // YYYY-MM-DD
  daysLeft: number; // negative once expired
  status: WarrantyStatus;
  label: string; // adaptive remaining-time, e.g. "2 years left", "in 3 weeks", "expired 5 days ago"
}

// "Expiring soon" threshold: amber inside 60 days, deeper amber inside 30.
export const SOON_DAYS = 60;

function parseDate(d: string): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
}

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayDiff(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

/** purchase_date + N months, clamping day-of-month overflow (e.g. Jan 31 + 1mo → Feb 28/29). */
export function computeExpiry(purchaseDate: string, warrantyMonths: number): Date {
  const base = parseDate(purchaseDate);
  const targetMonth = base.getMonth() + warrantyMonths;
  const d = new Date(base.getFullYear(), targetMonth, base.getDate());
  // If the day rolled into the next month (overflow), back up to last day of intended month.
  if (d.getDate() !== base.getDate()) {
    d.setDate(0);
  }
  return d;
}

/** Adaptive remaining-time text. Positive = time left, negative/zero = expired. */
export function formatRemaining(daysLeft: number): string {
  if (daysLeft < 0) {
    const ago = -daysLeft;
    if (ago >= 365) {
      const y = Math.round(ago / 365);
      return `expired ${y} year${y === 1 ? "" : "s"} ago`;
    }
    if (ago >= 60) {
      const mo = Math.round(ago / 30);
      return `expired ${mo} months ago`;
    }
    if (ago >= 14) {
      const w = Math.round(ago / 7);
      return `expired ${w} weeks ago`;
    }
    return ago === 1 ? "expired yesterday" : `expired ${ago} days ago`;
  }
  if (daysLeft === 0) return "expires today";
  if (daysLeft >= 365) {
    const y = Math.round(daysLeft / 365);
    return `${y} year${y === 1 ? "" : "s"} left`;
  }
  if (daysLeft >= 60) {
    const mo = Math.round(daysLeft / 30);
    return `${mo} months left`;
  }
  if (daysLeft >= 14) {
    const w = Math.round(daysLeft / 7);
    return `in ${w} weeks`;
  }
  return daysLeft === 1 ? "in 1 day" : `in ${daysLeft} days`;
}

export function statusFor(daysLeft: number): WarrantyStatus {
  if (daysLeft < 0) return "expired";
  if (daysLeft <= SOON_DAYS) return "soon";
  return "active";
}

const RANK: Record<WarrantyStatus, number> = { soon: 0, active: 1, expired: 2 };

/** Map a DB row to the enriched view model. `today` is injectable for tests. */
export function toWarranty(row: WarrantyRow, today: Date): Warranty {
  const t = new Date(today);
  t.setHours(0, 0, 0, 0);
  const expiry = computeExpiry(row.purchase_date, row.warranty_months);
  const daysLeft = dayDiff(t, expiry);
  const status = statusFor(daysLeft);
  return {
    id: row.id,
    name: row.name,
    purchaseDate: row.purchase_date,
    warrantyMonths: row.warranty_months,
    store: row.store,
    note: row.note,
    receiptUrl: row.receipt_url,
    archived: row.archived,
    expiry: fmtDate(expiry),
    daysLeft,
    status,
    label: formatRemaining(daysLeft),
  };
}

/** Sort: soonest-to-expire first (soon → active → expired), then by days left. */
export function sortWarranties(list: Warranty[]): Warranty[] {
  return [...list].sort((a, b) => {
    if (RANK[a.status] !== RANK[b.status]) return RANK[a.status] - RANK[b.status];
    return a.daysLeft - b.daysLeft;
  });
}

export interface WarrantyStats {
  total: number;
  active: number;
  soon: number;
  expired: number;
}

export function statsFor(list: Warranty[]): WarrantyStats {
  return {
    total: list.length,
    active: list.filter((w) => w.status === "active").length,
    soon: list.filter((w) => w.status === "soon").length,
    expired: list.filter((w) => w.status === "expired").length,
  };
}
