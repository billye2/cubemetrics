import { describe, it, expect } from "vitest";
import {
  computeNextDue,
  formatDue,
  statusFor,
  toPlant,
  sortPlants,
  statsFor,
  needsWaterToday,
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
