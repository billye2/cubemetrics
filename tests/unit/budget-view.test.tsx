// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, within, cleanup } from "@testing-library/react";

vi.mock("@/app/app/budget/actions", () => ({
  copyForwardAction: vi.fn(async () => {}),
  setBudgetTargetAction: vi.fn(async () => {}),
}));
vi.mock("next/link", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

import { BudgetView } from "@/app/app/budget/BudgetView";
import type { BudgetLine, CategoryRow } from "@/app/app/budget/lib";

const categories: CategoryRow[] = [
  { id: 1, name: "Food", color: "#f87171", sort_order: 0 },
  { id: 2, name: "Fun", color: "#34d399", sort_order: 1 },
];
// Food over (120/100), Fun under (40/100). Total spent 160 of 200 planned → 80%.
const lines: BudgetLine[] = [
  { category: "Food", color: "#f87171", planned: 100, spent: 120 },
  { category: "Fun", color: "#34d399", planned: 100, spent: 40 },
];

function view() {
  return (
    <BudgetView
      month="2026-06-01"
      prevMonth="2026-05-01"
      nextMonth="2026-07-01"
      isCurrentMonth
      categories={categories}
      lines={lines}
      canCopyForward={false}
      prevPlannedCount={0}
    />
  );
}

beforeEach(() => cleanup());
afterEach(() => vi.unstubAllGlobals());

describe("BudgetView", () => {
  it("shows a spent/planned ring in the hero (80%)", () => {
    render(view());
    expect(screen.getByText("80%")).toBeTruthy();
  });

  it("renders status pills per category (over / left)", () => {
    render(view());
    // Food is over (rose pill), Fun is under (cyan "left" pill)
    expect(screen.getAllByText(/over/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/left/).length).toBeGreaterThanOrEqual(1);
  });
});
