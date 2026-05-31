import { describe, it, expect } from "vitest";
import {
  cleanConfidence,
  cleanKrType,
  krPct,
  krRowPct,
  objectiveScore,
  currentCycle,
  nextCycle,
  cycleStats,
} from "@/app/app/okr/lib";

describe("okr lib", () => {
  describe("cleanConfidence", () => {
    it("passes through valid confidences", () => {
      for (const c of ["on_track", "at_risk", "off_track"]) {
        expect(cleanConfidence(c)).toBe(c);
      }
    });
    it("falls back to on_track for unknown values", () => {
      expect(cleanConfidence("garbage")).toBe("on_track");
      expect(cleanConfidence("")).toBe("on_track");
    });
  });

  describe("cleanKrType", () => {
    it("passes through valid types", () => {
      for (const t of ["metric", "milestone", "baseline"]) {
        expect(cleanKrType(t)).toBe(t);
      }
    });
    it("falls back to metric for unknown values", () => {
      expect(cleanKrType("nonsense")).toBe("metric");
      expect(cleanKrType("")).toBe("metric");
    });
  });

  describe("krPct (metric)", () => {
    it("computes a clamped, rounded percentage toward target", () => {
      expect(krPct(0, 100)).toBe(0);
      expect(krPct(50, 100)).toBe(50);
      expect(krPct(100, 100)).toBe(100);
      expect(krPct(1, 3)).toBe(33);
    });
    it("clamps overshoot to 100", () => {
      expect(krPct(150, 100)).toBe(100);
    });
    it("clamps negatives to 0", () => {
      expect(krPct(-5, 100)).toBe(0);
    });
    it("handles a zero target sensibly", () => {
      expect(krPct(0, 0)).toBe(0);
      expect(krPct(5, 0)).toBe(100);
    });
  });

  describe("krPct (milestone)", () => {
    it("is 100 only when reached", () => {
      expect(krPct(0, 1, "milestone")).toBe(0);
      expect(krPct(1, 1, "milestone")).toBe(100);
    });
    it("treats a non-positive target as 1", () => {
      expect(krPct(1, 0, "milestone")).toBe(100);
      expect(krPct(0, 0, "milestone")).toBe(0);
    });
  });

  describe("krPct (baseline)", () => {
    it("measures progress from the start, not zero", () => {
      // halfway from 50 → 100 should be 50%, not 75%.
      expect(krPct(75, 100, "baseline", 50)).toBe(50);
      expect(krPct(50, 100, "baseline", 50)).toBe(0);
      expect(krPct(100, 100, "baseline", 50)).toBe(100);
    });
    it("clamps below the start to 0 and over target to 100", () => {
      expect(krPct(40, 100, "baseline", 50)).toBe(0);
      expect(krPct(120, 100, "baseline", 50)).toBe(100);
    });
    it("handles a descending baseline (start > target)", () => {
      // reduce bugs from 100 → 0; at 25 we've covered 75%.
      expect(krPct(25, 0, "baseline", 100)).toBe(75);
      expect(krPct(100, 0, "baseline", 100)).toBe(0);
      expect(krPct(0, 0, "baseline", 100)).toBe(100);
    });
  });

  describe("krRowPct", () => {
    it("dispatches on the row's type and start", () => {
      expect(
        krRowPct({ kr_type: "baseline", start_value: 50, current_value: 75, target_value: 100 }),
      ).toBe(50);
      expect(
        krRowPct({ kr_type: "milestone", current_value: 1, target_value: 1 }),
      ).toBe(100);
      expect(
        krRowPct({ current_value: 25, target_value: 100 }),
      ).toBe(25);
    });
  });

  describe("objectiveScore", () => {
    it("is 0 with no key results", () => {
      expect(objectiveScore([])).toBe(0);
    });
    it("is the mean of the KR percentages", () => {
      expect(
        objectiveScore([
          { current_value: 100, target_value: 100 },
          { current_value: 0, target_value: 100 },
        ]),
      ).toBe(50);
    });
    it("mixes KR types correctly", () => {
      expect(
        objectiveScore([
          { kr_type: "milestone", current_value: 1, target_value: 1 }, // 100
          { kr_type: "baseline", start_value: 50, current_value: 50, target_value: 100 }, // 0
        ]),
      ).toBe(50);
    });
    it("clamps each KR before averaging", () => {
      expect(
        objectiveScore([
          { current_value: 200, target_value: 100 },
          { current_value: 0, target_value: 100 },
        ]),
      ).toBe(50);
    });
  });

  describe("currentCycle", () => {
    it("labels the quarter and year", () => {
      expect(currentCycle(new Date("2026-01-15T12:00:00"))).toBe("Q1 2026");
      expect(currentCycle(new Date("2026-05-30T12:00:00"))).toBe("Q2 2026");
      expect(currentCycle(new Date("2026-08-01T12:00:00"))).toBe("Q3 2026");
      expect(currentCycle(new Date("2026-12-31T12:00:00"))).toBe("Q4 2026");
    });
  });

  describe("nextCycle", () => {
    it("advances the quarter", () => {
      expect(nextCycle("Q1 2026")).toBe("Q2 2026");
      expect(nextCycle("Q2 2026")).toBe("Q3 2026");
      expect(nextCycle("Q3 2026")).toBe("Q4 2026");
    });
    it("wraps Q4 into Q1 of the next year", () => {
      expect(nextCycle("Q4 2026")).toBe("Q1 2027");
    });
    it("falls back to the current cycle for unparseable labels", () => {
      const now = new Date("2026-05-30T12:00:00");
      expect(nextCycle("whatever", now)).toBe("Q2 2026");
      expect(nextCycle("", now)).toBe("Q2 2026");
    });
  });

  describe("cycleStats", () => {
    it("is empty with no objectives", () => {
      expect(cycleStats([])).toEqual({
        count: 0,
        attainment: 0,
        onTrack: 0,
        atRisk: 0,
        offTrack: 0,
      });
    });
    it("rolls attainment and confidence counts up", () => {
      const stats = cycleStats([
        {
          confidence: "on_track",
          key_results: [{ current_value: 100, target_value: 100 }],
        },
        {
          confidence: "at_risk",
          key_results: [{ current_value: 0, target_value: 100 }],
        },
        {
          confidence: "off_track",
          key_results: [{ current_value: 50, target_value: 100 }],
        },
      ]);
      expect(stats.count).toBe(3);
      expect(stats.attainment).toBe(50); // (100 + 0 + 50) / 3
      expect(stats.onTrack).toBe(1);
      expect(stats.atRisk).toBe(1);
      expect(stats.offTrack).toBe(1);
    });
  });
});
