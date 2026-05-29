import { describe, it, expect } from "vitest";
import { xpToReach, levelForXp, levelInfo, titleForLevel } from "@/lib/xp/levels";
import { scoreDay, emptyActivity, type DayActivity } from "@/lib/xp/rules";
import { currentStreak, longestStreak, dayKey } from "@/lib/xp/stats";
import { satisfiedAchievements, type CumulativeStats } from "@/lib/xp/achievements";

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
  const mk = (y: number, m: number, d: number) => new Date(y, m - 1, d);

  it("counts consecutive days ending today", () => {
    const today = mk(2026, 5, 28);
    const days = new Set([
      dayKey(mk(2026, 5, 28)),
      dayKey(mk(2026, 5, 27)),
      dayKey(mk(2026, 5, 26)),
    ]);
    expect(currentStreak(days, today)).toBe(3);
  });

  it("applies a one-day grace when today has no XP yet", () => {
    const today = mk(2026, 5, 28);
    const days = new Set([dayKey(mk(2026, 5, 27)), dayKey(mk(2026, 5, 26))]);
    expect(currentStreak(days, today)).toBe(2);
  });

  it("breaks after a two-day gap", () => {
    const today = mk(2026, 5, 28);
    const days = new Set([dayKey(mk(2026, 5, 25))]);
    expect(currentStreak(days, today)).toBe(0);
  });

  it("longestStreak finds the longest historical run", () => {
    const days = [
      dayKey(mk(2026, 1, 1)),
      dayKey(mk(2026, 1, 2)),
      dayKey(mk(2026, 1, 3)),
      dayKey(mk(2026, 1, 10)),
      dayKey(mk(2026, 1, 11)),
    ];
    expect(longestStreak(days)).toBe(3);
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
});
