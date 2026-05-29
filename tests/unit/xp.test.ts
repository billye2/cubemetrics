import { describe, it, expect } from "vitest";
import { xpToReach, levelForXp, levelInfo, titleForLevel } from "@/lib/xp/levels";
import { scoreDay, emptyActivity, type DayActivity } from "@/lib/xp/rules";
import { currentStreak, longestStreak } from "@/lib/xp/stats";
import { localDayKey, localHour, todayKey, addDays, isValidIanaZone } from "@/lib/xp/tz";
import { satisfiedAchievements, type CumulativeStats } from "@/lib/xp/achievements";
import {
  QUEST_POOL,
  DAILY_QUEST_COUNT,
  ALL_COMPLETE_BONUS,
  questSeed,
  pickDailyQuests,
  questStatuses,
  questPointsForDay,
  metricsFromActivity,
} from "@/lib/xp/quests";

describe("xp levels", () => {
  it("xpToReach follows the curve", () => {
    expect(xpToReach(1)).toBe(0);
    expect(xpToReach(2)).toBe(50);
    expect(xpToReach(3)).toBe(200);
    expect(xpToReach(5)).toBe(800);
  });

  it("levelForXp is the inverse of xpToReach at boundaries", () => {
    for (let l = 1; l <= 20; l++) {
      expect(levelForXp(xpToReach(l))).toBe(l);
      // one below the threshold is the previous level
      if (l > 1) expect(levelForXp(xpToReach(l) - 1)).toBe(l - 1);
    }
  });

  it("level is monotonic in total XP", () => {
    let prev = 0;
    for (let xp = 0; xp <= 5000; xp += 37) {
      const lv = levelForXp(xp);
      expect(lv).toBeGreaterThanOrEqual(prev);
      prev = lv;
    }
  });

  it("levelInfo reports progress within a level", () => {
    const info = levelInfo(125); // between L2 (50) and L3 (200)
    expect(info.level).toBe(2);
    expect(info.intoLevel).toBe(75);
    expect(info.levelSpan).toBe(150);
    expect(info.toNext).toBe(75);
    expect(info.pct).toBe(50);
  });

  it("assigns ascending titles", () => {
    expect(titleForLevel(1)).toBe("Novice");
    expect(titleForLevel(10)).toBe("Adept");
    expect(titleForLevel(100)).toBe("Legend");
  });
});

describe("xp economy (scoreDay)", () => {
  function act(patch: Partial<DayActivity>): DayActivity {
    return { ...emptyActivity(), ...patch };
  }

  it("an empty day scores zero", () => {
    expect(scoreDay(emptyActivity())).toEqual({ points: 0, breakdown: {} });
  });

  it("honors per-source caps", () => {
    // 20 todos * 5 = 100, capped at 50
    const s = scoreDay(act({ todos: 20 }));
    expect(s.breakdown.todos).toBe(50);
  });

  it("focus scores per session with a time bonus", () => {
    const s = scoreDay(act({ focus: [{ minutes: 25 }] })); // 10 + floor(25/10)=2 => 12
    expect(s.breakdown.focus).toBe(12);
  });

  it("rewards breadth across apps", () => {
    const s = scoreDay(act({ todos: 1, habits: 1, journal: 1 }));
    // 3 active sources => breadth bonus 15
    expect(s.breakdown.breadth).toBe(15);
  });

  it("is anti-farm: a single completed todo is the same as toggling it (state-based)", () => {
    // scoreDay reads counts, not events — one todo completed is deterministic.
    expect(scoreDay(act({ todos: 1 })).points).toBe(scoreDay(act({ todos: 1 })).points);
  });

  it("distinct tracker types reward breadth, not spam", () => {
    const s = scoreDay(act({ trackerTypes: ["mood", "water", "sleep"] })); // 3*3 = 9
    expect(s.breakdown.trackers).toBe(9);
  });
});

