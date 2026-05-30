import { describe, it, expect } from "vitest";
import {
  actualMonthlyPace,
  daysUntil,
  monthLabel,
  monthsLeft,
  paceComparison,
  progressFraction,
  projectedFinish,
  requiredMonthly,
  statsFor,
  totalSaved,
  type ContributionRow,
  type GoalRow,
} from "@/app/app/savings/lib";

const NOW = new Date(2026, 4, 29); // 2026-05-29 (local)

function contrib(over: Partial<ContributionRow>): ContributionRow {
  return {
    id: 1,
    goal_id: 1,
    amount: 100,
    contributed_on: "2026-05-01",
    note: "",
    created_at: "2026-05-01T00:00:00Z",
    ...over,
  };
}

function goal(over: Partial<GoalRow>): GoalRow {
  return {
    id: 1,
    title: "Fund",
    target_value: 1000,
    due_date: null,
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

describe("totalSaved", () => {
  it("sums amounts", () => {
    expect(totalSaved([contrib({ amount: 100 }), contrib({ amount: 250.5 })])).toBe(350.5);
  });
  it("is zero for empty", () => {
    expect(totalSaved([])).toBe(0);
  });
});

describe("progressFraction", () => {
  it("caps at 1", () => {
    expect(progressFraction(1500, 1000)).toBe(1);
  });
  it("computes ratio", () => {
    expect(progressFraction(250, 1000)).toBe(0.25);
  });
  it("is zero with no target", () => {
    expect(progressFraction(500, null)).toBe(0);
    expect(progressFraction(500, 0)).toBe(0);
  });
});

describe("daysUntil / monthsLeft", () => {
  it("counts forward days", () => {
    expect(daysUntil("2026-05-30", NOW)).toBe(1);
    expect(daysUntil("2026-05-29", NOW)).toBe(0);
  });
  it("never returns negative months", () => {
    expect(monthsLeft("2026-01-01", NOW)).toBe(0);
  });
  it("approximates months", () => {
    // ~6 months out
    expect(monthsLeft("2026-11-29", NOW)).toBeCloseTo(6, 0);
  });
  it("returns null with no due date", () => {
    expect(monthsLeft(null, NOW)).toBeNull();
  });
});

describe("requiredMonthly", () => {
  it("splits remaining over months left", () => {
    // remaining 800 over ~6 months ≈ 133
    const r = requiredMonthly(200, 1000, "2026-11-29", NOW);
    expect(r).toBeCloseTo(800 / monthsLeft("2026-11-29", NOW)!, 5);
  });
  it("is 0 when target met", () => {
    expect(requiredMonthly(1000, 1000, "2026-11-29", NOW)).toBe(0);
  });
  it("is null with no target or due", () => {
    expect(requiredMonthly(100, null, "2026-11-29", NOW)).toBeNull();
    expect(requiredMonthly(100, 1000, null, NOW)).toBeNull();
  });
  it("returns full remaining when due is now/past", () => {
    expect(requiredMonthly(200, 1000, "2026-05-29", NOW)).toBe(800);
  });
});

describe("actualMonthlyPace", () => {
  it("is zero with no contributions", () => {
    expect(actualMonthlyPace([], NOW)).toBe(0);
  });
  it("divides total by elapsed months (min 1 month)", () => {
    // one deposit today → span < 1 month → treated as 1 month
    expect(actualMonthlyPace([contrib({ amount: 300, contributed_on: "2026-05-29" })], NOW)).toBe(300);
  });
  it("spreads over the span", () => {
    // 600 total from 2 months ago to now ≈ 300/mo
    const rows = [
      contrib({ id: 1, amount: 300, contributed_on: "2026-03-29" }),
      contrib({ id: 2, amount: 300, contributed_on: "2026-05-29" }),
    ];
    expect(actualMonthlyPace(rows, NOW)).toBeGreaterThan(290);
    expect(actualMonthlyPace(rows, NOW)).toBeLessThan(310);
  });
});

describe("paceComparison", () => {
  it("ahead / behind / on", () => {
    expect(paceComparison(200, 100)).toBe("ahead");
    expect(paceComparison(50, 100)).toBe("behind");
    expect(paceComparison(100, 100)).toBe("on");
  });
  it("ahead when target met (required 0)", () => {
    expect(paceComparison(0, 0)).toBe("ahead");
  });
  it("unknown when required is null", () => {
    expect(paceComparison(100, null)).toBe("unknown");
  });
});

describe("projectedFinish", () => {
  it("extrapolates a future month", () => {
    // remaining 800 at 200/mo → 4 months out from May → Sep 2026
    const p = projectedFinish(200, 1000, 200, NOW);
    expect(p).toBe("2026-09-01");
  });
  it("is null when already done", () => {
    expect(projectedFinish(1000, 1000, 200, NOW)).toBeNull();
  });
  it("is null with no pace or no target", () => {
    expect(projectedFinish(200, 1000, 0, NOW)).toBeNull();
    expect(projectedFinish(200, null, 200, NOW)).toBeNull();
  });
});

describe("monthLabel", () => {
  it("formats a month + year", () => {
    expect(monthLabel("2026-09-01")).toMatch(/2026/);
  });
});

describe("statsFor", () => {
  it("derives a full picture", () => {
    const g = goal({ target_value: 1000, due_date: "2026-11-29" });
    const rows = [
      contrib({ id: 1, amount: 100, contributed_on: "2026-03-29" }),
      contrib({ id: 2, amount: 100, contributed_on: "2026-05-29" }),
    ];
    const s = statsFor(g, rows, NOW);
    expect(s.saved).toBe(200);
    expect(s.fraction).toBeCloseTo(0.2, 5);
    expect(s.remaining).toBe(800);
    expect(s.complete).toBe(false);
    expect(s.monthsLeft).toBeGreaterThan(0);
    expect(s.requiredMonthly).not.toBeNull();
  });
  it("flags completion", () => {
    const g = goal({ target_value: 500 });
    const s = statsFor(g, [contrib({ amount: 600 })], NOW);
    expect(s.complete).toBe(true);
    expect(s.remaining).toBe(0);
  });
});
