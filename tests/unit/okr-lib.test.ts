import { describe, it, expect } from "vitest";
import {
  cleanConfidence,
  krPct,
  objectiveScore,
  currentCycle,
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

  describe("krPct", () => {
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
      expect(
        objectiveScore([
          { current_value: 50, target_value: 100 },
          { current_value: 25, target_value: 100 },
          { current_value: 75, target_value: 100 },
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
});
