import { describe, it, expect } from "vitest";
import {
  computeExpiry,
  formatRemaining,
  statusFor,
  toWarranty,
  sortWarranties,
  statsFor,
  type WarrantyRow,
} from "@/app/app/warranty/lib";

function row(over: Partial<WarrantyRow>): WarrantyRow {
  return {
    id: 1,
    name: "Thing",
    purchase_date: "2026-01-01",
    warranty_months: 12,
    store: null,
    note: null,
    receipt_url: null,
    archived: false,
    created_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

describe("computeExpiry", () => {
  it("adds whole months", () => {
    expect(computeExpiry("2026-01-15", 12).getFullYear()).toBe(2027);
    const d = computeExpiry("2026-01-15", 12);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(15);
  });

  it("clamps day-of-month overflow (Jan 31 + 1mo -> Feb 28)", () => {
    const d = computeExpiry("2026-01-31", 1);
    expect(d.getMonth()).toBe(1); // February
    expect(d.getDate()).toBe(28); // 2026 is not a leap year
  });

  it("clamps into a leap February (2028)", () => {
    const d = computeExpiry("2028-01-31", 1);
    expect(d.getDate()).toBe(29);
  });
});

describe("statusFor", () => {
  it("expired when days left is negative", () => {
    expect(statusFor(-1)).toBe("expired");
  });
  it("soon within 60 days (inclusive)", () => {
    expect(statusFor(0)).toBe("soon");
    expect(statusFor(60)).toBe("soon");
  });
  it("active beyond 60 days", () => {
    expect(statusFor(61)).toBe("active");
  });
});

describe("formatRemaining", () => {
  it("years / months / weeks / days left", () => {
    expect(formatRemaining(730)).toBe("2 years left");
    expect(formatRemaining(90)).toBe("3 months left");
    expect(formatRemaining(21)).toBe("in 3 weeks");
    expect(formatRemaining(3)).toBe("in 3 days");
    expect(formatRemaining(1)).toBe("in 1 day");
    expect(formatRemaining(0)).toBe("expires today");
  });
  it("expired phrasing", () => {
    expect(formatRemaining(-1)).toBe("expired yesterday");
    expect(formatRemaining(-5)).toBe("expired 5 days ago");
    expect(formatRemaining(-400)).toBe("expired 1 year ago");
  });
});

describe("toWarranty", () => {
  it("computes days left and active status for a fresh 1-year warranty", () => {
    const w = toWarranty(row({ purchase_date: "2026-05-01", warranty_months: 12 }), new Date(2026, 4, 29));
    expect(w.expiry).toBe("2027-05-01");
    expect(w.status).toBe("active");
    expect(w.daysLeft).toBeGreaterThan(300);
  });

  it("flags a warranty expiring within 60 days as soon", () => {
    const w = toWarranty(row({ purchase_date: "2025-07-01", warranty_months: 11 }), new Date(2026, 4, 29));
    // expires 2026-06-01, ~3 days out
    expect(w.status).toBe("soon");
  });

  it("flags a past warranty as expired", () => {
    const w = toWarranty(row({ purchase_date: "2024-01-01", warranty_months: 12 }), new Date(2026, 4, 29));
    expect(w.status).toBe("expired");
    expect(w.daysLeft).toBeLessThan(0);
  });
});

describe("sortWarranties", () => {
  it("orders soon before active before expired, then by days left", () => {
    const today = new Date(2026, 4, 29);
    const list = [
      toWarranty(row({ id: 1, purchase_date: "2024-01-01", warranty_months: 12 }), today), // expired
      toWarranty(row({ id: 2, purchase_date: "2026-05-01", warranty_months: 36 }), today), // active
      toWarranty(row({ id: 3, purchase_date: "2025-07-01", warranty_months: 11 }), today), // soon
    ];
    const sorted = sortWarranties(list);
    expect(sorted.map((w) => w.id)).toEqual([3, 2, 1]);
  });
});

describe("statsFor", () => {
  it("counts each bucket", () => {
    const today = new Date(2026, 4, 29);
    const list = [
      toWarranty(row({ id: 1, purchase_date: "2024-01-01", warranty_months: 12 }), today),
      toWarranty(row({ id: 2, purchase_date: "2026-05-01", warranty_months: 36 }), today),
      toWarranty(row({ id: 3, purchase_date: "2025-07-01", warranty_months: 11 }), today),
    ];
    expect(statsFor(list)).toEqual({ total: 3, active: 1, soon: 1, expired: 1 });
  });
});
