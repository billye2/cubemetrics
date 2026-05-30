import { describe, it, expect } from "vitest";
import {
  LIFE_AREAS,
  activeAreas,
  areaFor,
  filterByArea,
  normalizeKind,
  sortCards,
  toCard,
  type VisionCard,
  type VisionCardRow,
} from "@/app/app/visionboard/lib";

function row(over: Partial<VisionCardRow>): VisionCardRow {
  return {
    id: 1,
    kind: "quote",
    text: "Dream big",
    image_url: null,
    section: null,
    position: 0,
    created_at: "2026-05-01T00:00:00Z",
    ...over,
  };
}

function card(over: Partial<VisionCard>): VisionCard {
  return {
    id: 1,
    kind: "quote",
    text: "x",
    imageUrl: null,
    section: null,
    position: 0,
    createdAt: "2026-05-01T00:00:00Z",
    ...over,
  };
}

describe("normalizeKind", () => {
  it("maps image to image and everything else to quote", () => {
    expect(normalizeKind("image")).toBe("image");
    expect(normalizeKind("quote")).toBe("quote");
    expect(normalizeKind("garbage")).toBe("quote");
  });
});

describe("toCard", () => {
  it("maps DB row to view model and normalizes kind", () => {
    const c = toCard(row({ kind: "image", image_url: "https://x/y.png", text: "cap" }));
    expect(c.kind).toBe("image");
    expect(c.imageUrl).toBe("https://x/y.png");
    expect(c.text).toBe("cap");
  });
});

describe("areaFor", () => {
  it("resolves a known life area", () => {
    expect(areaFor("health").label).toBe("Health");
  });
  it("falls back to neutral for empty/null", () => {
    expect(areaFor(null).label).toBe("Other");
    expect(areaFor("").label).toBe("Other");
  });
  it("echoes an unknown free-form section as its own label", () => {
    const a = areaFor("Fitness 2.0");
    expect(a.label).toBe("Fitness 2.0");
    expect(a.chip).toContain("zinc");
  });
});

describe("sortCards", () => {
  it("orders by position then newest-first", () => {
    const list = [
      card({ id: 1, position: 2, createdAt: "2026-05-01T00:00:00Z" }),
      card({ id: 2, position: 0, createdAt: "2026-05-01T00:00:00Z" }),
      card({ id: 3, position: 0, createdAt: "2026-05-09T00:00:00Z" }),
    ];
    expect(sortCards(list).map((c) => c.id)).toEqual([3, 2, 1]);
  });
});

describe("filterByArea", () => {
  const list = [
    card({ id: 1, section: "health" }),
    card({ id: 2, section: "career" }),
    card({ id: 3, section: null }),
  ];
  it("passes everything for a null filter", () => {
    expect(filterByArea(list, null)).toHaveLength(3);
  });
  it("filters to a single area", () => {
    expect(filterByArea(list, "career").map((c) => c.id)).toEqual([2]);
  });
});

describe("activeAreas", () => {
  it("returns only used areas, in LIFE_AREAS order", () => {
    const list = [card({ section: "career" }), card({ section: "health" }), card({ section: null })];
    const result = activeAreas(list).map((a) => a.id);
    // health comes before career in LIFE_AREAS
    expect(result).toEqual(["health", "career"]);
  });
  it("never includes an area that has no cards", () => {
    const result = activeAreas([card({ section: "travel" })]).map((a) => a.id);
    expect(result).toEqual(["travel"]);
    expect(LIFE_AREAS.length).toBeGreaterThan(1);
  });
});
