import { describe, it, expect } from "vitest";
import {
  toISODate,
  parseISODate,
  weekStart,
  weekEnd,
  addWeeks,
  isoWeek,
  formatRange,
  relativeWeekLabel,
  formatMinutes,
  weekRange,
} from "@/app/app/weeklyreview/lib";

describe("toISODate / parseISODate", () => {
  it("round-trips a local date without UTC shift", () => {
    const d = new Date(2026, 4, 29); // May 29 2026
    expect(toISODate(d)).toBe("2026-05-29");
    const back = parseISODate("2026-05-29");
    expect(back.getFullYear()).toBe(2026);
    expect(back.getMonth()).toBe(4);
    expect(back.getDate()).toBe(29);
  });

  it("zero-pads month and day", () => {
    expect(toISODate(new Date(2026, 0, 3))).toBe("2026-01-03");
  });
});

describe("weekStart / weekEnd", () => {
  it("snaps a mid-week day back to its Monday", () => {
    // 2026-05-29 is a Friday.
    expect(toISODate(weekStart(new Date(2026, 4, 29)))).toBe("2026-05-25");
    expect(toISODate(weekEnd(new Date(2026, 4, 29)))).toBe("2026-05-31");
  });

  it("treats a Monday as its own week start", () => {
    expect(toISODate(weekStart(new Date(2026, 4, 25)))).toBe("2026-05-25");
  });

  it("treats a Sunday as the end of the week that began Monday", () => {
    // 2026-05-31 is a Sunday.
    expect(toISODate(weekStart(new Date(2026, 4, 31)))).toBe("2026-05-25");
  });
});

describe("addWeeks", () => {
  it("moves forward and backward by whole weeks", () => {
    const monday = parseISODate("2026-05-25");
    expect(toISODate(addWeeks(monday, 1))).toBe("2026-06-01");
    expect(toISODate(addWeeks(monday, -1))).toBe("2026-05-18");
    expect(toISODate(addWeeks(monday, -4))).toBe("2026-04-27");
  });
});

describe("isoWeek", () => {
  it("computes a mid-year ISO week", () => {
    expect(isoWeek(new Date(2026, 4, 29))).toEqual({ year: 2026, week: 22 });
  });

  it("handles the Jan-1 boundary belonging to the prior ISO year", () => {
    // 2027-01-01 is a Friday → ISO week 53 of 2026.
    expect(isoWeek(new Date(2027, 0, 1))).toEqual({ year: 2026, week: 53 });
  });
});

describe("formatRange", () => {
  it("collapses the month when start and end share it", () => {
    expect(formatRange("2026-05-25")).toBe("May 25 – 31");
  });

  it("shows both months when the week spans a boundary", () => {
    expect(formatRange("2026-06-29")).toBe("Jun 29 – Jul 5");
  });
});

describe("relativeWeekLabel", () => {
  const today = new Date(2026, 4, 29); // Fri in week of May 25
  it("labels the current week", () => {
    expect(relativeWeekLabel("2026-05-25", today)).toBe("This week");
  });
  it("labels last week", () => {
    expect(relativeWeekLabel("2026-05-18", today)).toBe("Last week");
  });
  it("labels several weeks back", () => {
    expect(relativeWeekLabel("2026-05-04", today)).toBe("3 weeks ago");
  });
});

describe("formatMinutes", () => {
  it("formats hours and minutes", () => {
    expect(formatMinutes(0)).toBe("0m");
    expect(formatMinutes(45)).toBe("45m");
    expect(formatMinutes(60)).toBe("1h");
    expect(formatMinutes(125)).toBe("2h 5m");
  });
  it("clamps negatives to 0m", () => {
    expect(formatMinutes(-10)).toBe("0m");
  });
});

describe("weekRange", () => {
  it("returns [Monday, next Monday) as inclusive/exclusive bounds", () => {
    expect(weekRange("2026-05-25")).toEqual({ from: "2026-05-25", to: "2026-06-01" });
  });
});
