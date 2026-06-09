// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, within, cleanup, waitFor } from "@testing-library/react";

const { addContribution } = vi.hoisted(() => ({
  addContribution: vi.fn(async (_g: number, _a: number, _d: string | null, _n: string) => {}),
  createGoal: vi.fn(async () => {}),
  deleteContribution: vi.fn(async () => {}),
  deleteGoal: vi.fn(async () => {}),
  updateGoal: vi.fn(async () => {}),
}));
vi.mock("@/app/app/savings/actions", () => ({
  addContribution,
  createGoal: vi.fn(async () => {}),
  deleteContribution: vi.fn(async () => {}),
  deleteGoal: vi.fn(async () => {}),
  updateGoal: vi.fn(async () => {}),
}));

import { SavingsView } from "@/app/app/savings/SavingsView";

const goals = [
  { id: 1, title: "Emergency fund", target_value: 1000, due_date: null, status: "active", created_at: "2026-01-01T00:00:00Z" },
  { id: 2, title: "Car", target_value: 1000, due_date: null, status: "active", created_at: "2026-01-01T00:00:00Z" },
];
const contributions = [
  { id: 11, goal_id: 1, amount: 1000, contributed_on: "2026-02-01", note: "", created_at: "2026-02-01T00:00:00Z" },
  { id: 21, goal_id: 2, amount: 200, contributed_on: "2026-02-01", note: "", created_at: "2026-02-01T00:00:00Z" },
];

beforeEach(() => {
  vi.clearAllMocks();
  cleanup();
});
afterEach(() => vi.unstubAllGlobals());

describe("SavingsView", () => {
  it("shows a pace ring per goal — complete goal celebrates, partial shows %", () => {
    render(<SavingsView goals={goals} contributions={contributions} />);
    expect(screen.getByText(/Goal reached/)).toBeTruthy(); // Emergency fund (1000/1000)
    expect(screen.getByText("20%")).toBeTruthy(); // Car (200/1000) ring
  });

  it("adds a contribution to a goal", async () => {
    render(<SavingsView goals={goals} contributions={contributions} />);
    const card = screen.getByText("Car").closest("li") as HTMLElement;
    const amount = within(card).getByLabelText("Contribution amount");
    fireEvent.change(amount, { target: { value: "50" } });
    fireEvent.submit(amount.closest("form") as HTMLFormElement);
    await waitFor(() => expect(addContribution).toHaveBeenCalled());
    const args = addContribution.mock.calls[0];
    expect(args[0]).toBe(2);
    expect(args[1]).toBe(50);
  });
});
