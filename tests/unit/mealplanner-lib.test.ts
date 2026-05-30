import { describe, it, expect } from "vitest";
import {
  normalizeSlot,
  toMeal,
  weekStart,
  weekDates,
  addDays,
  weekdayShort,
  weekdayLong,
  dayLabel,
  weekRangeLabel,
  indexMeals,
  slotKey,
  aggregateGroceries,
  formatQty,
  type MealRow,
  type RecipeBundle,
} from "@/app/app/mealplanner/lib";

describe("normalizeSlot", () => {
  it("accepts the three valid slots", () => {
    expect(normalizeSlot("breakfast")).toBe("breakfast");
    expect(normalizeSlot("lunch")).toBe("lunch");
    expect(normalizeSlot("dinner")).toBe("dinner");
  });
  it("rejects anything else", () => {
    expect(normalizeSlot("brunch")).toBeNull();
    expect(normalizeSlot("")).toBeNull();
    expect(normalizeSlot(null)).toBeNull();
    expect(normalizeSlot(undefined)).toBeNull();
  });
});

describe("toMeal", () => {
  const row: MealRow = {
    id: 1,
    user_id: "u",
    date: "2026-05-13",
    slot: "dinner",
    meal: "Tacos",
    recipe_id: 7,
    created_at: "2026-05-13T00:00:00Z",
  };
  it("maps a valid row", () => {
    expect(toMeal(row)).toEqual({
      id: 1,
      date: "2026-05-13",
      slot: "dinner",
      meal: "Tacos",
      recipeId: 7,
    });
  });
  it("drops rows with a bad slot", () => {
    expect(toMeal({ ...row, slot: "snack" })).toBeNull();
  });
});

describe("week math (Monday-anchored)", () => {
  it("weekStart snaps to the Monday on/before", () => {
    // 2026-05-13 is a Wednesday.
    expect(weekStart("2026-05-13")).toBe("2026-05-11");
    // A Monday returns itself.
    expect(weekStart("2026-05-11")).toBe("2026-05-11");
    // A Sunday snaps back to the prior Monday.
    expect(weekStart("2026-05-17")).toBe("2026-05-11");
  });
  it("weekDates returns Mon→Sun inclusive", () => {
    const dates = weekDates("2026-05-13");
    expect(dates).toHaveLength(7);
    expect(dates[0]).toBe("2026-05-11");
    expect(dates[6]).toBe("2026-05-17");
  });
  it("addDays crosses month boundaries", () => {
    expect(addDays("2026-05-31", 1)).toBe("2026-06-01");
    expect(addDays("2026-06-01", -1)).toBe("2026-05-31");
  });
  it("weekday names are Monday-indexed", () => {
    expect(weekdayShort("2026-05-11")).toBe("Mon");
    expect(weekdayShort("2026-05-17")).toBe("Sun");
    expect(weekdayLong("2026-05-13")).toBe("Wednesday");
  });
  it("formats day and week-range labels", () => {
    expect(dayLabel("2026-05-13")).toBe("May 13");
    expect(weekRangeLabel("2026-05-11")).toBe("May 11 – 17");
    // Range that spans two months shows both month names.
    expect(weekRangeLabel("2026-05-25")).toBe("May 25 – 31");
    expect(weekRangeLabel("2026-05-29")).toBe("May 29 – Jun 4");
  });
});

describe("indexMeals / slotKey", () => {
  it("indexes by date|slot", () => {
    const idx = indexMeals([
      { id: 1, date: "2026-05-11", slot: "breakfast", meal: "Eggs", recipeId: null },
      { id: 2, date: "2026-05-11", slot: "dinner", meal: "Soup", recipeId: null },
    ]);
    expect(idx.get(slotKey("2026-05-11", "breakfast"))?.meal).toBe("Eggs");
    expect(idx.get(slotKey("2026-05-11", "dinner"))?.meal).toBe("Soup");
    expect(idx.get(slotKey("2026-05-11", "lunch"))).toBeUndefined();
  });
});

describe("formatQty", () => {
  it("keeps whole numbers bare and trims decimals", () => {
    expect(formatQty(2)).toBe("2");
    expect(formatQty(2.5)).toBe("2.5");
    expect(formatQty(0.1 + 0.2)).toBe("0.3"); // float noise trimmed
  });
});

describe("aggregateGroceries", () => {
  const flour = (qty: number | null) => ({ qty, unit: "cup", item: "flour" });

  it("merges same item + unit by summing quantities", () => {
    const recipes: RecipeBundle[] = [
      { id: 1, name: "A", ingredients: [flour(2)] },
      { id: 2, name: "B", ingredients: [flour(1)] },
    ];
    const lines = aggregateGroceries(recipes);
    expect(lines).toEqual([{ title: "3 cup flour", item: "flour" }]);
  });

  it("keeps differing units as separate lines", () => {
    const lines = aggregateGroceries([
      {
        id: 1,
        name: "A",
        ingredients: [
          { qty: 1, unit: "cup", item: "milk" },
          { qty: 2, unit: "tbsp", item: "milk" },
        ],
      },
    ]);
    expect(lines).toHaveLength(2);
    expect(lines.map((l) => l.title).sort()).toEqual(["1 cup milk", "2 tbsp milk"]);
  });

  it("drops the quantity when any contributor lacked one", () => {
    const lines = aggregateGroceries([
      {
        id: 1,
        name: "A",
        ingredients: [
          { qty: null, unit: "", item: "salt" },
          { qty: 1, unit: "", item: "salt" },
        ],
      },
    ]);
    expect(lines).toEqual([{ title: "salt", item: "salt" }]);
  });

  it("is case-insensitive when merging and sorts by item", () => {
    const lines = aggregateGroceries([
      {
        id: 1,
        name: "A",
        ingredients: [
          { qty: 1, unit: "", item: "Onion" },
          { qty: 2, unit: "", item: "onion" },
          { qty: 1, unit: "", item: "apple" },
        ],
      },
    ]);
    expect(lines).toEqual([
      { title: "1 apple", item: "apple" },
      { title: "3 Onion", item: "Onion" },
    ]);
  });

  it("ignores blank items and empty input", () => {
    expect(aggregateGroceries([])).toEqual([]);
    expect(
      aggregateGroceries([{ id: 1, name: "A", ingredients: [{ qty: 1, unit: "", item: "  " }] }]),
    ).toEqual([]);
  });
});
