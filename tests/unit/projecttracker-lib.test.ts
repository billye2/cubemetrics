import { describe, it, expect } from "vitest";
import {
  cleanStatus,
  pct,
  dueLabel,
  blockedSince,
  sortFilter,
  statusOrder,
  type SortableProject,
} from "@/app/app/projecttracker/lib";

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

  describe("blockedSince", () => {
    const now = new Date("2026-05-29T12:00:00Z");
    it("returns null without a timestamp", () => {
      expect(blockedSince(null, now)).toBeNull();
    });
    it("returns null for an unparseable timestamp", () => {
      expect(blockedSince("not-a-date", now)).toBeNull();
    });
    it("reads 'blocked today' on the same day", () => {
      expect(blockedSince("2026-05-29T08:00:00Z", now)).toBe("blocked today");
    });
    it("counts whole days, singular and plural", () => {
      expect(blockedSince("2026-05-28T08:00:00Z", now)).toBe("blocked 1 day");
      expect(blockedSince("2026-05-24T12:00:00Z", now)).toBe("blocked 5 days");
    });
  });

  describe("statusOrder", () => {
    it("orders the pipeline planning → done", () => {
      expect(statusOrder("planning")).toBe(0);
      expect(statusOrder("active")).toBe(1);
      expect(statusOrder("blocked")).toBe(2);
      expect(statusOrder("done")).toBe(3);
    });
    it("falls back to 0 for unknown status", () => {
      expect(statusOrder("garbage")).toBe(0);
    });
  });

  describe("sortFilter", () => {
    const mk = (
      status: string,
      due: string | null,
      tasks: boolean[],
      created: string,
    ): SortableProject & { id: string } => ({
      id: `${status}-${created}`,
      status,
      due_date: due,
      created_at: created,
      tasks: tasks.map((completed) => ({ completed })),
    });

    const projects = [
      mk("done", "2026-06-10", [true, true], "2026-05-01"),
      mk("planning", null, [], "2026-05-02"),
      mk("blocked", "2026-06-01", [true, false, false, false], "2026-05-03"),
      mk("active", "2026-06-05", [true, true, false], "2026-05-04"),
    ];

    it("filters to a single status", () => {
      const r = sortFilter(projects, "blocked", "status");
      expect(r).toHaveLength(1);
      expect(r[0].status).toBe("blocked");
    });

    it("passes everything through on 'all'", () => {
      expect(sortFilter(projects, "all", "status")).toHaveLength(4);
    });

    it("sorts by pipeline status", () => {
      const r = sortFilter(projects, "all", "status");
      expect(r.map((p) => p.status)).toEqual(["planning", "active", "blocked", "done"]);
    });

    it("sorts by deadline soonest-first, no-date last", () => {
      const r = sortFilter(projects, "all", "deadline");
      expect(r.map((p) => p.due_date)).toEqual([
        "2026-06-01",
        "2026-06-05",
        "2026-06-10",
        null,
      ]);
    });

    it("sorts by progress, most-complete first", () => {
      const r = sortFilter(projects, "all", "progress");
      // 100% (done), 67% (active), 25% (blocked), 0% (planning)
      expect(r.map((p) => p.status)).toEqual(["done", "active", "blocked", "planning"]);
    });

    it("sorts by created newest-first via stable original order", () => {
      // The page hands rows in created-desc order already; "created" must keep that.
      const desc = [...projects].reverse();
      const r = sortFilter(desc, "all", "created");
      expect(r.map((p) => p.created_at)).toEqual([
        "2026-05-04",
        "2026-05-03",
        "2026-05-02",
        "2026-05-01",
      ]);
    });

    it("does not mutate the input array", () => {
      const before = projects.map((p) => p.status);
      sortFilter(projects, "all", "deadline");
      expect(projects.map((p) => p.status)).toEqual(before);
    });
  });
});
