// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, within, cleanup, waitFor } from "@testing-library/react";

const { goalAddAction, goalUpdateProgressAction, goalCompleteAction, goalDeleteAction } = vi.hoisted(
  () => ({
    goalAddAction: vi.fn(async () => {}),
    goalUpdateProgressAction: vi.fn(async () => {}),
    goalCompleteAction: vi.fn(async () => {}),
    goalDeleteAction: vi.fn(async () => {}),
  }),
);
vi.mock("@/app/app/_factories/actions", () => ({
  goalAddAction,
  goalUpdateProgressAction,
  goalCompleteAction,
  goalDeleteAction,
}));

import { GoalView } from "@/app/app/_factories/GoalView";
import type { FactoryConfig } from "@/lib/modern/catalog";

const config = { goalType: "goal", hasTarget: true } as FactoryConfig;
const APP = "reading";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}
function dateAhead(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// 3/12 books = 25% value, but ~50% of the time window elapsed → behind pace.
const goals = [
  {
    id: 1,
    title: "Read 12 books",
    description: "One a month",
    current_value: 3,
    target_value: 12,
    unit: "books",
    status: "active",
    due_date: dateAhead(60),
    created_at: isoDaysAgo(60),
  },
  {
    id: 2,
    title: "Finished goal",
    description: null,
    current_value: 5,
    target_value: 5,
    unit: "x",
    status: "completed",
    due_date: null,
    created_at: isoDaysAgo(10),
  },
];

function cardOf(title: string): HTMLElement {
  return screen.getByText(title).closest("li") as HTMLElement;
}

beforeEach(() => {
  vi.clearAllMocks();
  cleanup();
});
afterEach(() => vi.unstubAllGlobals());

describe("GoalView — overview", () => {
  it("shows the empty state with no goals", () => {
    render(<GoalView appId={APP} config={config} goals={[]} />);
    expect(screen.getByText("No goals yet.")).toBeTruthy();
  });

  it("renders value progress, a time bar, and a pace pill", () => {
    render(<GoalView appId={APP} config={config} goals={goals} />);
    const card = cardOf("Read 12 books");
    expect(within(card).getByText("25%")).toBeTruthy(); // 3/12 value progress
    expect(within(card).getByText(/Time ·/)).toBeTruthy(); // elapsed-vs-remaining bar
    expect(within(card).getByText("Behind pace")).toBeTruthy(); // 25% value vs ~50% time
  });

  it("hides completed goals behind a toggle", () => {
    render(<GoalView appId={APP} config={config} goals={goals} />);
    expect(screen.queryByText("Finished goal")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Completed \(1\)/ }));
    expect(screen.getByText("Finished goal")).toBeTruthy();
  });
});

describe("GoalView — actions", () => {
  it("adds a goal from the form", async () => {
    render(<GoalView appId={APP} config={config} goals={goals} />);
    fireEvent.click(screen.getByRole("button", { name: "+ Add goal" }));
    fireEvent.change(screen.getByPlaceholderText("Goal title"), { target: { value: "Run a 10k" } });
    const form = screen.getByPlaceholderText("Goal title").closest("form") as HTMLFormElement;
    fireEvent.submit(form);
    await waitFor(() => expect(goalAddAction).toHaveBeenCalledTimes(1));
    const args = goalAddAction.mock.calls[0] as unknown[];
    expect(args[0]).toBe(APP);
    expect(args[2]).toBe("Run a 10k");
  });

  it("increments progress with +1", async () => {
    render(<GoalView appId={APP} config={config} goals={goals} />);
    fireEvent.click(within(cardOf("Read 12 books")).getByRole("button", { name: "+1" }));
    await waitFor(() => expect(goalUpdateProgressAction).toHaveBeenCalledWith(APP, 1, 4));
  });

  it("marks a goal complete", async () => {
    render(<GoalView appId={APP} config={config} goals={goals} />);
    fireEvent.click(within(cardOf("Read 12 books")).getByRole("button", { name: "Mark complete" }));
    await waitFor(() => expect(goalCompleteAction).toHaveBeenCalledWith(APP, 1));
  });

  it("deletes a goal when confirmed", async () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    render(<GoalView appId={APP} config={config} goals={goals} />);
    fireEvent.click(within(cardOf("Read 12 books")).getByRole("button", { name: "×" }));
    await waitFor(() => expect(goalDeleteAction).toHaveBeenCalledWith(APP, 1));
  });
});
