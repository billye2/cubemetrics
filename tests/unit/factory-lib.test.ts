import { describe, it, expect } from "vitest";
import { timeProgress, goalPace, PACE_LABEL, dueBucket } from "@/app/app/_factories/factoryLib";

describe("timeProgress", () => {
  it("reports the elapsed fraction across the created→due window", () => {
    const tp = timeProgress("2026-01-01T00:00:00", "2026-01-11", new Date(2026, 0, 6));
    expect(tp.daysTotal).toBe(10);
    expect(tp.daysLeft).toBe(5);
    expect(tp.daysElapsed).toBe(5);
    expect(tp.elapsedPct).toBeCloseTo(0.5, 2);
    expect(tp.overdue).toBe(false);
  });

  it("pins to 100% and flags overdue once the deadline passes", () => {
    const tp = timeProgress("2026-01-01T00:00:00", "2026-01-05", new Date(2026, 0, 10));
    expect(tp.overdue).toBe(true);
    expect(tp.elapsedPct).toBe(1);
    expect(tp.daysLeft).toBeLessThan(0);
  });
});

describe("goalPace", () => {
  it("is ahead when value outruns the clock", () => {
    expect(goalPace(60, 0.5)).toBe("ahead");
  });
  it("is on track near parity", () => {
    expect(goalPace(50, 0.5)).toBe("on");
  });
  it("is behind once value lags the clock meaningfully", () => {
    expect(goalPace(30, 0.5)).toBe("behind");
  });
  it("has a label for each pace", () => {
    expect(PACE_LABEL.ahead).toBeTruthy();
    expect(PACE_LABEL.on).toBeTruthy();
    expect(PACE_LABEL.behind).toBeTruthy();
  });
});

describe("dueBucket", () => {
  const now = new Date(2026, 5, 15, 12, 0, 0); // Jun 15 2026
  it("buckets a dated item by how soon it's due", () => {
    expect(dueBucket("2026-06-10", now)).toBe("Overdue");
    expect(dueBucket("2026-06-15", now)).toBe("Today");
    expect(dueBucket("2026-06-20", now)).toBe("This week");
    expect(dueBucket("2026-07-30", now)).toBe("Later");
  });
  it("puts undated items in Someday", () => {
    expect(dueBucket(null, now)).toBe("Someday");
  });
});
