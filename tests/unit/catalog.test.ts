import { describe, it, expect } from "vitest";
import { APPS, CATEGORIES, getApp, getAppsByCategory, type UiType } from "@/lib/modern/catalog";

const VALID_UI: UiType[] = ["modern", "tracker", "checklist", "logbook", "goal", "finance"];

describe("modern catalog", () => {
  it("has apps and all ids are unique", () => {
    expect(APPS.length).toBeGreaterThan(0);
    const ids = APPS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every app uses a known ui type (no leftover classic)", () => {
    for (const app of APPS) {
      expect(VALID_UI, `${app.id} has ui "${app.ui}"`).toContain(app.ui);
    }
  });

  it("every app's category exists in CATEGORIES", () => {
    const cats = new Set(CATEGORIES.map((c) => c.id));
    for (const app of APPS) {
      expect(cats.has(app.category), `${app.id} has unknown category "${app.category}"`).toBe(true);
    }
  });

  it("every app has a non-empty name and icon", () => {
    for (const app of APPS) {
      expect(app.name, `${app.id} name`).toBeTruthy();
      expect(app.icon, `${app.id} icon`).toBeTruthy();
    }
  });

  it("template apps carry the config their factory needs", () => {
    const need: Partial<Record<UiType, string>> = {
      tracker: "trackerType",
      checklist: "listType",
      logbook: "logType",
      goal: "goalType",
      finance: "itemType",
    };
    for (const app of APPS) {
      const key = need[app.ui];
      if (!key) continue;
      expect(app.config, `${app.id} missing config`).toBeTruthy();
      expect((app.config as Record<string, unknown>)[key], `${app.id}.config.${key}`).toBeTruthy();
    }
  });

  it("getApp / getAppsByCategory resolve entries", () => {
    const first = APPS[0];
    expect(getApp(first.id)?.id).toBe(first.id);
    expect(getApp("does-not-exist")).toBeUndefined();
    expect(getAppsByCategory(first.category).some((a) => a.id === first.id)).toBe(true);
  });
});
