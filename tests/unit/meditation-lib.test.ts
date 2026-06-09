import { describe, it, expect } from "vitest";
import {
  parseEntry,
  dayAgoOf,
  minutesByDay,
  lastNDays,
  todayMinutes,
  calcStreak,
  minutesByCategory,
  totalMinutes,
  achievements,
  mmss,
  type Entry,
} from "@/app/app/meditation/lib";

function isoDaysAgo(days: number, hour = 9): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

describe("parseEntry", () => {
  it("reads a JSON note (label + session id)", () => {
    const e = parseEntry({ id: 1, value: 10, note: JSON.stringify({ label: "Box breathing", sid: "s2" }), created_at: isoDaysAgo(0) });
    expect(e.minutes).toBe(10);
    expect(e.label).toBe("Box breathing");
    expect(e.sid).toBe("s2");
  });
  it("treats a plain-text note as the label", () => {
    const e = parseEntry({ id: 2, value: 5, note: "felt calm", created_at: isoDaysAgo(0) });
    expect(e.label).toBe("felt calm");
    expect(e.sid).toBeNull();
  });
  it("falls back to a minute label when the note is empty", () => {
    const e = parseEntry({ id: 3, value: 15, note: null, created_at: isoDaysAgo(0) });
    expect(e.label).toBe("15-min sit");
  });
});

const entries: Entry[] = [
  { id: 1, minutes: 10, label: "Morning", sid: "s1", createdAt: isoDaysAgo(0) }, // Focus
  { id: 2, minutes: 5, label: "Box", sid: "s2", createdAt: isoDaysAgo(0) }, // Breath
  { id: 3, minutes: 20, label: "Sleep", sid: "s4", createdAt: isoDaysAgo(1) }, // Sleep
];

describe("aggregations", () => {
  it("buckets minutes by dayAgo", () => {
    expect(dayAgoOf(entries[0].createdAt)).toBe(0);
    const byDay = minutesByDay(entries);
    expect(byDay[0]).toBe(15);
    expect(byDay[1]).toBe(20);
  });
  it("sums today's minutes", () => {
    expect(todayMinutes(entries)).toBe(15);
  });
  it("returns a 7-day window oldest→newest with today last", () => {
    const days = lastNDays(entries, 7);
    expect(days.length).toBe(7);
    expect(days[6].dayAgo).toBe(0);
    expect(days[6].min).toBe(15);
  });
  it("computes a 2-day streak (today + yesterday)", () => {
    expect(calcStreak(entries)).toBe(2);
  });
  it("breaks minutes down by category, descending", () => {
    const cats = minutesByCategory(entries);
    expect(cats[0]).toEqual(["Sleep", 20]);
    expect(cats).toContainEqual(["Focus", 10]);
    expect(cats).toContainEqual(["Breath", 5]);
  });
  it("sums all-time minutes", () => {
    expect(totalMinutes(entries)).toBe(35);
  });
});

describe("achievements", () => {
  it("earns the streak badge at 7 days and locks unmet ones", () => {
    const got = achievements(entries, 7);
    const streak = got.find((b) => b.label === "7-day streak")!;
    const tenHours = got.find((b) => b.label === "10 hours")!;
    expect(streak.got).toBe(true);
    expect(tenHours.got).toBe(false); // only 35 min total
  });
});

describe("mmss", () => {
  it("formats seconds as m:ss", () => {
    expect(mmss(125)).toBe("2:05");
    expect(mmss(0)).toBe("0:00");
  });
});
