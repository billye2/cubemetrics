import { describe, it, expect } from "vitest";
import {
  xpForLevel,
  levelFromXp,
  unmetRequirements,
  isLocked,
  computeTiers,
  accountLevel,
  practiceStreak,
  weeklyXp,
  rustInfo,
  isoToDay,
  RUST_AFTER_DAYS,
  MAX_LEVEL,
  XP_BASE,
  type DepEdge,
} from "@/app/app/skilltree/lib";

describe("skilltree lib", () => {
  describe("xpForLevel", () => {
    it("level 1 needs 0 xp", () => {
      expect(xpForLevel(1)).toBe(0);
      expect(xpForLevel(0)).toBe(0);
    });
    it("level 2 needs XP_BASE", () => {
      expect(xpForLevel(2)).toBe(XP_BASE);
    });
    it("is strictly increasing and accelerating", () => {
      for (let n = 1; n < MAX_LEVEL; n++) {
        const step = xpForLevel(n + 1) - xpForLevel(n);
        const prevStep = n > 1 ? xpForLevel(n) - xpForLevel(n - 1) : 0;
        expect(step).toBeGreaterThan(0);
        expect(step).toBeGreaterThanOrEqual(prevStep);
      }
    });
  });

  describe("levelFromXp", () => {
    it("starts at level 1 with 0 xp", () => {
      const info = levelFromXp(0);
      expect(info.level).toBe(1);
      expect(info.maxed).toBe(false);
      expect(info.progress).toBe(0);
    });
    it("clamps negatives to 0 xp / level 1", () => {
      const info = levelFromXp(-50);
      expect(info.level).toBe(1);
      expect(info.xp).toBe(0);
    });
    it("ticks to level 2 exactly at the threshold", () => {
      expect(levelFromXp(XP_BASE - 1).level).toBe(1);
      expect(levelFromXp(XP_BASE).level).toBe(2);
    });
    it("reports progress toward the next level", () => {
      const span = xpForLevel(3) - xpForLevel(2);
      const half = xpForLevel(2) + Math.floor(span / 2);
      const info = levelFromXp(half);
      expect(info.level).toBe(2);
      expect(info.progress).toBeGreaterThan(0.4);
      expect(info.progress).toBeLessThan(0.6);
      expect(info.toNext).toBe(xpForLevel(3) - half);
    });
    it("caps at MAX_LEVEL and reports maxed", () => {
      const info = levelFromXp(10_000_000);
      expect(info.level).toBe(MAX_LEVEL);
      expect(info.maxed).toBe(true);
      expect(info.toNext).toBe(0);
      expect(info.progress).toBe(1);
    });
  });

  describe("unmetRequirements / isLocked", () => {
    const deps: DepEdge[] = [
      { requires_skill_id: 1, min_level: 3 },
      { requires_skill_id: 2, min_level: 2 },
    ];
    it("is unlocked when all prerequisites meet their level", () => {
      const levels = { 1: 3, 2: 5 };
      expect(unmetRequirements(deps, levels)).toEqual([]);
      expect(isLocked(deps, levels)).toBe(false);
    });
    it("is locked when any prerequisite is below its min level", () => {
      const levels = { 1: 2, 2: 5 };
      expect(unmetRequirements(deps, levels)).toHaveLength(1);
      expect(isLocked(deps, levels)).toBe(true);
    });
    it("treats a missing prerequisite as level 1", () => {
      expect(isLocked([{ requires_skill_id: 99, min_level: 2 }], {})).toBe(true);
      expect(isLocked([{ requires_skill_id: 99, min_level: 1 }], {})).toBe(false);
    });
    it("a skill with no deps is never locked", () => {
      expect(isLocked([], {})).toBe(false);
    });
  });

  describe("computeTiers", () => {
    it("places root skills at depth 0", () => {
      const tiers = computeTiers([1, 2], {});
      expect(tiers[1]).toBe(0);
      expect(tiers[2]).toBe(0);
    });
    it("places a dependent skill one tier below its prerequisite", () => {
      // 2 requires 1; 3 requires 2
      const deps = {
        2: [{ requires_skill_id: 1, min_level: 1 }],
        3: [{ requires_skill_id: 2, min_level: 1 }],
      };
      const tiers = computeTiers([1, 2, 3], deps);
      expect(tiers[1]).toBe(0);
      expect(tiers[2]).toBe(1);
      expect(tiers[3]).toBe(2);
    });
    it("uses the longest chain when a skill has multiple prerequisites", () => {
      // 4 requires both 1 (root) and 3 (depth 2) -> depth 3
      const deps = {
        2: [{ requires_skill_id: 1, min_level: 1 }],
        3: [{ requires_skill_id: 2, min_level: 1 }],
        4: [
          { requires_skill_id: 1, min_level: 1 },
          { requires_skill_id: 3, min_level: 1 },
        ],
      };
      const tiers = computeTiers([1, 2, 3, 4], deps);
      expect(tiers[4]).toBe(3);
    });
    it("does not loop forever on a cycle", () => {
      const deps = {
        1: [{ requires_skill_id: 2, min_level: 1 }],
        2: [{ requires_skill_id: 1, min_level: 1 }],
      };
      const tiers = computeTiers([1, 2], deps);
      expect(tiers[1]).toBeGreaterThanOrEqual(0);
      expect(tiers[2]).toBeGreaterThanOrEqual(0);
    });
  });

  // --- P3 ---

  describe("accountLevel", () => {
    it("sums each skill's derived level", () => {
      // 0 xp -> Lv1, XP_BASE -> Lv2, huge -> MAX_LEVEL
      expect(accountLevel([0, XP_BASE, 10_000_000])).toBe(1 + 2 + MAX_LEVEL);
    });
    it("is 0 with no skills", () => {
      expect(accountLevel([])).toBe(0);
    });
  });

  describe("practiceStreak", () => {
    const now = new Date("2026-05-28T12:00:00");
    it("counts consecutive days ending today", () => {
      const days = new Set(["2026-05-28", "2026-05-27", "2026-05-26"]);
      expect(practiceStreak(days, now)).toBe(3);
    });
    it("applies a one-day grace when today wasn't practiced yet", () => {
      const days = new Set(["2026-05-27", "2026-05-26"]);
      expect(practiceStreak(days, now)).toBe(2);
    });
    it("is 0 when neither today nor yesterday was practiced", () => {
      const days = new Set(["2026-05-20"]);
      expect(practiceStreak(days, now)).toBe(0);
    });
    it("is 0 with no practice at all", () => {
      expect(practiceStreak(new Set(), now)).toBe(0);
    });
  });

  describe("weeklyXp", () => {
    const now = new Date("2026-05-28T12:00:00"); // a Thursday
    it("returns one bucket per requested week, oldest first", () => {
      const buckets = weeklyXp([], 8, now);
      expect(buckets).toHaveLength(8);
      // The last bucket is the current week (its Monday).
      expect(buckets[7].weekStart).toBe("2026-05-25");
      expect(buckets.every((b) => b.xp === 0)).toBe(true);
    });
    it("sums XP into the right week and ignores out-of-window entries", () => {
      const buckets = weeklyXp(
        [
          { xp: 30, created_at: "2026-05-28T09:00:00" }, // this week
          { xp: 20, created_at: "2026-05-26T09:00:00" }, // this week (Tue)
          { xp: 50, created_at: "2026-05-19T09:00:00" }, // last week
          { xp: 99, created_at: "2026-01-01T09:00:00" }, // long ago, dropped
        ],
        8,
        now,
      );
      expect(buckets[7].xp).toBe(50); // current week total
      expect(buckets[6].xp).toBe(50); // prior week
      expect(buckets.reduce((s, b) => s + b.xp, 0)).toBe(100);
    });
  });

  describe("rustInfo", () => {
    const now = new Date("2026-05-28T12:00:00");
    it("never rusts a skill practiced recently", () => {
      const r = rustInfo("2026-05-26T12:00:00", now);
      expect(r.idleDays).toBe(2);
      expect(r.rusting).toBe(false);
    });
    it("rusts once idle past the grace window", () => {
      const r = rustInfo("2026-05-10T12:00:00", now); // 18 days
      expect(r.idleDays).toBe(18);
      expect(r.rusting).toBe(true);
    });
    it("rusts exactly at the threshold", () => {
      const last = new Date(now.getTime() - RUST_AFTER_DAYS * 86_400_000).toISOString();
      expect(rustInfo(last, now).rusting).toBe(true);
    });
    it("treats a never-practiced skill as not rusting", () => {
      expect(rustInfo(null, now)).toEqual({ idleDays: null, rusting: false });
    });
  });

  describe("isoToDay", () => {
    it("projects an ISO timestamp to its local calendar day", () => {
      expect(isoToDay("2026-05-28T23:30:00")).toBe(
        new Date("2026-05-28T23:30:00").getFullYear() +
          "-" +
          String(new Date("2026-05-28T23:30:00").getMonth() + 1).padStart(2, "0") +
          "-" +
          String(new Date("2026-05-28T23:30:00").getDate()).padStart(2, "0"),
      );
    });
  });
});
