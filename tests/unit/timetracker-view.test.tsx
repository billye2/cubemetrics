// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";

// Mock the server actions (they pull in supabase/server which is RSC-only).
// vi.hoisted so the fns exist when the hoisted vi.mock factory runs.
const { addTimeEntryAction, deleteTimeEntryAction, setTimeBudgetAction } = vi.hoisted(() => ({
  addTimeEntryAction: vi.fn(async (_category: string, _minutes: number, _note: string) => {}),
  deleteTimeEntryAction: vi.fn(async (_id: number) => {}),
  setTimeBudgetAction: vi.fn(async (_category: string, _weeklyMinutes: number) => {}),
}));
vi.mock("@/app/app/timetracker/actions", () => ({
  addTimeEntryAction,
  deleteTimeEntryAction,
  setTimeBudgetAction,
}));

import { TimeTrackerView } from "@/app/app/timetracker/TimeTrackerView";

const NOW = new Date().toISOString(); // always within the current week

// Deep work is over its 600 budget (660 logged); Meetings under (100 of 300).
const entries = [
  { id: 1, value: 660, label: "Deep work", note: null, created_at: NOW },
  { id: 2, value: 100, label: "Meetings", note: null, created_at: NOW },
];
const budgets = [
  { label: "Deep work", value: 600 },
  { label: "Meetings", value: 300 },
];

// Budget-card name spans carry the text-[14.5px] class — distinct from the same
// category names that also appear in the Recent-entries list (text-sm).
function budgetNameEls(): HTMLElement[] {
  return screen
    .getAllByText(/^(Deep work|Meetings)$/)
    .filter((el) => el.className.includes("text-[14.5px]"));
}
function categoryOrder(): string[] {
  return budgetNameEls().map((el) => el.textContent || "");
}
function cardFor(name: string): HTMLElement {
  const el = budgetNameEls().find((e) => e.textContent === name);
  return el!.closest(".rounded-2xl") as HTMLElement;
}

beforeEach(() => {
  vi.clearAllMocks();
  cleanup();
});

describe("TimeBudget view", () => {
  it("renders hero totals, the over-budget sentence, and pace pills", () => {
    render(<TimeTrackerView entries={entries} budgets={budgets} />);
    // total spent 760 = 12h 40m (may also appear in the projection on the last
    // day of the week, when projected == spent); total budget 900 = 15h.
    expect(screen.getAllByText("12h 40m").length).toBeGreaterThan(0);
    expect(screen.getByText("of 15h budget")).toBeTruthy();
    // status sentence names the over category
    expect(screen.getByText(/1 category is over budget/)).toBeTruthy();
    expect(screen.getByText(/Deep work\. Trim or rebalance/)).toBeTruthy();
    // Deep work shows the "over" pill (660 − 600 = 1h)
    expect(within(cardFor("Deep work")).getByText("1h over")).toBeTruthy();
  });

  it("+30m quick-logs optimistically WITHOUT reordering the list", () => {
    render(<TimeTrackerView entries={entries} budgets={budgets} />);
    // pace order: Deep work (1.1) before Meetings (0.33)
    expect(categoryOrder()).toEqual(["Deep work", "Meetings"]);

    fireEvent.click(within(cardFor("Meetings")).getByText("+30m"));

    expect(addTimeEntryAction).toHaveBeenCalledWith("Meetings", 30, "");
    // spent updated optimistically: 100 → 130 = 2h 10m
    expect(within(cardFor("Meetings")).getByText("2h 10m")).toBeTruthy();
    // order unchanged — the card did NOT jump
    expect(categoryOrder()).toEqual(["Deep work", "Meetings"]);
  });

  it("Adjust mode shows steppers; bumping a target persists +30 and does not move the card", () => {
    render(<TimeTrackerView entries={entries} budgets={budgets} />);
    fireEvent.click(screen.getByRole("button", { name: "Adjust" }));

    // adjust order is alphabetical & stable
    expect(categoryOrder()).toEqual(["Deep work", "Meetings"]);

    const inc = within(cardFor("Deep work")).getByLabelText("Increase budget");
    fireEvent.click(inc);

    // 600 → 630 persisted
    expect(setTimeBudgetAction).toHaveBeenCalledWith("Deep work", 630);
    // card stays put
    expect(categoryOrder()).toEqual(["Deep work", "Meetings"]);

    // decreasing floors at 0 and never goes negative
    const dec = within(cardFor("Meetings")).getByLabelText("Decrease budget");
    for (let i = 0; i < 12; i++) fireEvent.click(dec);
    const lastCall = setTimeBudgetAction.mock.calls.at(-1);
    expect(lastCall?.[1]).toBeGreaterThanOrEqual(0);
  });

  it("opens the Log sheet from the FAB", () => {
    render(<TimeTrackerView entries={entries} budgets={budgets} />);
    fireEvent.click(screen.getByRole("button", { name: /Log time/ }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByPlaceholderText("Note (optional)")).toBeTruthy();
  });

  it("with no budgets, prompts to set them and hides the projection", () => {
    render(<TimeTrackerView entries={entries} budgets={[]} />);
    expect(screen.getByText(/Set a weekly budget per category/)).toBeTruthy();
    expect(screen.queryByText("Projection")).toBeNull();
  });
});
