import { describe, it, expect } from "vitest";
import {
  toISO,
  isoDaysAgo,
  computeStreak,
  weekCount,
  buildHeatmap,
  completionRate,
} from "@/app/app/habits/lib";

const NOW = new Date(2026, 4, 29); // 2026-05-29 (local, month is 0-based)

describe("toISO / isoDaysAgo", () => {
  it("formats local date without timezone shift", () => {
    expect(toISO(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("subtracts days across a month boundary", () => {
    expect(isoDaysAgo(1, new Date(2026, 2, 1))).toBe("2026-02-28");
  });

  it("isoDaysAgo(0) is the same day", () => {
    expect(isoDaysAgo(0, NOW)).toBe("2026-05-29");
  });
});

describe("computeStreak", () => {
  it("counts consecutive days ending today", () => {
    const dates = new Set(["2026-05-29", "2026-05-28", "2026-05-27"]);
    expect(computeStreak(dates, NOW)).toBe(3);
  });

  it("does not reset when today is not yet checked (counts to yesterday)", () => {
    const dates = new Set(["2026-05-28", "2026-05-27"]);
    expect(computeStreak(dates, NOW)).toBe(2);
  });

  it("is zero when neither today nor yesterday is checked", () => {
    const dates = new Set(["2026-05-25"]);
    expect(computeStreak(dates, NOW)).toBe(0);
  });

  it("stops at the first gap", () => {
    const dates = new Set(["2026-05-29", "2026-05-28", "2026-05-26"]);
    expect(computeStreak(dates, NOW)).toBe(2);
  });
});

describe("weekCount", () => {
  it("counts checked days in the trailing 7-day window", () => {
    const dates = new Set([
      "2026-05-29",
      "2026-05-27",
      "2026-05-23", // exactly 6 days ago — included
      "2026-05-22", // 7 days ago — excluded
    ]);
    expect(weekCount(dates, NOW)).toBe(3);
  });
});

describe("buildHeatmap", () => {
  it("returns `weeks` columns of 7 cells each", () => {
    const grid = buildHeatmap(new Set<string>(), 8, NOW);
    expect(grid).toHaveLength(8);
    for (const col of grid) expect(col).toHaveLength(7);
  });

  it("marks checked days and leaves the rest unchecked", () => {
    const grid = buildHeatmap(new Set(["2026-05-29"]), 8, NOW);
    const all = grid.flat();
    const checked = all.filter((c) => c.checked);
    expect(checked).toHaveLength(1);
    expect(checked[0].date).toBe("2026-05-29");
  });

  it("flags future days in the current week as filler", () => {
    const grid = buildHeatmap(new Set<string>(), 8, NOW);
    const all = grid.flat();
    // 2026-05-29 is a Friday; Sat 05-30 is in-grid but future => filler.
    const future = all.find((c) => c.date === "2026-05-30");
    expect(future?.filler).toBe(true);
    const today = all.find((c) => c.date === "2026-05-29");
    expect(today?.filler).toBe(false);
  });

  it("includes today within the window", () => {
    const grid = buildHeatmap(new Set<string>(), 8, NOW);
    const dates = grid.flat().map((c) => c.date);
    expect(dates).toContain("2026-05-29");
  });
});

describe("completionRate", () => {
  it("computes a percentage over the trailing window", () => {
    const dates = new Set(["2026-05-29", "2026-05-28"]);
    // 2 of last 4 days => 50%
    expect(completionRate(dates, 4, NOW)).toBe(50);
  });

  it("is 100 when every day in the window is checked", () => {
    const dates = new Set(["2026-05-29", "2026-05-28", "2026-05-27"]);
    expect(completionRate(dates, 3, NOW)).toBe(100);
  });
});