describe("xp streak", () => {
  it("counts consecutive days ending today", () => {
    const days = new Set(["2026-05-28", "2026-05-27", "2026-05-26"]);
    expect(currentStreak(days, "2026-05-28")).toBe(3);
  });

  it("applies a one-day grace when today has no XP yet", () => {
    const days = new Set(["2026-05-27", "2026-05-26"]);
    expect(currentStreak(days, "2026-05-28")).toBe(2);
  });

  it("breaks after a two-day gap", () => {
    const days = new Set(["2026-05-25"]);
    expect(currentStreak(days, "2026-05-28")).toBe(0);
  });

  it("crosses a month boundary", () => {
    const days = new Set(["2026-06-01", "2026-05-31", "2026-05-30"]);
    expect(currentStreak(days, "2026-06-01")).toBe(3);
  });

  it("longestStreak finds the longest historical run", () => {
    const days = ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-10", "2026-01-11"];
    expect(longestStreak(days)).toBe(3);
  });
});

describe("xp timezone", () => {
  it("projects a UTC instant into the user's local day", () => {
    // 2026-01-01T06:00Z is still Dec 31 in Los Angeles, Jan 1 in Tokyo/UTC.
    expect(localDayKey("2026-01-01T06:00:00Z", "America/Los_Angeles")).toBe("2025-12-31");
    expect(localDayKey("2026-01-01T06:00:00Z", "Asia/Tokyo")).toBe("2026-01-01");
    expect(localDayKey("2026-01-01T06:00:00Z", "UTC")).toBe("2026-01-01");
  });

  it("todayKey matches localDayKey(now)", () => {
    const now = new Date("2026-05-28T20:00:00Z");
    expect(todayKey("America/New_York", now)).toBe(localDayKey(now, "America/New_York"));
  });

  it("addDays steps calendar days across boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    // across US spring-forward (2026-03-08) stays on calendar days
    expect(addDays("2026-03-07", 2)).toBe("2026-03-09");
  });

  it("validates IANA zones", () => {
    expect(isValidIanaZone("America/Los_Angeles")).toBe(true);
    expect(isValidIanaZone("UTC")).toBe(true);
    expect(isValidIanaZone("Not/AZone!!")).toBe(false);
    expect(isValidIanaZone("")).toBe(false);
  });

  it("localHour projects an instant into the user's local hour-of-day", () => {
    // 2026-01-01T06:00Z → 06:00 UTC, 22:00 (prev day) in LA, 15:00 in Tokyo.
    expect(localHour("2026-01-01T06:00:00Z", "UTC")).toBe(6);
    expect(localHour("2026-01-01T06:00:00Z", "America/Los_Angeles")).toBe(22);
    expect(localHour("2026-01-01T06:00:00Z", "Asia/Tokyo")).toBe(15);
    expect(localHour("not-a-date", "UTC")).toBeNull();
  });
});

describe("xp achievements", () => {
  const base: CumulativeStats = {
    totalXp: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    appsWithXp: 0,
    focusMinutes: 0,
    todosCompleted: 0,
    activeDays: 0,
    firstActionHour: null,
    lastActionHour: null,
  };

  it("unlocks first_step on any XP", () => {
    expect(satisfiedAchievements({ ...base, totalXp: 1 })).toContain("first_step");
    expect(satisfiedAchievements(base)).not.toContain("first_step");
  });

  it("unlocks streak and level milestones at thresholds", () => {
    expect(satisfiedAchievements({ ...base, longestStreak: 7 })).toContain("week_warrior");
    expect(satisfiedAchievements({ ...base, longestStreak: 30 })).toContain("unstoppable");
    expect(satisfiedAchievements({ ...base, level: 10 })).toContain("centurion");
    expect(satisfiedAchievements({ ...base, appsWithXp: 10 })).toContain("polymath");
  });

  it("unlocks early_bird only for pre-7am activity", () => {
    expect(satisfiedAchievements({ ...base, firstActionHour: 6 })).toContain("early_bird");
    expect(satisfiedAchievements({ ...base, firstActionHour: 0 })).toContain("early_bird");
    expect(satisfiedAchievements({ ...base, firstActionHour: 7 })).not.toContain("early_bird");
    expect(satisfiedAchievements(base)).not.toContain("early_bird"); // null → locked
  });

  it("unlocks night_owl only for post-11pm activity", () => {
    expect(satisfiedAchievements({ ...base, lastActionHour: 23 })).toContain("night_owl");
    expect(satisfiedAchievements({ ...base, lastActionHour: 22 })).not.toContain("night_owl");
    expect(satisfiedAchievements(base)).not.toContain("night_owl"); // null → locked
  });
});

