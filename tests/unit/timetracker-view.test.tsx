// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, within, cleanup, waitFor } from "@testing-library/react";

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

// Generic version (any category name) — the budget-card name span is the only
// one carrying text-[14.5px] (recent-list/log-sheet copies use other sizes).
function cardOf(name: string): HTMLElement {
  const el = screen
    .getAllByText(name)
    .find((e) => e.className.includes("text-[14.5px]"));
  return el!.closest(".rounded-2xl") as HTMLElement;
}

// Same Monday-start dayFrac the component uses, so projection math is deterministic.
function dayFrac(): number {
  return (((new Date().getDay() + 6) % 7) + 1) / 7;
}

beforeEach(() => {
  vi.clearAllMocks();
  cleanup();
});
afterEach(() => vi.unstubAllGlobals());

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

  it("projects the week-end total with the correct over/within branch", () => {
    render(<TimeTrackerView entries={entries} budgets={budgets} />);
    const card = screen.getByText("Projection").parentElement as HTMLElement;
    // projected = round(totalSpent / dayFrac); compare to the 900 total budget.
    const projected = Math.round(760 / dayFrac());
    const phrase = projected > 900 ? /over budget/ : /within budget/;
    expect(within(card).getByText(phrase)).toBeTruthy();
  });

  it("shows a 'No budget' pill for an unbudgeted category that has time logged", () => {
    const mixed = [
      { id: 1, value: 660, label: "Deep work", note: null, created_at: NOW },
      { id: 2, value: 50, label: "Reading", note: null, created_at: NOW },
    ];
    render(<TimeTrackerView entries={mixed} budgets={[{ label: "Deep work", value: 600 }]} />);
    expect(within(cardOf("Reading")).getByText("No budget")).toBeTruthy();
    // the budgeted-but-over one still reads "over"
    expect(within(cardOf("Deep work")).getByText("1h over")).toBeTruthy();
  });
});

describe("TimeBudget — recent entries", () => {
  it("renders rows with category, note, and formatted minutes", () => {
    const withNote = [
      { id: 7, value: 90, label: "Deep work", note: "spec draft", created_at: NOW },
    ];
    render(<TimeTrackerView entries={withNote} budgets={budgets} />);
    const list = screen.getByText("Recent entries").parentElement as HTMLElement;
    expect(within(list).getByText("spec draft")).toBeTruthy();
    expect(within(list).getByText("1h 30m")).toBeTruthy(); // fmt(90)
  });

  it("deletes an entry when confirmed, and not when dismissed", async () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    render(<TimeTrackerView entries={entries} budgets={budgets} />);
    // first delete button belongs to the first recent row (id 1)
    fireEvent.click(screen.getAllByLabelText("Delete")[0]);
    expect(deleteTimeEntryAction).not.toHaveBeenCalled();

    vi.stubGlobal("confirm", vi.fn(() => true));
    fireEvent.click(screen.getAllByLabelText("Delete")[0]);
    await waitFor(() => expect(deleteTimeEntryAction).toHaveBeenCalledWith(1));
  });
});

describe("TimeBudget — log sheet", () => {
  function openSheet() {
    render(<TimeTrackerView entries={entries} budgets={budgets} />);
    fireEvent.click(screen.getByRole("button", { name: /Log time/ }));
    return screen.getByRole("dialog");
  }

  it("Log button is disabled until a category is chosen", () => {
    const dialog = openSheet();
    const submit = within(dialog).getByRole("button", { name: /Pick a category/ }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it("logs a recent-category entry with the picked preset + note, then closes", async () => {
    const dialog = openSheet();
    fireEvent.click(within(dialog).getByRole("button", { name: "Meetings" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "45m" })); // fmt(45)
    fireEvent.change(within(dialog).getByPlaceholderText("Note (optional)"), {
      target: { value: "sync" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /Log 45m on Meetings/ }));

    await waitFor(() => expect(addTimeEntryAction).toHaveBeenCalledWith("Meetings", 45, "sync"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("logs a brand-new custom category at the default duration", async () => {
    const dialog = openSheet();
    fireEvent.click(within(dialog).getByRole("button", { name: "+ New" }));
    fireEvent.change(within(dialog).getByPlaceholderText("New category name"), {
      target: { value: "Side project" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /Log 30m on Side project/ }));

    await waitFor(() => expect(addTimeEntryAction).toHaveBeenCalledWith("Side project", 30, ""));
  });
});
