import { describe, it, expect } from "vitest";
import {
  aggregateDay,
  bucketByDay,
  todayAggregate,
  averageOver,
  bestDay,
  computeStreak,
  formatValue,
  type TrackerEntry,
} from "@/app/app/_factories/trackerLib";
import type { FactoryConfig } from "@/lib/modern/catalog";

function entry(id: number, value: number, isoLocal: string): TrackerEntry {
  return { id, value, note: null, created_at: new Date(isoLocal).toISOString() };
}

const NOW = new Date(2026, 4, 28, 12, 0, 0);

describe("aggregateDay", () => {
  it("returns null on empty input", () => {
    expect(aggregateDay([], "sum")).toBeNull();
    expect(aggregateDay([], "latest")).toBeNull();
    expect(aggregateDay([], "average")).toBeNull();
  });

  it("sums values", () => {
    const es = [entry(1, 1, "2026-05-28T08:00"), entry(2, 3, "2026-05-28T09:00")];
    expect(aggregateDay(es, "sum")).toBe(4);
  });

  it("averages values", () => {
    const es = [entry(1, 4, "2026-05-28T08:00"), entry(2, 6, "2026-05-28T09:00")];
    expect(aggregateDay(es, "average")).toBe(5);
  });

  it("takes the first entry (assumed latest-first ordering) for `latest`", () => {
    const es = [entry(2, 175, "2026-05-28T18:00"), entry(1, 172, "2026-05-28T08:00")];
    expect(aggregateDay(es, "latest")).toBe(175);
  });
});

describe("bucketByDay", () => {
  it("builds `days` buckets ending today and aligns entries", () => {
    const entries = [
      entry(1, 2, "2026-05-26T08:00"),
      entry(2, 3, "2026-05-26T20:00"),
      entry(3, 1, "2026-05-28T07:00"),
    ];
    const buckets = bucketByDay(entries, 7, "sum", NOW);
    expect(buckets).toHaveLength(7);
    expect(buckets[buckets.length - 1].isToday).toBe(true);
    expect(buckets[buckets.length - 1].value).toBe(1);
    const may26 = buckets.find((b) => b.key === "2026-05-26");
    expect(may26?.value).toBe(5);
    expect(may26?.count).toBe(2);
  });

  it("uses local time for day boundaries", () => {
    const entries = [entry(1, 7, "2026-05-28T23:30")];
    const buckets = bucketByDay(entries, 7, "latest", NOW);
    const today = buckets[buckets.length - 1];
    expect(today.value).toBe(7);
    expect(today.count).toBe(1);
  });

  it("respects average mode within a day", () => {
    const entries = [
      entry(1, 4, "2026-05-28T08:00"),
      entry(2, 6, "2026-05-28T18:00"),
    ];
    const buckets = bucketByDay(entries, 7, "average", NOW);
    expect(buckets[buckets.length - 1].value).toBe(5);
  });
});

describe("todayAggregate", () => {
  it("ignores entries from previous days", () => {
    const entries = [
      entry(1, 100, "2026-05-27T18:00"),
      entry(2, 50, "2026-05-28T09:00"),
      entry(3, 25, "2026-05-28T11:00"),
    ];
    expect(todayAggregate(entries, "sum", NOW)).toBe(75);
  });

  it("returns null when there are no entries today", () => {
    const entries = [entry(1, 100, "2026-05-27T18:00")];
    expect(todayAggregate(entries, "sum", NOW)).toBeNull();
  });
});

describe("averageOver", () => {
  it("averages only days with data", () => {
    const buckets = bucketByDay(
      [entry(1, 10, "2026-05-27T08:00"), entry(2, 30, "2026-05-28T08:00")],
      7,
      "sum",
      NOW,
    );
    expect(averageOver(buckets)).toBe(20);
  });

  it("returns null when no day has data", () => {
    const buckets = bucketByDay([], 7, "sum", NOW);
    expect(averageOver(buckets)).toBeNull();
  });
});

describe("bestDay", () => {
  it("picks the highest-value day with data", () => {
    const buckets = bucketByDay(
      [
        entry(1, 10, "2026-05-26T08:00"),
        entry(2, 5, "2026-05-27T08:00"),
        entry(3, 12, "2026-05-28T08:00"),
      ],
      7,
      "sum",
      NOW,
    );
    expect(bestDay(buckets)?.value).toBe(12);
  });
});

describe("computeStreak", () => {
  it("counts consecutive days back from today", () => {
    const entries = [
      entry(3, 1, "2026-05-28T08:00"),
      entry(2, 1, "2026-05-27T08:00"),
      entry(1, 1, "2026-05-26T08:00"),
    ];
    expect(computeStreak(entries, NOW)).toBe(3);
  });

  it("falls back to yesterday when today is missing", () => {
    const entries = [
      entry(2, 1, "2026-05-27T08:00"),
      entry(1, 1, "2026-05-26T08:00"),
    ];
    expect(computeStreak(entries, NOW)).toBe(2);
  });

  it("returns 0 when neither today nor yesterday has data", () => {
    const entries = [entry(1, 1, "2026-05-20T08:00")];
    expect(computeStreak(entries, NOW)).toBe(0);
  });

  it("returns 0 on empty input", () => {
    expect(computeStreak([], NOW)).toBe(0);
  });
});

describe("formatValue", () => {
  const scale: FactoryConfig = { labels: ["Awful", "Bad", "Meh", "Okay", "Good", "Great"] };
  const numeric: FactoryConfig = { unit: "lbs" };

  it("rounds and looks up labels for scale trackers", () => {
    expect(formatValue(3.4, scale, "average")).toBe("Okay");
    expect(formatValue(4.6, scale, "average")).toBe("Great");
  });

  it("clamps scale index into the label range", () => {
    expect(formatValue(-2, scale, "average")).toBe("Awful");
    expect(formatValue(99, scale, "average")).toBe("Great");
  });

  it("formats integers without decimals", () => {
    expect(formatValue(175, numeric, "latest")).toBe("175");
  });

  it("uses one fraction digit for averages", () => {
    expect(formatValue(7.456, numeric, "average")).toBe("7.5");
  });
});
