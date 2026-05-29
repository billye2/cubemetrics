import { describe, it, expect } from "vitest";
import {
  addDays,
  addMonths,
  normalizeRecurrence,
  expandEvents,
  type Event,
} from "@/app/app/calendar/lib";

function mkEvent(over: Partial<Event>): Event {
  return {
    id: 1,
    title: "Test",
    description: null,
    start_date: "2026-06-01",
    start_time: null,
    end_date: null,
    end_time: null,
    recurrence: null,
    ...over,
  };
}

describe("addDays / addMonths", () => {
  it("adds days across a month boundary", () => {
    expect(addDays("2026-01-30", 3)).toBe("2026-02-02");
  });

  it("subtracts days with a negative count", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("adds months keeping the day-of-month", () => {
    expect(addMonths("2026-06-15", 2)).toBe("2026-08-15");
  });

  it("clamps the day when the target month is shorter", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
  });

  it("rolls the year over", () => {
    expect(addMonths("2026-12-10", 1)).toBe("2027-01-10");
  });
});

describe("normalizeRecurrence", () => {
  it("passes through supported cadences", () => {
    expect(normalizeRecurrence("daily")).toBe("daily");
    expect(normalizeRecurrence("weekly")).toBe("weekly");
    expect(normalizeRecurrence("monthly")).toBe("monthly");
  });

  it("rejects empty / unknown values", () => {
    expect(normalizeRecurrence(null)).toBeNull();
    expect(normalizeRecurrence("")).toBeNull();
    expect(normalizeRecurrence("yearly")).toBeNull();
  });
});

describe("expandEvents — non-recurring", () => {
  it("includes a single-day event inside the window once", () => {
    const occ = expandEvents([mkEvent({ start_date: "2026-06-10" })], "2026-06-01", "2026-06-30");
    expect(occ).toHaveLength(1);
    expect(occ[0].repeats).toBe(false);
    expect(occ[0].occKey).toBe("1:2026-06-10");
  });

  it("excludes an event outside the window", () => {
    const occ = expandEvents([mkEvent({ start_date: "2026-08-10" })], "2026-06-01", "2026-06-30");
    expect(occ).toHaveLength(0);
  });

  it("includes a multi-day event that starts before but overlaps the window", () => {
    const occ = expandEvents(
      [mkEvent({ start_date: "2026-05-28", end_date: "2026-06-03" })],
      "2026-06-01",
      "2026-06-30",
    );
    expect(occ).toHaveLength(1);
    expect(occ[0].end_date).toBe("2026-06-03");
  });
});

describe("expandEvents — recurring", () => {
  it("expands a weekly event across the window", () => {
    const occ = expandEvents(
      [mkEvent({ start_date: "2026-06-01", recurrence: "weekly" })],
      "2026-06-01",
      "2026-06-30",
    );
    expect(occ.map((o) => o.start_date)).toEqual([
      "2026-06-01",
      "2026-06-08",
      "2026-06-15",
      "2026-06-22",
      "2026-06-29",
    ]);
    expect(occ.every((o) => o.repeats)).toBe(true);
  });

  it("fast-forwards a daily series anchored far in the past", () => {
    const occ = expandEvents(
      [mkEvent({ start_date: "2020-01-01", recurrence: "daily" })],
      "2026-06-10",
      "2026-06-12",
    );
    expect(occ.map((o) => o.start_date)).toEqual(["2026-06-10", "2026-06-11", "2026-06-12"]);
  });

  it("steps monthly and clamps short months", () => {
    const occ = expandEvents(
      [mkEvent({ start_date: "2026-01-31", recurrence: "monthly" })],
      "2026-01-01",
      "2026-04-30",
    );
    expect(occ.map((o) => o.start_date)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
    ]);
  });

  it("carries the multi-day span onto each occurrence", () => {
    const occ = expandEvents(
      [mkEvent({ start_date: "2026-06-01", end_date: "2026-06-03", recurrence: "weekly" })],
      "2026-06-01",
      "2026-06-15",
    );
    expect(occ).toHaveLength(3);
    expect(occ[0].end_date).toBe("2026-06-03");
    expect(occ[1].start_date).toBe("2026-06-08");
    expect(occ[1].end_date).toBe("2026-06-10");
  });

  it("keeps the series anchor for the edit form", () => {
    const occ = expandEvents(
      [mkEvent({ start_date: "2026-06-01", recurrence: "weekly" })],
      "2026-06-15",
      "2026-06-30",
    );
    expect(occ[0].start_date).toBe("2026-06-15");
    expect(occ[0].seriesStart).toBe("2026-06-01");
  });
});
