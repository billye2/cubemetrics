// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";

const { updateFocusSessionAction, deleteFocusEntryAction } = vi.hoisted(() => ({
  updateFocusSessionAction: vi.fn(async (_id: number, _input: unknown) => {}),
  deleteFocusEntryAction: vi.fn(async (_id: number) => {}),
}));
vi.mock("@/app/app/focus/actions", () => ({
  saveFocusSessionAction: vi.fn(async () => {}),
  updateFocusSessionAction,
  deleteFocusEntryAction,
}));

import { FocusView } from "@/app/app/focus/FocusView";

const today = new Date().toISOString();
const entries = [
  { id: 1, value: 52, label: "Ship onboarding", created_at: today, note: JSON.stringify({ win: "Closed the tickets", rating: 5, tag: "Deep", planned: 50, met: true }) },
  { id: 2, value: 38, label: "Draft Q3 doc", created_at: today, note: JSON.stringify({ win: "Outline done", rating: 3, tag: "Write", planned: 45, met: "partly" }) },
];

beforeEach(() => {
  vi.clearAllMocks();
  cleanup();
});
afterEach(() => vi.unstubAllGlobals());

describe("FocusView — journal home", () => {
  it("renders the weekly hero + timeline entries", () => {
    render(<FocusView entries={entries} />);
    expect(screen.getByText("Your focus journal")).toBeTruthy();
    expect(screen.getAllByText("1h 30m").length).toBeGreaterThan(0); // 90 min this week
    expect(screen.getByText("Ship onboarding")).toBeTruthy();
    expect(screen.getByText("Draft Q3 doc")).toBeTruthy();
  });

  it("filters the timeline by scope (Missed → none here)", () => {
    render(<FocusView entries={entries} />);
    fireEvent.click(screen.getByRole("button", { name: "Missed" }));
    expect(screen.queryByText("Ship onboarding")).toBeNull();
    expect(screen.getByText("No sessions match")).toBeTruthy();
  });
});

describe("FocusView — set intention → timer", () => {
  it("starts a timer from the intention sheet", () => {
    render(<FocusView entries={entries} />);
    fireEvent.click(screen.getByRole("button", { name: /Set an intention/ }));
    fireEvent.change(screen.getByPlaceholderText(/Draft the launch email/), {
      target: { value: "Write the spec" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Start focus/ }));
    // full-screen timer
    expect(screen.getByText("Write the spec")).toBeTruthy();
    expect(screen.getByText("remaining")).toBeTruthy();
  });
});

describe("FocusView — detail → edit → save / delete", () => {
  it("opens an entry, edits it, and saves via the update action", async () => {
    render(<FocusView entries={entries} />);
    fireEvent.click(screen.getByText("Ship onboarding").closest("button")!);
    fireEvent.click(screen.getByRole("button", { name: /Edit session/ }));
    fireEvent.click(screen.getByRole("button", { name: /Save changes/ }));
    await waitFor(() => expect(updateFocusSessionAction).toHaveBeenCalled());
    expect(updateFocusSessionAction.mock.calls[0][0]).toBe(1);
  });

  it("deletes from the edit sheet", async () => {
    render(<FocusView entries={entries} />);
    fireEvent.click(screen.getByText("Ship onboarding").closest("button")!);
    fireEvent.click(screen.getByRole("button", { name: /Edit session/ }));
    fireEvent.click(screen.getByRole("button", { name: "Delete session" }));
    await waitFor(() => expect(deleteFocusEntryAction).toHaveBeenCalledWith(1));
  });
});
