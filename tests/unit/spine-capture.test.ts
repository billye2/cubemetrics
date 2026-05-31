import { describe, it, expect } from "vitest";
import { classify, loggableApps } from "@/lib/spine/registry";
import { isCaptureTable } from "@/lib/spine/lib";

describe("capture routing — classify (real adapter match)", () => {
  const top = (s: string) => classify(s)[0]?.appId;

  it("routes by prefix; bare text falls back to todo (0.2)", () => {
    expect(top("w 2")).toBe("water");
    expect(top("todo x")).toBe("todo");
    expect(top("h run")).toBe("habits");
    expect(top("journal good day")).toBe("journal");
    expect(top("buy milk later")).toBe("todo");
  });

  it("the bare-text top score is below the auto-route threshold (0.5)", () => {
    // capture() only auto-routes when score >= 0.5; "random" yields only todo@0.2.
    const ranked = classify("random thought");
    expect(ranked.map((r) => r.appId)).toEqual(["todo"]);
    expect(ranked[0].score).toBeLessThan(0.5);
  });

  it("a prefixed input clears the threshold", () => {
    expect(classify("w 3")[0].score).toBeGreaterThanOrEqual(0.5);
  });
});

describe("loggableApps", () => {
  it("returns exactly the 4 loggable proof apps with catalog name+icon", () => {
    const apps = loggableApps();
    expect(new Set(apps.map((a) => a.appId))).toEqual(new Set(["todo", "habits", "water", "journal"]));
    for (const a of apps) {
      expect(a.name.length).toBeGreaterThan(0);
      expect(a.icon.length).toBeGreaterThan(0);
    }
    expect(apps.find((a) => a.appId === "todo")?.name).toBe("Todo");
  });
});

describe("🔒 undo allowlist (isCaptureTable)", () => {
  it("accepts only capture tables, rejects sensitive ones", () => {
    expect(isCaptureTable("todos")).toBe(true);
    expect(isCaptureTable("habit_checkins")).toBe(true);
    expect(isCaptureTable("daily_trackers")).toBe(true);
    expect(isCaptureTable("journal_entries")).toBe(true);
    expect(isCaptureTable("profiles")).toBe(false);
    expect(isCaptureTable("user_feedback")).toBe(false);
    expect(isCaptureTable("app_usage")).toBe(false);
  });
});
