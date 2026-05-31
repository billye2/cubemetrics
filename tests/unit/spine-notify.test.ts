import { describe, it, expect } from "vitest";
import { within, isDue } from "@/lib/notify/select";
import { shouldSend, streakAtRisk, STREAK_MIN } from "@/lib/notify/policy";
import { sign, verify } from "@/lib/notify/tokens";
import type { NotifyPrefs, Kind } from "@/lib/notify/types";
import type { SpineToday, TodayStatus } from "@/lib/spine/types";
import type { XpSummary } from "@/lib/xp/compute";

function prefs(overrides: Partial<NotifyPrefs> = {}): NotifyPrefs {
  return {
    user_id: "u1",
    email_enabled: true,
    morning_enabled: true,
    evening_enabled: true,
    morning_time: "08:00",
    evening_time: "20:00",
    streak_save_enabled: true,
    ai_insights_enabled: false,
    ...overrides,
  };
}

function card(severity: TodayStatus): SpineToday {
  return {
    appId: "todo",
    severity,
    count: 1,
    summary: "1 open",
    items: [{ id: "todo:1", label: "Do thing", status: severity }],
  };
}

const xpFake = (streak: number, todayPoints: number): XpSummary =>
  ({ streak, todayPoints } as unknown as XpSummary);

describe("within", () => {
  it("is true inside the window", () => {
    expect(within(8 * 60 + 15, "08:00", 30)).toBe(true);
  });

  it("is false before the window", () => {
    expect(within(7 * 60 + 59, "08:00", 30)).toBe(false);
  });

  it("is false after the window", () => {
    expect(within(8 * 60 + 31, "08:00", 30)).toBe(false);
  });

  it("includes the start boundary (t)", () => {
    expect(within(8 * 60, "08:00", 30)).toBe(true);
  });

  it("excludes the end boundary (t + window)", () => {
    expect(within(8 * 60 + 30, "08:00", 30)).toBe(false);
  });

  it("parses HH:MM:SS the same as HH:MM", () => {
    expect(within(20 * 60 + 10, "20:00:00", 30)).toBe(true);
  });
});

describe("isDue", () => {
  const none = new Set<Kind>();

  it("fires morning inside its window", () => {
    expect(isDue(prefs(), 8, 10, none)).toEqual(["morning"]);
  });

  it("fires evening inside its window", () => {
    expect(isDue(prefs(), 20, 5, none)).toEqual(["evening"]);
  });

  it("respects morning_enabled = false", () => {
    expect(isDue(prefs({ morning_enabled: false }), 8, 10, none)).toEqual([]);
  });

  it("respects evening_enabled = false", () => {
    expect(isDue(prefs({ evening_enabled: false }), 20, 5, none)).toEqual([]);
  });

  it("suppresses a kind already sent today", () => {
    expect(isDue(prefs(), 8, 10, new Set<Kind>(["morning"]))).toEqual([]);
  });

  it("returns [] when neither window matches", () => {
    expect(isDue(prefs(), 12, 0, none)).toEqual([]);
  });
});

describe("streakAtRisk", () => {
  it("is true when streak >= STREAK_MIN and todayPoints is 0", () => {
    expect(STREAK_MIN).toBe(3);
    expect(streakAtRisk(xpFake(3, 0))).toBe(true);
  });

  it("is false when todayPoints > 0", () => {
    expect(streakAtRisk(xpFake(5, 4))).toBe(false);
  });

  it("is false when streak < STREAK_MIN", () => {
    expect(streakAtRisk(xpFake(2, 0))).toBe(false);
  });

  it("is false for null xp", () => {
    expect(streakAtRisk(null)).toBe(false);
  });
});

describe("shouldSend", () => {
  it("morning with no actionable cards → false", () => {
    expect(shouldSend("morning", [card("upcoming")], xpFake(0, 0))).toBe(false);
  });

  it("morning with an overdue card → true", () => {
    expect(shouldSend("morning", [card("overdue")], xpFake(0, 0))).toBe(true);
  });

  it("evening with streakAtRisk and nothing actionable → true", () => {
    expect(shouldSend("evening", [card("done")], xpFake(3, 0))).toBe(true);
  });

  it("streak_save with streak below STREAK_MIN → false", () => {
    expect(shouldSend("streak_save", [], xpFake(2, 0))).toBe(false);
  });
});

describe("sign / verify", () => {
  it("round-trips to the same payload", () => {
    const token = sign({ userId: "user-123", kind: "morning" });
    expect(verify(token)).toEqual({ userId: "user-123", kind: "morning" });
  });

  it("returns null for a tampered token", () => {
    const token = sign({ userId: "user-123", kind: "morning" });
    const flipped = token[0] === "a" ? "b" + token.slice(1) : "a" + token.slice(1);
    expect(verify(flipped)).toBeNull();
  });

  it("returns null for garbage", () => {
    expect(verify("not-a-token")).toBeNull();
    expect(verify("")).toBeNull();
  });
});
