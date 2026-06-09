// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

vi.mock("@/app/app/mealplanner/actions", () => ({
  setMeal: vi.fn(async () => {}),
  clearMeal: vi.fn(async () => {}),
  generateGroceries: vi.fn(async () => ({ added: 0, recipes: 0 })),
  getWeekMeals: vi.fn(async () => []),
  copyWeek: vi.fn(async () => []),
}));

import { MealPlannerView } from "@/app/app/mealplanner/MealPlannerView";
import { SLOTS } from "@/app/app/mealplanner/lib";

const today = "2026-06-08";
const initialMeals = [
  { id: 1, date: today, slot: SLOTS[0], meal: "Oatmeal", recipeId: null },
  { id: 2, date: today, slot: SLOTS[1], meal: "Salad", recipeId: null },
];

beforeEach(() => cleanup());
afterEach(() => vi.unstubAllGlobals());

describe("MealPlannerView", () => {
  it("shows a week-progress ring (2 of 21 slots planned)", () => {
    render(<MealPlannerView today={today} initialMeals={initialMeals} recipes={[]} />);
    expect(screen.getByText("2 of 21 meals planned")).toBeTruthy();
  });

  it("opens the slot editor when a meal is tapped", () => {
    render(<MealPlannerView today={today} initialMeals={initialMeals} recipes={[]} />);
    fireEvent.click(screen.getByText("Oatmeal").closest("button") as HTMLButtonElement);
    expect(screen.getByDisplayValue("Oatmeal")).toBeTruthy(); // editor prefilled
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
  });
});
