import { describe, it, expect } from "vitest";
import {
  nextOccurrence,
  breakdown,
  pickGranularity,
  formatBreakdown,
  type Countdown,
} from "@/app/app/countdown/lib";

function mkRow(over: Partial<Countdown>): Countdown {
  return {
    id: 1,
    title: "Test",
    target_date: "2026-06-15",
    target_time: null,
    category: null,
    recurring_yearly: false,
    note: null,
    ...over,
  };
}

describe("nextOccurrence", () => {
  it("returns the literal target for non-recurring events", () => {
    const row = mkRow({ target_date: "2027-03-20", target_time: "14:30" });
    const r = nextOccurrence(row, new Date(2026, 4, 28));
    expect(r.getFullYear()).toBe(2027);
    expect(r.getMonth()).toBe(2);
    expect(r.getDate()).toBe(20);
    expect(r.getHours()).toBe(14);
    expect(r.getMinutes()).toBe(30);
  });

  it("returns this year for a yearly event whose date is still ahead", () => {
    const row = mkRow({ target_date: "2020-12-25", recurring_yearly: true });
    const r = nextOccurrence(row, new Date(2026, 4, 28));
    expect(r.getFullYear()).toBe(2026);
    expect(r.getMonth()).toBe(11);
    expect(r.getDate()).toBe(25);
  });

  it("returns next year for a yearly event whose date already passed", () => {
    const row = mkRow({ target_date: "2020-03-10", recurring_yearly: true });
    const r = nextOccurrence(row, new Date(2026, 4, 28));
    expect(r.getFullYear()).toBe(2027);
    expect(r.getMonth()).toBe(2);
    expect(r.getDate()).toBe(10);
  });

  it("preserves the original time of day on recurrence", () => {
    const row = mkRow({ target_date: "2020-06-15", target_time: "07:45", recurring_yearly: true });
    const r = nextOccurrence(row, new Date(2026, 4, 28));
    expect(r.getHours()).toBe(7);
    expect(r.getMinutes()).toBe(45);
  });
});

describe("breakdown", () => {
  it("walks calendar months correctly across a 3-month gap", () => {
    const now = new Date(2026, 0, 15);
    const target = new Date(2026, 3, 15);
    const b = breakdown(now, target);
    expect(b.past).toBe(false);
    expect(b.years).toBe(0);
    expect(b.months).toBe(3);
    expect(b.weeks).toBe(0);
    expect(b.days).toBe(0);
  });

  it("breaks the residual into weeks + days", () => {
    const now = new Date(2026, 0, 1, 0, 0, 0);
    const target = new Date(2026, 0, 11, 0, 0, 0);
    const b = breakdown(now, target);
    expect(b.weeks).toBe(1);
    expect(b.days).toBe(3);
  });

  it("flags past = true when target is before now", () => {
    const now = new Date(2026, 5, 1);
    const target = new Date(2026, 4, 28);
    const b = breakdown(now, target);
    expect(b.past).toBe(true);
    expect(b.days).toBe(4);
  });

  it("counts hours/minutes/seconds for sub-day gaps", () => {
    const now = new Date(2026, 0, 1, 9, 0, 0);
    const target = new Date(2026, 0, 1, 11, 30, 45);
    const b = breakdown(now, target);
    expect(b.hours).toBe(2);
    expect(b.minutes).toBe(30);
    expect(b.seconds).toBe(45);
  });
});

describe("pickGranularity", () => {
  it("classifies by distance", () => {
    expect(pickGranularity(30 * 1000)).toBe("imminent");
    expect(pickGranularity(2 * 60 * 60 * 1000)).toBe("today");
    expect(pickGranularity(3 * 24 * 60 * 60 * 1000)).toBe("thisWeek");
    expect(pickGranularity(20 * 24 * 60 * 60 * 1000)).toBe("thisMonth");
    expect(pickGranularity(120 * 24 * 60 * 60 * 1000)).toBe("far");
  });
});

describe("formatBreakdown", () => {
  it("only shows months + weeks for far-off targets", () => {
    const b = breakdown(new Date(2026, 0, 1), new Date(2026, 4, 20));
    expect(formatBreakdown(b, "far")).toMatch(/months/);
    expect(formatBreakdown(b, "far")).not.toMatch(/hour|minute/);
  });

  it("shows hours + minutes for same-day events", () => {
    const b = breakdown(new Date(2026, 0, 1, 9, 0, 0), new Date(2026, 0, 1, 14, 25, 0));
    expect(formatBreakdown(b, "today")).toBe("5h, 25m");
  });

  it("shows seconds when imminent", () => {
    const b = breakdown(new Date(2026, 0, 1, 11, 59, 30), new Date(2026, 0, 1, 12, 0, 0));
    expect(formatBreakdown(b, "imminent")).toBe("30s");
  });
});
