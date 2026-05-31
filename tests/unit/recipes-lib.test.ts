import { describe, it, expect } from "vitest";
import {
  scaleQty,
  scaleFactor,
  formatQty,
  formatTime,
  totalTime,
  matchesQuery,
  parseTags,
  parseStepDuration,
  formatClock,
  toRecipe,
  type RecipeRow,
  type IngredientRow,
  type StepRow,
  type Recipe,
} from "@/app/app/recipes/lib";

describe("scaleFactor", () => {
  it("computes target/base", () => {
    expect(scaleFactor(4, 8)).toBe(2);
    expect(scaleFactor(4, 2)).toBe(0.5);
  });
  it("falls back to 1 when base or target is missing/invalid", () => {
    expect(scaleFactor(null, 4)).toBe(1);
    expect(scaleFactor(0, 4)).toBe(1);
    expect(scaleFactor(4, 0)).toBe(1);
    expect(scaleFactor(-2, 4)).toBe(1);
  });
});

describe("scaleQty", () => {
  it("scales by factor and rounds float noise", () => {
    expect(scaleQty(2, 2)).toBe(4);
    expect(scaleQty(1, 0.5)).toBe(0.5);
    expect(scaleQty(0.1, 3)).toBe(0.3); // 0.30000000000000004 -> 0.3
  });
  it("passes null through (e.g. 'to taste')", () => {
    expect(scaleQty(null, 2)).toBeNull();
  });
});

describe("formatQty", () => {
  it("keeps whole numbers bare", () => {
    expect(formatQty(4)).toBe("4");
    expect(formatQty(0)).toBe("0");
  });
  it("renders common fractions as vulgar fractions", () => {
    expect(formatQty(0.5)).toBe("½");
    expect(formatQty(0.25)).toBe("¼");
    expect(formatQty(0.75)).toBe("¾");
    expect(formatQty(1.5)).toBe("1½");
    expect(formatQty(2.25)).toBe("2¼");
  });
  it("renders thirds", () => {
    expect(formatQty(0.333)).toBe("⅓");
    expect(formatQty(0.667)).toBe("⅔");
  });
  it("trims odd decimals to 2 places", () => {
    expect(formatQty(0.333333)).not.toBe("");
    expect(formatQty(1.234)).toBe("1.23");
  });
  it("returns empty for null qty", () => {
    expect(formatQty(null)).toBe("");
  });
});

describe("formatTime", () => {
  it("formats minutes, hours, and combined", () => {
    expect(formatTime(45)).toBe("45 min");
    expect(formatTime(60)).toBe("1 hr");
    expect(formatTime(80)).toBe("1 hr 20 min");
  });
  it("returns null for missing/zero", () => {
    expect(formatTime(null)).toBeNull();
    expect(formatTime(0)).toBeNull();
  });
});

describe("totalTime", () => {
  it("sums prep + cook", () => {
    expect(totalTime(15, 30)).toBe(45);
    expect(totalTime(null, 30)).toBe(30);
    expect(totalTime(15, null)).toBe(15);
  });
  it("returns null when both missing", () => {
    expect(totalTime(null, null)).toBeNull();
  });
});

describe("parseTags", () => {
  it("splits, lowercases, trims, de-dupes", () => {
    expect(parseTags("Italian, dinner ,  italian")).toEqual(["italian", "dinner"]);
  });
  it("drops empties", () => {
    expect(parseTags(" , , ")).toEqual([]);
  });
});

