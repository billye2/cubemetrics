import { describe, it, expect } from "vitest";
import { pickMode, chooseApps, groupBySeverity, sortCards } from "@/lib/spine/today-view";
import type { SpineToday, TodayStatus } from "@/lib/spine/types";

const card = (appId: string, severity: TodayStatus, count = 0): SpineToday => ({
  appId,
  severity,
  count,
  summary: "",
  items: [],
});

describe("pickMode", () => {
  it("morning < 12, day 12–16, evening >= 17", () => {
    expect(pickMode(6)).toBe("morning");
    expect(pickMode(11)).toBe("morning");
    expect(pickMode(12)).toBe("day");
    expect(pickMode(16)).toBe("day");
    expect(pickMode(17)).toBe("evening");
    expect(pickMode(23)).toBe("evening");
  });
});

describe("chooseApps", () => {
  const registered = ["todo", "habits", "water", "journal", "budget", "bills"];

  it("keeps usage order, filters to registered, dedupes, caps", () => {
    const usage = [
      { app_id: "water", pinned: true },
      { app_id: "todo", pinned: false },
      { app_id: "ghost", pinned: false }, // no adapter → dropped
      { app_id: "todo", pinned: false }, // dup → dropped
    ];
    expect(chooseApps(usage, registered, 8)).toEqual(["water", "todo"]);
    expect(chooseApps(usage, registered, 1)).toEqual(["water"]);
  });

  it("empty usage → all registered (capped)", () => {
    expect(chooseApps([], registered, 8)).toEqual(registered);
    expect(chooseApps([], registered, 3)).toEqual(["todo", "habits", "water"]);
  });
});

describe("sortCards", () => {
  it("worst severity first, then count desc", () => {
    const cards = [card("a", "done", 9), card("b", "overdue", 1), card("c", "due", 5), card("d", "due", 9)];
    expect(sortCards(cards).map((c) => c.appId)).toEqual(["b", "d", "c", "a"]);
  });
});

describe("groupBySeverity", () => {
  it("buckets overdue+due → attention, upcoming, done", () => {
    const g = groupBySeverity([
      card("a", "overdue"),
      card("b", "due"),
      card("c", "upcoming"),
      card("d", "done"),
    ]);
    expect(g.attention.map((c) => c.appId)).toEqual(["a", "b"]);
    expect(g.upcoming.map((c) => c.appId)).toEqual(["c"]);
    expect(g.done.map((c) => c.appId)).toEqual(["d"]);
  });

  it("empty input → empty groups", () => {
    const g = groupBySeverity([]);
    expect(g.attention).toHaveLength(0);
    expect(g.upcoming).toHaveLength(0);
    expect(g.done).toHaveLength(0);
  });
});