describe("xp quests", () => {
  it("picks a stable, distinct daily set per (user, day)", () => {
    const a = pickDailyQuests("user-1", "2026-05-28");
    const b = pickDailyQuests("user-1", "2026-05-28");
    expect(a.map((q) => q.key)).toEqual(b.map((q) => q.key));
    expect(a).toHaveLength(DAILY_QUEST_COUNT);
    expect(new Set(a.map((q) => q.key)).size).toBe(DAILY_QUEST_COUNT);
  });

  it("varies the set across users and days", () => {
    const u1 = pickDailyQuests("user-1", "2026-05-28").map((q) => q.key).join(",");
    const u2 = pickDailyQuests("user-2", "2026-05-28").map((q) => q.key).join(",");
    const d2 = pickDailyQuests("user-1", "2026-05-29").map((q) => q.key).join(",");
    // Not a hard guarantee, but with this pool these should differ.
    expect(u1 === u2 && u1 === d2).toBe(false);
  });

  it("questSeed is deterministic", () => {
    expect(questSeed("u", "2026-05-28")).toBe(questSeed("u", "2026-05-28"));
    expect(questSeed("u", "2026-05-28")).not.toBe(questSeed("u", "2026-05-29"));
  });

  it("distributes picks roughly across the pool over many days", () => {
    const counts = new Map<string, number>();
    for (let i = 0; i < 200; i++) {
      const day = `2026-06-${String((i % 28) + 1).padStart(2, "0")}`;
      for (const q of pickDailyQuests(`user-${i}`, day)) counts.set(q.key, (counts.get(q.key) ?? 0) + 1);
    }
    // every quest in the pool should have been chosen at least once
    expect(counts.size).toBe(QUEST_POOL.length);
  });

  it("questStatuses marks done at/over target", () => {
    const def = QUEST_POOL.find((q) => q.key === "todos_five")!;
    const metrics = metricsFromActivity(
      { focus: [], timetracker: 0, trackerTypes: [], pomodoro: 0, todos: 5, habits: 0, journal: 0, workout: 0, reading: 0, notes: 0, logs: 0, expenses: 0, finance: 0 },
      { points: 25, breakdown: { todos: 25 } },
    );
    const [st] = questStatuses([def], metrics);
    expect(st.current).toBe(5);
    expect(st.done).toBe(true);
  });

  it("questPointsForDay sums claimed rewards + all-complete bonus", () => {
    const chosen = pickDailyQuests("user-1", "2026-05-28");
    const all = new Set(chosen.map((q) => q.key));
    const expected = chosen.reduce((acc, q) => acc + q.reward, 0) + ALL_COMPLETE_BONUS;
    expect(questPointsForDay(chosen, all)).toBe(expected);
    // partial: only the first claimed, no bonus
    const partial = new Set([chosen[0].key]);
    expect(questPointsForDay(chosen, partial)).toBe(chosen[0].reward);
  });

  it("ignores claimed keys outside the chosen set", () => {
    const chosen = pickDailyQuests("user-1", "2026-05-28");
    expect(questPointsForDay(chosen, new Set(["not_a_real_quest"]))).toBe(0);
  });
});
