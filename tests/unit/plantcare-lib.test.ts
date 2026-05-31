import { describe, it, expect } from "vitest";
import {
  computeNextDue,
  formatDue,
  formatFertilizeDue,
  statusFor,
  toPlant,
  toFertilizeTrack,
  sortPlants,
  statsFor,
  needsWaterToday,
  waterIntervals,
  averageInterval,
  type PlantRow,
} from "@/app/app/plantcare/lib";

function row(over: Partial<PlantRow>): PlantRow {
  return {
    id: 1,
    name: "Monstera",
    frequency_days: 7,
    last_watered: "2026-05-01",
    light: null,
    note: null,
    photo_url: null,
    fertilize_days: null,
    last_fertilized: null,
    created_at: "2026-05-01T00:00:00Z",
    ...over,
  };
}

describe("computeNextDue", () => {
  it("adds frequency_days to last_watered", () => {
    const d = computeNextDue("2026-05-01", 7);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(4); // May
    expect(d.getDate()).toBe(8);
  });

  it("rolls into the next month", () => {
    const d = computeNextDue("2026-05-28", 7);
    expect(d.getMonth()).toBe(5); // June
    expect(d.getDate()).toBe(4);
  });
});

describe("statusFor", () => {
  it("overdue when days until is negative", () => {
    expect(statusFor(-1)).toBe("overdue");
  });
  it("today at zero", () => {
    expect(statusFor(0)).toBe("today");
  });
  it("upcoming when positive", () => {
    expect(statusFor(1)).toBe("upcoming");
  });
});

describe("formatDue", () => {
  it("never watered overrides everything", () => {
    expect(formatDue(-1, true)).toBe("never watered");
  });
  it("upcoming phrasing", () => {
    expect(formatDue(0, false)).toBe("due today");
    expect(formatDue(1, false)).toBe("tomorrow");
    expect(formatDue(3, false)).toBe("in 3 days");
    expect(formatDue(21, false)).toBe("in 3 weeks");
  });
  it("overdue phrasing", () => {
    expect(formatDue(-1, false)).toBe("1 day overdue");
    expect(formatDue(-5, false)).toBe("5 days overdue");
  });
});

describe("toPlant", () => {
  it("computes next-due and upcoming status for a freshly watered plant", () => {
    const p = toPlant(row({ last_watered: "2026-05-28", frequency_days: 7 }), new Date(2026, 4, 29));
    expect(p.nextDue).toBe("2026-06-04");
    expect(p.status).toBe("upcoming");
    expect(p.daysUntil).toBe(6);
  });

  it("flags a plant due exactly today", () => {
    const p = toPlant(row({ last_watered: "2026-05-22", frequency_days: 7 }), new Date(2026, 4, 29));
    expect(p.nextDue).toBe("2026-05-29");
    expect(p.status).toBe("today");
    expect(p.daysUntil).toBe(0);
  });

  it("flags an overdue plant", () => {
    const p = toPlant(row({ last_watered: "2026-05-01", frequency_days: 7 }), new Date(2026, 4, 29));
    expect(p.status).toBe("overdue");
    expect(p.daysUntil).toBeLessThan(0);
    expect(p.label).toContain("overdue");
  });

  it("treats a never-watered plant as overdue with no next-due", () => {
    const p = toPlant(row({ last_watered: null }), new Date(2026, 4, 29));
    expect(p.status).toBe("overdue");
    expect(p.nextDue).toBeNull();
    expect(p.label).toBe("never watered");
  });

  it("normalizes an invalid light value to null", () => {
    const p = toPlant(row({ light: "neon" }), new Date(2026, 4, 29));
    expect(p.light).toBeNull();
  });

  it("keeps a valid light value", () => {
    const p = toPlant(row({ light: "bright" }), new Date(2026, 4, 29));
    expect(p.light).toBe("bright");
  });
});

describe("sortPlants", () => {
  it("orders overdue before today before upcoming, then by soonest", () => {
    const today = new Date(2026, 4, 29);
    const list = [
      toPlant(row({ id: 1, last_watered: "2026-05-28", frequency_days: 7 }), today), // upcoming
      toPlant(row({ id: 2, last_watered: "2026-05-01", frequency_days: 7 }), today), // overdue
      toPlant(row({ id: 3, last_watered: "2026-05-22", frequency_days: 7 }), today), // today
    ];
    const sorted = sortPlants(list);
    expect(sorted.map((p) => p.id)).toEqual([2, 3, 1]);
  });
});

describe("statsFor / needsWaterToday", () => {
  it("counts due-today (incl. overdue) and overdue buckets", () => {
    const today = new Date(2026, 4, 29);
    const list = [
      toPlant(row({ id: 1, last_watered: "2026-05-28", frequency_days: 7 }), today), // upcoming
      toPlant(row({ id: 2, last_watered: "2026-05-01", frequency_days: 7 }), today), // overdue
      toPlant(row({ id: 3, last_watered: "2026-05-22", frequency_days: 7 }), today), // today
    ];
    expect(statsFor(list)).toEqual({ total: 3, dueToday: 2, overdue: 1 });
    expect(needsWaterToday(list).map((p) => p.id).sort()).toEqual([2, 3]);
  });
});

