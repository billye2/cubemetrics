// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, within, cleanup } from "@testing-library/react";

vi.mock("@/app/app/expenses/actions", () => ({
  addCategoryAction: vi.fn(async () => {}),
  addExpenseAction: vi.fn(async () => {}),
  deleteCategoryAction: vi.fn(async () => {}),
  deleteExpenseAction: vi.fn(async () => {}),
  updateExpenseAction: vi.fn(async () => {}),
}));

import { ExpensesView } from "@/app/app/expenses/ExpensesView";

const today = new Date().toISOString().slice(0, 10);
const expenses = [
  { id: 1, amount: 12, category: "Food", expense_date: today, description: "Lunch", currency: "USD", created_at: `${today}T09:00:00Z` },
];
const categories = [{ id: 1, name: "Food", color: "#f87171", sort_order: 0 }];

function statCell(label: string): HTMLElement {
  return screen.getByText(label).parentElement as HTMLElement;
}

beforeEach(() => cleanup());
afterEach(() => vi.unstubAllGlobals());

describe("ExpensesView — summary strip", () => {
  it("shows month / week / today stat tiles", () => {
    render(
      <ExpensesView
        expenses={expenses}
        monthTotal={100}
        weekTotal={30}
        categories={categories}
        breakdown={[]}
      />,
    );
    expect(within(statCell("This month")).getByText("$100.00")).toBeTruthy();
    expect(within(statCell("This week")).getByText("$30.00")).toBeTruthy();
    expect(within(statCell("Today")).getByText("$12.00")).toBeTruthy(); // summed from today's expense
  });
});
