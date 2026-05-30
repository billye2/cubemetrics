import { describe, it, expect } from "vitest";
import {
  cleanStatus,
  cleanWeight,
  cleanScore,
  scoreKey,
  computeResults,
  recommendedOptionId,
  revisitDue,
  isoDate,
  type Criterion,
  type OptionRow,
  type ScoreMap,
} from "@/app/app/decisionmatrix/lib";

describe("decisionmatrix lib", () => {
  describe("cleanStatus", () => {
    it("passes through valid statuses", () => {
      for (const s of ["open", "decided", "revisit"]) {
        expect(cleanStatus(s)).toBe(s);
      }
    });
    it("falls back to open", () => {
      expect(cleanStatus("garbage")).toBe("open");
      expect(cleanStatus("")).toBe("open");
    });
  });

  describe("cleanWeight", () => {
    it("clamps to 1–5 and rounds", () => {
      expect(cleanWeight(0)).toBe(1);
      expect(cleanWeight(1)).toBe(1);
      expect(cleanWeight(3)).toBe(3);
      expect(cleanWeight(5)).toBe(5);
      expect(cleanWeight(9)).toBe(5);
      expect(cleanWeight(2.6)).toBe(3);
    });
    it("defaults non-numbers to 3", () => {
      expect(cleanWeight("x")).toBe(3);
      expect(cleanWeight(NaN)).toBe(3);
      expect(cleanWeight(undefined)).toBe(3);
    });
  });

  describe("cleanScore", () => {
    it("clamps to 1–10 and rounds", () => {
      expect(cleanScore(0)).toBe(1);
      expect(cleanScore(1)).toBe(1);
      expect(cleanScore(10)).toBe(10);
      expect(cleanScore(99)).toBe(10);
      expect(cleanScore(7.4)).toBe(7);
    });
    it("defaults non-numbers to 5", () => {
      expect(cleanScore("x")).toBe(5);
      expect(cleanScore(undefined)).toBe(5);
    });
  });

  describe("scoreKey", () => {
    it("composes a stable key", () => {
      expect(scoreKey(3, 7)).toBe("3:7");
    });
  });

  const options: OptionRow[] = [
    { id: 1, label: "A" },
    { id: 2, label: "B" },
  ];
  const criteria: Criterion[] = [
    { id: 10, label: "Cost", weight: 2 },
    { id: 20, label: "Joy", weight: 3 },
  ];

  describe("computeResults", () => {
    it("weights raw scores and reports a percentage of max", () => {
      const scores: ScoreMap = {
        "1:10": 10, // A cost 10 × 2 = 20
        "1:20": 10, // A joy  10 × 3 = 30  -> 50 of 50 = 100%
        "2:10": 1, // B cost 1 × 2 = 2
        "2:20": 1, // B joy  1 × 3 = 3   -> 5 of 50 = 10%
      };
      const r = computeResults(options, criteria, scores);
      const a = r.find((x) => x.optionId === 1)!;
      const b = r.find((x) => x.optionId === 2)!;
      expect(a.max).toBe(50);
      expect(a.weighted).toBe(50);
      expect(a.pct).toBe(100);
      expect(b.weighted).toBe(5);
      expect(b.pct).toBe(10);
    });

    it("treats a missing cell as the neutral midpoint of 5", () => {
      const r = computeResults(options, criteria, {});
      // every cell = 5: A = 5×2 + 5×3 = 25 of 50 = 50%
      for (const x of r) {
        expect(x.weighted).toBe(25);
        expect(x.pct).toBe(50);
      }
    });

    it("yields zero pct when there are no criteria", () => {
      const r = computeResults(options, [], {});
      for (const x of r) {
        expect(x.max).toBe(0);
        expect(x.pct).toBe(0);
      }
    });
  });

  describe("recommendedOptionId", () => {
    it("picks the highest weighted option", () => {
      const scores: ScoreMap = { "1:10": 10, "1:20": 10, "2:10": 1, "2:20": 1 };
      const r = computeResults(options, criteria, scores);
      expect(recommendedOptionId(r)).toBe(1);
    });
    it("returns null on a tie", () => {
      const r = computeResults(options, criteria, {}); // all equal at midpoint
      expect(recommendedOptionId(r)).toBeNull();
    });
    it("returns null when there is nothing to score", () => {
      expect(recommendedOptionId([])).toBeNull();
      const r = computeResults(options, [], {});
      expect(recommendedOptionId(r)).toBeNull();
    });
  });

  describe("revisitDue", () => {
    it("is true on or before today", () => {
      expect(revisitDue("2026-05-01", "2026-05-30")).toBe(true);
      expect(revisitDue("2026-05-30", "2026-05-30")).toBe(true);
    });
    it("is false in the future or when unset", () => {
      expect(revisitDue("2026-06-30", "2026-05-30")).toBe(false);
      expect(revisitDue(null, "2026-05-30")).toBe(false);
    });
  });

  describe("isoDate", () => {
    it("formats YYYY-MM-DD", () => {
      expect(isoDate(new Date(2026, 4, 9))).toBe("2026-05-09");
      expect(isoDate(new Date(2026, 11, 31))).toBe("2026-12-31");
    });
  });
});
