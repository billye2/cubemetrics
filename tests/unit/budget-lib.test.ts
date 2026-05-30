import { describe, it, expect } from "vitest";
import {
  buildLines,
  isMonthISO,
  isOver,
  monthLabel,
  monthStartISO,
  nextMonthStartISO,
  pace,
  prevMonthStartISO,
  sumByCategory,
  totalsOf,
  type BudgetLine,
  type CategoryRow,
} from "@/app/app/budget/lib";

function cat(over: Partial<CategoryRow>): CategoryRow {
  return { id: 1, name: "Food", color: "#fff", sort_order: 0, ...over };
}

describe("month arithmetic", () => {
  it("monthStartISO returns first of the month", () => {
    expect(monthStartISO(new Date(2026, 4, 29))).toBe("2026-05-01");
    expect(monthStartISO(new Date(2026, 0, 1))).toBe("2026-01-01");
  });

  it("nextMonthStartISO rolls into the next month and year", () => {
    expect(nextMonthStartISO("2026-05-01")).toBe("2026-06-01");
    expect(nextMonthStartISO("2026-12-01")).toBe("2027-01-01");
  });

  it("prevMonthStartISO rolls back across year boundary", () => {
    expect(prevMonthStartISO("2026-05-01")).toBe("2026-04-01");
    expect(prevMonthStartISO("2026-01-01")).toBe("2025-12-01");
  });

  it("isMonthISO accepts only first-of-month strings", () => {
    expect(isMonthISO("2026-05-01")).toBe(true);
    expect(isMonthISO("2026-05-15")).toBe(false);
    expect(isMonthISO("2026-5-1")).toBe(false);
    expect(isMonthISO("nope")).toBe(false);
  });

  it("monthLabel renders a friendly label", () => {
    expect(monthLabel("2026-05-01")).toBe("May 2026");
    expect(monthLabel("2026-12-01")).toBe("December 2026");
  });
});

describe("sumByCategory", () => {
  it("groups and sums amounts per category, coercing strings", () => {
    const m = sumByCategory([
      { category: "Food", amount: 10 },
      { category: "Food", amount: "5.5" },
      { category: "Transport", amount: 20 },
    ]);
    expect(m.get("Food")).toBe(15.5);
    expect(m.get("Transport")).toBe(20);
    expect(m.size).toBe(2);
  });
});

describe("buildLines", () => {
  const cats = [cat({ name: "Food" }), cat({ id: 2, name: "Transport", color: "#00f", sort_order: 1 })];

  it("builds one line per category in order with planned + spent", () => {
    const lines = buildLines(
      cats,
      new Map([["Food", 400]]),
      new Map([["Food", 250]]),
    );
    expect(lines.map((l) => l.category)).toEqual(["Food", "Transport"]);
    expect(lines[0]).toMatchObject({ planned: 400, spent: 250, color: "#fff" });
    expect(lines[1]).toMatchObject({ planned: 0, spent: 0 });
  });

  it("appends orphan categories that only appear in targets or expenses", () => {
    const lines = buildLines(
      cats,
      new Map([["Gifts", 100]]),
      new Map([["LegacyCat", 30]]),
    );
    const names = lines.map((l) => l.category);
    expect(names).toContain("Gifts");
    expect(names).toContain("LegacyCat");
    const gifts = lines.find((l) => l.category === "Gifts")!;
    expect(gifts).toMatchObject({ planned: 100, spent: 0, color: "#71717a" });
  });
});

describe("totalsOf + isOver", () => {
  const lines: BudgetLine[] = [
    { category: "Food", color: "#fff", planned: 400, spent: 450 },
    { category: "Transport", color: "#00f", planned: 100, spent: 60 },
  ];

  it("sums planned/spent/remaining", () => {
    expect(totalsOf(lines)).toEqual({ planned: 500, spent: 510, remaining: -10 });
  });

  it("isOver flags only over-plan categories", () => {
    expect(isOver(lines[0])).toBe(true);
    expect(isOver(lines[1])).toBe(false);
    expect(isOver({ category: "x", color: "", planned: 0, spent: 50 })).toBe(false);
  });
});

describe("pace", () => {
  it("returns null when not the current month or no plan", () => {
    const t = { planned: 100, spent: 50, remaining: 50 };
    expect(pace(t, false)).toBeNull();
    expect(pace({ planned: 0, spent: 50, remaining: -50 }, true)).toBeNull();
  });

  it("flags ahead-of-pace when spend outruns the month", () => {
    // Day 10 of a 31-day month ≈ 32% elapsed; spent 80% of budget → ahead.
    const now = new Date(2026, 4, 10);
    const p = pace({ planned: 100, spent: 80, remaining: 20 }, true, now);
    expect(p).not.toBeNull();
    expect(p!.aheadOfPace).toBe(true);
    expect(p!.spendFraction).toBeCloseTo(0.8);
  });

  it("not ahead of pace when spend tracks time", () => {
    // Day 28 of a 31-day month ≈ 90% elapsed; spent 50% → fine.
    const now = new Date(2026, 4, 28);
    const p = pace({ planned: 100, spent: 50, remaining: 50 }, true, now);
    expect(p!.aheadOfPace).toBe(false);
  });
});
