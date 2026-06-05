import { describe, it, expect } from "vitest";
import {
  toItem,
  totalWorth,
  formatMoney,
  searchItems,
  statsFor,
  type InventoryRow,
} from "@/app/app/inventory/lib";

function row(over: Partial<InventoryRow>): InventoryRow {
  return {
    id: 1,
    name: "Thing",
    quantity: 1,
    value: null,
    location: null,
    category: null,
    photo_url: null,
    receipt_url: null,
    warranty_url: null,
    created_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

describe("toItem", () => {
  it("computes worth as value x quantity", () => {
    const it = toItem(row({ value: 100, quantity: 3 }));
    expect(it.worth).toBe(300);
    expect(it.value).toBe(100);
  });

  it("coerces a PG NUMERIC string value", () => {
    const it = toItem(row({ value: "12.50" as unknown as number, quantity: 2 }));
    expect(it.value).toBe(12.5);
    expect(it.worth).toBe(25);
  });

  it("treats missing value as zero worth", () => {
    const it = toItem(row({ value: null, quantity: 4 }));
    expect(it.value).toBeNull();
    expect(it.worth).toBe(0);
  });

  it("floors a bad quantity to 1", () => {
    expect(toItem(row({ quantity: 0 })).quantity).toBe(1);
    expect(toItem(row({ quantity: -5 })).quantity).toBe(1);
  });
});

describe("totalWorth", () => {
  it("sums value x quantity across items", () => {
    const items = [
      toItem(row({ id: 1, value: 100, quantity: 2 })), // 200
      toItem(row({ id: 2, value: 50, quantity: 1 })), // 50
      toItem(row({ id: 3, value: null, quantity: 9 })), // 0
    ];
    expect(totalWorth(items)).toBe(250);
  });

  it("is zero for an empty list", () => {
    expect(totalWorth([])).toBe(0);
  });
});

describe("formatMoney", () => {
  it("drops cents when whole", () => {
    expect(formatMoney(250)).toBe("$250");
  });
  it("keeps cents when fractional", () => {
    expect(formatMoney(12.5)).toBe("$12.50");
  });
  it("groups thousands", () => {
    expect(formatMoney(1234567)).toBe("$1,234,567");
  });
});

describe("searchItems", () => {
  const items = [
    toItem(row({ id: 1, name: "Sofa", category: "Furniture", location: "Living Room" })),
    toItem(row({ id: 2, name: "Blender", category: "Kitchen", location: "Kitchen" })),
    toItem(row({ id: 3, name: "Laptop", category: "Electronics", location: "Office" })),
  ];

  it("returns all on empty query", () => {
    expect(searchItems(items, "  ").length).toBe(3);
  });

  it("matches by name", () => {
    expect(searchItems(items, "sofa").map((i) => i.id)).toEqual([1]);
  });

  it("matches by category and location case-insensitively", () => {
    expect(searchItems(items, "KITCHEN").map((i) => i.id)).toEqual([2]);
    expect(searchItems(items, "office").map((i) => i.id)).toEqual([3]);
  });
});

describe("statsFor", () => {
  it("counts items, units, worth and distinct locations", () => {
    const items = [
      toItem(row({ id: 1, value: 100, quantity: 2, location: "Garage" })),
      toItem(row({ id: 2, value: 50, quantity: 3, location: "garage" })), // same loc, diff case
      toItem(row({ id: 3, value: null, quantity: 1, location: "Attic" })),
    ];
    expect(statsFor(items)).toEqual({ count: 3, units: 6, worth: 350, locations: 2 });
  });
});