describe("parseStepDuration", () => {
  it("parses minutes in various spellings", () => {
    expect(parseStepDuration("Simmer for 20 minutes")).toBe(20 * 60);
    expect(parseStepDuration("Bake 30 min")).toBe(30 * 60);
    expect(parseStepDuration("Rest 5m before slicing")).toBe(5 * 60);
  });
  it("parses hours and seconds", () => {
    expect(parseStepDuration("Roast for 1 hour")).toBe(3600);
    expect(parseStepDuration("Roast 1.5 hr")).toBe(Math.round(1.5 * 3600));
    expect(parseStepDuration("Blanch 30 seconds")).toBe(30);
    expect(parseStepDuration("Whisk 45 secs")).toBe(45);
  });
  it("uses the upper bound of a range", () => {
    expect(parseStepDuration("Cook 1-2 minutes")).toBe(2 * 60);
    expect(parseStepDuration("Simmer 10 to 12 min")).toBe(12 * 60);
  });
  it("returns null when no duration is mentioned", () => {
    expect(parseStepDuration("Season to taste")).toBeNull();
    expect(parseStepDuration("")).toBeNull();
  });
  it("ignores durations over the 4-hour cap", () => {
    expect(parseStepDuration("Marinate 8 hours")).toBeNull();
  });
  it("does not mistake oven temperatures for a duration", () => {
    // "350" alone (no time unit) must not parse.
    expect(parseStepDuration("Preheat oven to 350")).toBeNull();
  });
});

describe("formatClock", () => {
  it("formats mm:ss", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(65)).toBe("1:05");
    expect(formatClock(600)).toBe("10:00");
  });
  it("formats h:mm:ss past an hour", () => {
    expect(formatClock(3661)).toBe("1:01:01");
  });
  it("clamps negatives to zero", () => {
    expect(formatClock(-5)).toBe("0:00");
  });
});

function recipe(over: Partial<Recipe> = {}): Recipe {
  const rRow: RecipeRow = {
    id: 1,
    user_id: "u",
    name: over.name ?? "Pasta",
    servings: over.servings ?? 4,
    prep_min: 10,
    cook_min: 20,
    tags: over.tags ?? ["italian"],
    photo_path: null,
    notes: null,
    created_at: "2026-05-30T00:00:00Z",
  };
  const ings: IngredientRow[] = (over.ingredients ?? [{ id: 1, qty: 200, unit: "g", item: "spaghetti", sort: 0 }]).map(
    (i, idx) => ({ id: i.id, recipe_id: 1, qty: i.qty, unit: i.unit, item: i.item, sort: i.sort ?? idx }),
  );
  const steps: StepRow[] = (over.steps ?? [{ id: 1, stepNo: 0, text: "Boil water" }]).map((s) => ({
    id: s.id,
    recipe_id: 1,
    step_no: s.stepNo,
    text: s.text,
  }));
  return toRecipe(rRow, ings, steps);
}

describe("toRecipe", () => {
  it("sorts ingredients by sort then id, steps by step_no", () => {
    const r = toRecipe(
      {
        id: 1,
        user_id: "u",
        name: "X",
        servings: null,
        prep_min: null,
        cook_min: null,
        tags: null,
        photo_path: null,
        notes: null,
        created_at: "2026-05-30T00:00:00Z",
      },
      [
        { id: 2, recipe_id: 1, qty: 1, unit: "", item: "b", sort: 1 },
        { id: 1, recipe_id: 1, qty: 1, unit: "", item: "a", sort: 0 },
      ],
      [
        { id: 5, recipe_id: 1, step_no: 1, text: "second" },
        { id: 4, recipe_id: 1, step_no: 0, text: "first" },
      ],
    );
    expect(r.ingredients.map((i) => i.item)).toEqual(["a", "b"]);
    expect(r.steps.map((s) => s.text)).toEqual(["first", "second"]);
    expect(r.tags).toEqual([]);
  });
});

describe("matchesQuery", () => {
  const r = recipe({
    name: "Spaghetti Carbonara",
    tags: ["italian", "dinner"],
    ingredients: [
      { id: 1, qty: 200, unit: "g", item: "spaghetti", sort: 0 },
      { id: 2, qty: 100, unit: "g", item: "pancetta", sort: 1 },
    ],
  });
  it("matches empty query", () => {
    expect(matchesQuery(r, "")).toBe(true);
  });
  it("matches by name", () => {
    expect(matchesQuery(r, "carbon")).toBe(true);
  });
  it("matches by tag", () => {
    expect(matchesQuery(r, "dinner")).toBe(true);
  });
  it("matches by ingredient", () => {
    expect(matchesQuery(r, "pancetta")).toBe(true);
  });
  it("no match", () => {
    expect(matchesQuery(r, "chocolate")).toBe(false);
  });
});
