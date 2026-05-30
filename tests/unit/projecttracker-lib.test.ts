import { describe, it, expect } from "vitest";
import { cleanStatus, pct, dueLabel } from "@/app/app/projecttracker/lib";

describe("projecttracker lib", () => {
  describe("cleanStatus", () => {
    it("passes through valid statuses", () => {
      for (const s of ["planning", "active", "blocked", "done"]) {
        expect(cleanStatus(s)).toBe(s);
      }
    });
    it("falls back to planning for unknown values", () => {
      expect(cleanStatus("garbage")).toBe("planning");
      expect(cleanStatus("")).toBe("planning");
    });
  });

  describe("pct", () => {
    it("is 0 with no tasks", () => {
      expect(pct([])).toBe(0);
    });
    it("derives a rounded percentage from completed tasks", () => {
      expect(pct([{ completed: true }, { completed: false }])).toBe(50);
      expect(pct([{ completed: true }, { completed: true }, { completed: true }])).toBe(100);
      expect(pct([{ completed: true }, { completed: false }, { completed: false }])).toBe(33);
    });
  });

  describe("dueLabel", () => {
    const now = new Date("2026-05-29T12:00:00");
    it("returns null without a date", () => {
      expect(dueLabel(null, now)).toBeNull();
    });
    it("labels today", () => {
      expect(dueLabel("2026-05-29", now)).toEqual({ text: "Due today", overdue: false });
    });
    it("labels future days, singular and plural", () => {
      expect(dueLabel("2026-05-30", now)).toEqual({ text: "1 day left", overdue: false });
      expect(dueLabel("2026-06-03", now)).toEqual({ text: "5 days left", overdue: false });
    });
    it("labels overdue days", () => {
      expect(dueLabel("2026-05-28", now)).toEqual({ text: "1 day overdue", overdue: true });
      expect(dueLabel("2026-05-24", now)).toEqual({ text: "5 days overdue", overdue: true });
    });
  });
});
