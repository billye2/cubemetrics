import { describe, it, expect } from "vitest";
import { buildNudgeInput, hashInput, fallbackLine, getNudge } from "@/lib/ai/nudge-input";
import type { SpineToday, TodayStatus } from "@/lib/spine/types";
import type { XpSummary } from "@/lib/xp/compute";

const card = (severity: TodayStatus, count = 1): SpineToday => ({
  appId: "todo",
  severity,
  count,
  summary: "",
  items: [],
});

const xp = (streak: number, todayPoints: number): XpSummary =>
  ({ streak, todayPoints, questsCompletedToday: 0, todayQuests: [] }) as unknown as XpSummary;

describe("buildNudgeInput", () => {
  it("counts attention vs done, sets streakAtRisk + notable", () => {
    const i = buildNudgeInput([card("overdue"), card("due"), card("done")], xp(5, 0), "morning");
    expect(i.attention).toBe(2);
    expect(i.doneToday).toBe(1);
    expect(i.streakAtRisk).toBe(true);
    expect(i.notable).toBe(true);
  });

  it("notable=false when nothing is going on", () => {
    const i = buildNudgeInput([], xp(0, 0), "day");
    expect(i.notable).toBe(false);
    expect(i.streakAtRisk).toBe(false);
  });

  it("streakAtRisk false once points are earned", () => {
    expect(buildNudgeInput([], xp(5, 10), "day").streakAtRisk).toBe(false);
  });
});

describe("hashInput", () => {
  it("is stable for equal input and changes on material change", () => {
    const a = buildNudgeInput([card("due")], xp(3, 0), "morning");
    const b = buildNudgeInput([card("due")], xp(3, 0), "morning");
    expect(hashInput(a)).toBe(hashInput(b));
    const c = buildNudgeInput([card("due"), card("overdue")], xp(3, 0), "morning");
    expect(hashInput(c)).not.toBe(hashInput(a));
  });
});

describe("fallbackLine", () => {
  it("streak-at-risk wins", () => {
    expect(fallbackLine(buildNudgeInput([], xp(7, 0), "evening"))).toContain("7-day streak");
  });
  it("attention next", () => {
    expect(fallbackLine(buildNudgeInput([card("overdue"), card("due")], xp(0, 5), "morning"))).toBe(
      "2 things need attention today.",
    );
  });
  it("evening done", () => {
    expect(fallbackLine(buildNudgeInput([card("done")], xp(0, 5), "evening"))).toBe("Nice — 1 done today.");
  });
  it("streak fallback", () => {
    expect(fallbackLine(buildNudgeInput([], xp(4, 5), "day"))).toBe("Day 4 of your streak.");
  });
  it("empty when nothing notable", () => {
    expect(fallbackLine(buildNudgeInput([], xp(0, 0), "day"))).toBe("");
  });
});

describe("getNudge", () => {
  it("returns '' when not notable, else a line", () => {
    expect(getNudge([], xp(0, 0), "day")).toBe("");
    expect(getNudge([card("overdue")], xp(0, 0), "morning")).toBe("1 thing needs attention today.");
  });
});