// --- P3 ---------------------------------------------------------------------

describe("toFertilizeTrack", () => {
  const today = new Date(2026, 4, 29);

  it("is disabled when fertilize_days is null", () => {
    const t = toFertilizeTrack(row({ fertilize_days: null }), today);
    expect(t.enabled).toBe(false);
    expect(t.status).toBeNull();
    expect(t.nextDue).toBeNull();
    expect(t.label).toBeNull();
  });

  it("is disabled when fertilize_days is zero or negative", () => {
    expect(toFertilizeTrack(row({ fertilize_days: 0 }), today).enabled).toBe(false);
    expect(toFertilizeTrack(row({ fertilize_days: -5 }), today).enabled).toBe(false);
  });

  it("treats an enabled-but-never-fed plant as due now", () => {
    const t = toFertilizeTrack(row({ fertilize_days: 30, last_fertilized: null }), today);
    expect(t.enabled).toBe(true);
    expect(t.status).toBe("overdue");
    expect(t.nextDue).toBeNull();
    expect(t.label).toBe("feed now");
  });

  it("computes next fertilize-due from last_fertilized + fertilize_days", () => {
    const t = toFertilizeTrack(
      row({ fertilize_days: 30, last_fertilized: "2026-05-01" }),
      today,
    );
    expect(t.nextDue).toBe("2026-05-31");
    expect(t.status).toBe("upcoming");
    expect(t.daysUntil).toBe(2);
  });

  it("flags an overdue fertilizing", () => {
    const t = toFertilizeTrack(
      row({ fertilize_days: 14, last_fertilized: "2026-05-01" }),
      today,
    );
    expect(t.status).toBe("overdue");
    expect(t.label).toContain("late");
  });

  it("is wired into toPlant", () => {
    const p = toPlant(row({ fertilize_days: 30, last_fertilized: "2026-05-01" }), today);
    expect(p.fertilize.enabled).toBe(true);
    expect(p.fertilize.nextDue).toBe("2026-05-31");
  });
});

describe("formatFertilizeDue", () => {
  it("phrases never-fed, today, tomorrow, weeks, late", () => {
    expect(formatFertilizeDue(-1, true)).toBe("feed now");
    expect(formatFertilizeDue(0, false)).toBe("feed today");
    expect(formatFertilizeDue(1, false)).toBe("feed tomorrow");
    expect(formatFertilizeDue(5, false)).toBe("feed in 5 days");
    expect(formatFertilizeDue(21, false)).toBe("feed in 3 weeks");
    expect(formatFertilizeDue(-1, false)).toBe("feed (1 day late)");
    expect(formatFertilizeDue(-3, false)).toBe("feed (3 days late)");
  });
});

describe("waterIntervals", () => {
  it("returns no bars with fewer than two waterings", () => {
    expect(waterIntervals([], 7)).toEqual([]);
    expect(waterIntervals(["2026-05-01"], 7)).toEqual([]);
  });

  it("computes gaps between consecutive (sorted) waterings", () => {
    const bars = waterIntervals(["2026-05-15", "2026-05-01", "2026-05-08"], 7);
    expect(bars.map((b) => b.gap)).toEqual([7, 7]);
    expect(bars.every((b) => b.height === 1)).toBe(true);
  });

  it("flags a gap longer than the target frequency as late", () => {
    const bars = waterIntervals(["2026-05-01", "2026-05-08", "2026-05-22"], 7);
    expect(bars.map((b) => b.gap)).toEqual([7, 14]);
    expect(bars.map((b) => b.late)).toEqual([false, true]);
  });

  it("scales bar height against the longest gap and keeps a floor", () => {
    const bars = waterIntervals(["2026-05-01", "2026-05-02", "2026-05-22"], 7);
    // gaps: 1, 20 → heights 0.05→floored to 0.12, and 1.0
    expect(bars[0].height).toBeCloseTo(0.12, 5);
    expect(bars[1].height).toBe(1);
  });

  it("ignores invalid and duplicate dates and caps the window", () => {
    const dates = ["2026-05-01", "2026-05-01", "garbage", "2026-05-08"];
    const bars = waterIntervals(dates, 7);
    expect(bars.map((b) => b.gap)).toEqual([7]);
  });
});

describe("averageInterval", () => {
  it("returns null for fewer than two waterings", () => {
    expect(averageInterval([])).toBeNull();
    expect(averageInterval(["2026-05-01"])).toBeNull();
  });

  it("averages the interval across the span", () => {
    expect(averageInterval(["2026-05-01", "2026-05-08", "2026-05-15"])).toBe(7);
    expect(averageInterval(["2026-05-01", "2026-05-21"])).toBe(20);
  });
});
